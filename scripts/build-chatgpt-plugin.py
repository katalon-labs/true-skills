#!/usr/bin/env python3
"""build-chatgpt-plugin.py - assemble and validate the ChatGPT plugin package.

The ChatGPT plugin directory accepts a ZIP that holds only plugin.json, mcp.json,
skills/** and assets/**. This repository also carries surfaces for other agents
(apps/, app-assets/, plugins/, dotfile adapters, lifecycle hooks) that OpenAI
refuses, so the package is assembled from an allowlist instead of zipping the
repository:

    chatgpt/plugin.json                  -> plugin.json (ChatGPT variant, extensions.com.openai)
    (generated)                          -> mcp.json (one server, /mcp/chatgpt)
    skills/<name>/                       -> skills/<name>/ (canonical, agent-neutral source)
    chatgpt/overlay/skills/<name>/**     -> skills/<name>/** (agents/openai.yaml per skill)
    chatgpt/references/chatgpt-tools.md  -> skills/<name>/references/chatgpt-tools.md
    chatgpt/assets/*                     -> assets/*

Output: dist/chatgpt/katalon-true-platform/ and dist/chatgpt/katalon-true-platform-<version>.zip.
The root plugin.json and mcp.json that other agents read are never touched.

Every limit from the OpenAI plugin submission rules is checked on the staged tree
and again on the ZIP. Any failure exits non-zero with one line per problem.

Usage:
    python3 scripts/build-chatgpt-plugin.py                  build and validate
    python3 scripts/build-chatgpt-plugin.py --for-submission  also refuse placeholder
                                                              screenshots and missing review fields
    python3 scripts/build-chatgpt-plugin.py --validate PATH   validate a staged directory or a ZIP,
                                                              build nothing

Exit codes: 0 valid, 1 validation failed, 2 usage error or missing source.
Standard library only; Python 3.9 or later.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import struct
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "chatgpt"
SKILLS_DIR = ROOT / "skills"
OUT_DIR = ROOT / "dist" / "chatgpt"
PACKAGE_NAME = "katalon-true-platform"

MCP_SERVER_KEY = "katalon"
MCP_URL = "https://platform.katalon.io/mcp/chatgpt"
MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json"

POINTER_LINE = (
    "In ChatGPT, read `references/chatgpt-tools.md` before any write step: "
    "changes run through Katalon cards that the user confirms."
)

# Limits from the OpenAI plugin submission rules (research/apps-sdk-reference.md,
# "Final submission limits", captured 2026-10-01).
MAX_NAME = 64
MAX_VERSION = 64
MAX_DISPLAY_NAME = 30
MAX_SHORT_DESCRIPTION = 30
MAX_DESCRIPTION = 4000
MAX_LONG_DESCRIPTION = 4000
MAX_DEVELOPER_NAME = 80
MAX_CAPABILITIES = 20
MAX_CAPABILITY_CHARS = 120
MAX_DEFAULT_PROMPTS = 3
MAX_PROMPT_CHARS = 128
MAX_SKILL_DESCRIPTION = 1024
MAX_SKILL_IDENTITY = 64
MAX_ENTRIES = 5000
MAX_SEGMENTS = 20
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MIN_IMAGE_PX = 48
MAX_IMAGE_PX = 4096
SCREENSHOT_WIDTH = 706
SCREENSHOT_MIN_HEIGHT = 400
SCREENSHOT_MAX_HEIGHT = 860
MAX_ZIP_BYTES = 100 * 1000 * 1000
MAX_EXTRACTED_BYTES = 512 * 1024 * 1024
MIN_BRAND_CONTRAST = 2.0
DARK_SURFACE = "#212121"
REVIEW_POSITIVE_CASES = 5
REVIEW_NEGATIVE_CASES = 3

CATEGORIES = {
    "Productivity", "Creativity", "Developer Tools", "Business & Operations",
    "Data & Analytics", "Communication", "Education & Research", "Security",
    "Finance", "Healthcare", "Travel", "Entertainment", "Other",
}
SKILL_PRODUCTS = {"CHAT", "CODEX"}
TOP_LEVEL_FILES = {"plugin.json", "mcp.json"}
TOP_LEVEL_DIRS = {"skills", "assets"}
FORBIDDEN_SEGMENTS = {"apps", "app-assets", "plugins", "hooks", "setup"}
FORBIDDEN_KEYS = ("test_credentials", "reviewer_instructions")
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
TEXT_SUFFIXES = {".md", ".json", ".yaml", ".yml", ".svg", ".txt"}
PLACEHOLDER_PNG_KEY = b"katalon:placeholder"
ICON_FIELDS = ("composerIcon", "composerIconDark", "logo", "logoDark")
URL_FIELDS = ("websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL")

SECRET_PATTERNS = [
    ("private key block", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("OpenAI-style secret key", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}")),
    ("GitHub token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}")),
    ("Slack token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}")),
    ("webhook signing secret", re.compile(r"\bwhsec_[A-Za-z0-9+/=]{16,}")),
    ("JSON web token", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")),
    ("Katalon plan token", re.compile(r"\bkpv1\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}")),
    (
        "hard-coded credential",
        re.compile(
            r"(?i)\b(api[_-]?key|apikey|client[_-]?secret|secret|password|passwd|access[_-]?token)"
            r"[\"']?\s*[:=]\s*[\"']([^\"'\s<>{}$]{12,})[\"']"
        ),
    ),
]
PROMO_PATTERN = re.compile(
    r"(?i)\b(the best|best-in-class|number one|#1|cheapest|free trial|upgrade now|pricing|discount|better than)\b"
)
MENTION_PATTERN = re.compile(r"(^|\s)@\w")
SEMVER_PATTERN = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$"
)
NAME_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")
SKILL_DIR_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
HEX_COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")


class Report:
    """Collects problems (fail the build) and warnings (printed only)."""

    def __init__(self) -> None:
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def fail(self, where: str, message: str) -> None:
        self.errors.append(f"{where}: {message}")

    def warn(self, where: str, message: str) -> None:
        self.warnings.append(f"{where}: {message}")


# Minimal YAML reader for agents/openai.yaml: nested block mappings, block lists
# of scalars or mappings, inline [a, b] lists, quoted or bare scalars. Anything
# outside that subset raises ValueError, which the validator reports.
def parse_yaml(text: str) -> Any:
    lines: List[Tuple[int, str]] = []
    for raw in text.splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        if raw[:indent].count("\t") or raw.lstrip(" ").startswith("\t"):
            raise ValueError("tabs are not allowed for indentation")
        lines.append((indent, stripped))
    if not lines:
        return None
    value, index = _yaml_block(lines, 0, lines[0][0])
    if index != len(lines):
        raise ValueError(f"unexpected indentation near '{lines[index][1]}'")
    return value


def _yaml_block(lines: List[Tuple[int, str]], index: int, indent: int) -> Tuple[Any, int]:
    if lines[index][1].startswith("- ") or lines[index][1] == "-":
        return _yaml_list(lines, index, indent)
    return _yaml_map(lines, index, indent)


def _yaml_map(lines: List[Tuple[int, str]], index: int, indent: int) -> Tuple[Dict[str, Any], int]:
    out: Dict[str, Any] = {}
    while index < len(lines) and lines[index][0] == indent and not lines[index][1].startswith("- "):
        key, sep, rest = lines[index][1].partition(":")
        if not sep or not key.strip():
            raise ValueError(f"expected 'key: value', got '{lines[index][1]}'")
        key = key.strip()
        rest = rest.strip()
        if key in out:
            raise ValueError(f"duplicate key '{key}'")
        index += 1
        if rest:
            out[key] = _yaml_scalar(rest)
        elif index < len(lines) and lines[index][0] > indent:
            out[key], index = _yaml_block(lines, index, lines[index][0])
        elif index < len(lines) and lines[index][0] == indent and lines[index][1].startswith("- "):
            out[key], index = _yaml_list(lines, index, indent)
        else:
            out[key] = None
    if index < len(lines) and lines[index][0] > indent:
        raise ValueError(f"unexpected indentation near '{lines[index][1]}'")
    return out, index


def _yaml_list(lines: List[Tuple[int, str]], index: int, indent: int) -> Tuple[List[Any], int]:
    out: List[Any] = []
    while index < len(lines) and lines[index][0] == indent and lines[index][1].startswith("- "):
        item = lines[index][1][2:].strip()
        if re.match(r"^[\w.-]+:(\s|$)", item):
            lines[index] = (indent + 2, item)
            value, index = _yaml_map(lines, index, indent + 2)
            out.append(value)
        else:
            out.append(_yaml_scalar(item))
            index += 1
    return out, index


def _yaml_scalar(text: str) -> Any:
    if text.startswith("[") and text.endswith("]"):
        inner = text[1:-1].strip()
        return [_yaml_scalar(part.strip()) for part in inner.split(",")] if inner else []
    if text.startswith('"'):
        return json.loads(text)
    if text.startswith("'") and text.endswith("'") and len(text) >= 2:
        return text[1:-1].replace("''", "'")
    if " #" in text:
        text = text.split(" #", 1)[0].rstrip()
    if text in ("true", "True"):
        return True
    if text in ("false", "False"):
        return False
    if text in ("null", "~"):
        return None
    if re.match(r"^-?\d+$", text):
        return int(text)
    return text


def parse_frontmatter(text: str) -> Optional[Dict[str, str]]:
    match = re.match(r"^---\n([\s\S]*?)\n---\n?", text)
    if not match:
        return None
    fields: Dict[str, str] = {}
    for line in match.group(1).split("\n"):
        pair = re.match(r"^(\w[\w-]*):\s*(.*)$", line)
        if pair:
            fields[pair.group(1)] = pair.group(2).strip()
    return fields


def relative_luminance(hex_color: str) -> float:
    channels = []
    for i in (1, 3, 5):
        c = int(hex_color[i:i + 2], 16) / 255.0
        channels.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = channels
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(a: str, b: str) -> float:
    la, lb = relative_luminance(a), relative_luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def png_info(data: bytes) -> Tuple[int, int, bool]:
    """Width, height and whether a katalon:placeholder text chunk is present."""
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise ValueError("not a PNG file")
    width, height = struct.unpack(">II", data[16:24])
    placeholder = False
    pos = 8
    while pos + 8 <= len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + length]
        if kind in (b"tEXt", b"iTXt", b"zTXt") and body.split(b"\x00", 1)[0] == PLACEHOLDER_PNG_KEY:
            placeholder = True
        if kind == b"IEND":
            break
        pos += 12 + length
    return width, height, placeholder


def jpeg_size(data: bytes) -> Tuple[int, int]:
    if data[:2] != b"\xff\xd8":
        raise ValueError("not a JPEG file")
    pos = 2
    while pos + 9 < len(data):
        if data[pos] != 0xFF:
            pos += 1
            continue
        marker = data[pos + 1]
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            pos += 2
            continue
        length = struct.unpack(">H", data[pos + 2:pos + 4])[0]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            height, width = struct.unpack(">HH", data[pos + 5:pos + 9])
            return width, height
        pos += 2 + length
    raise ValueError("JPEG has no frame header")


def webp_size(data: bytes) -> Tuple[int, int]:
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("not a WebP file")
    chunk = data[12:16]
    if chunk == b"VP8X":
        width = 1 + int.from_bytes(data[24:27], "little")
        height = 1 + int.from_bytes(data[27:30], "little")
        return width, height
    if chunk == b"VP8L":
        bits = int.from_bytes(data[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if chunk == b"VP8 ":
        width, height = struct.unpack("<HH", data[26:30])
        return width & 0x3FFF, height & 0x3FFF
    raise ValueError("unknown WebP chunk")


def raster_info(path: Path) -> Tuple[int, int, bool]:
    data = path.read_bytes()
    suffix = path.suffix.lower()
    if suffix == ".png":
        return png_info(data)
    if suffix in (".jpg", ".jpeg"):
        return (*jpeg_size(data), False)
    if suffix == ".webp":
        return (*webp_size(data), False)
    raise ValueError(f"unsupported raster type {suffix}")


def svg_viewbox(text: str) -> Tuple[Optional[Tuple[float, float, float, float]], Dict[str, str]]:
    root = re.search(r"<svg\b([^>]*)>", text, re.S)
    if not root:
        return None, {}
    attrs = dict(re.findall(r"([\w:-]+)\s*=\s*\"([^\"]*)\"", root.group(1)))
    box = attrs.get("viewBox")
    if box is None:
        return None, attrs
    parts = re.split(r"[\s,]+", box.strip())
    try:
        numbers = tuple(float(p) for p in parts)
    except ValueError:
        return None, attrs
    if len(numbers) != 4:
        return None, attrs
    return numbers, attrs  # type: ignore[return-value]


def is_https(value: Any) -> bool:
    return isinstance(value, str) and value.startswith("https://") and not re.search(r"[<>\s]", value)


def one_line(value: str) -> bool:
    return "\n" not in value and "\r" not in value


# ---- validation --------------------------------------------------------------
def validate_tree(stage: Path, submitted_versions: List[str], for_submission: bool) -> Report:
    report = Report()
    if not stage.is_dir():
        report.fail(str(stage), "package directory does not exist")
        return report

    entries = sorted(stage.rglob("*"))
    validate_layout(stage, entries, report)
    validate_contents(stage, entries, report)

    plugin = load_json(stage / "plugin.json", report)
    mcp = load_json(stage / "mcp.json", report)
    mcp_entry = validate_mcp(mcp, report) if isinstance(mcp, dict) else None
    plugin_name = PACKAGE_NAME
    if isinstance(plugin, dict):
        plugin_name = validate_plugin(stage, plugin, submitted_versions, for_submission, report) or PACKAGE_NAME
    validate_skills(stage, plugin_name, mcp_entry, report)
    return report


def validate_layout(stage: Path, entries: List[Path], report: Report) -> None:
    for name in sorted(TOP_LEVEL_FILES):
        if not (stage / name).is_file():
            report.fail(name, "missing; the package needs plugin.json and mcp.json at its root")
    for name in sorted(TOP_LEVEL_DIRS):
        if not (stage / name).is_dir():
            report.fail(f"{name}/", "missing; the package needs skills/ and assets/ at its root")
    for child in sorted(stage.iterdir()):
        allowed = (child.name in TOP_LEVEL_FILES and child.is_file()) or (
            child.name in TOP_LEVEL_DIRS and child.is_dir()
        )
        if not allowed:
            report.fail(child.name, "not allowed at the package root; only plugin.json, mcp.json, skills/ and assets/ may be packaged")

    if len(entries) > MAX_ENTRIES:
        report.fail(".", f"{len(entries)} entries, over the {MAX_ENTRIES} limit")
    for path in entries:
        rel = path.relative_to(stage)
        parts = rel.parts
        where = rel.as_posix()
        if len(parts) > MAX_SEGMENTS:
            report.fail(where, f"{len(parts)} path segments, over the {MAX_SEGMENTS} limit")
        if path.is_symlink():
            report.fail(where, "symbolic links are not allowed")
        for part in parts:
            if part.startswith("."):
                report.fail(where, f"dotfile or dot directory '{part}' is not allowed")
                break
        for part in parts[:-1] if path.is_file() else parts:
            if part in FORBIDDEN_SEGMENTS:
                report.fail(where, f"'{part}/' is not allowed; OpenAI refuses apps, app assets, agent plugin folders, hooks and setup scripts")
                break
        lower = path.name.lower()
        if path.is_file():
            if lower.endswith(".app.json") or lower == "app.json":
                report.fail(where, "app manifests (.app.json) cannot be submitted")
            if lower.endswith(".sh"):
                report.fail(where, "shell scripts and lifecycle hooks cannot be submitted")
            if lower in ("hooks.json",):
                report.fail(where, "lifecycle hooks cannot be submitted")


def validate_contents(stage: Path, entries: List[Path], report: Report) -> None:
    for path in entries:
        if not path.is_file() or path.is_symlink():
            continue
        where = path.relative_to(stage).as_posix()
        data = path.read_bytes()
        if b"claude" in data.lower() or "claude" in where.lower():
            report.fail(where, "contains 'claude'; packaged files must use provider-neutral wording")
        for key in FORBIDDEN_KEYS:
            if key.encode() in data:
                report.fail(where, f"contains '{key}'; reviewer access goes in the dashboard Review details form only")
        if path.suffix.lower() in TEXT_SUFFIXES:
            try:
                text = data.decode("utf-8")
            except UnicodeDecodeError:
                report.fail(where, "is not valid UTF-8 text")
                continue
            for label, pattern in SECRET_PATTERNS:
                if pattern.search(text):
                    report.fail(where, f"looks like it contains a secret ({label})")


def load_json(path: Path, report: Report) -> Any:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        report.fail(path.name, f"is not valid JSON ({exc})")
        return None


def validate_mcp(mcp: Dict[str, Any], report: Report) -> Optional[Tuple[str, str]]:
    servers = mcp.get("mcpServers")
    if not isinstance(servers, dict) or len(servers) != 1:
        report.fail("mcp.json", "must declare exactly one server under mcpServers")
        return None
    key, entry = next(iter(servers.items()))
    if not isinstance(entry, dict):
        report.fail("mcp.json", f"server '{key}' must be an object")
        return None
    if entry.get("type") != "streamable-http":
        report.fail("mcp.json", f"server '{key}' type must be 'streamable-http', got {entry.get('type')!r}")
    url = entry.get("url")
    if not is_https(url):
        report.fail("mcp.json", f"server '{key}' url must be an https:// URL, got {url!r}")
    return key, str(url)


def validate_plugin(
    stage: Path, plugin: Dict[str, Any], submitted_versions: List[str], for_submission: bool, report: Report
) -> Optional[str]:
    where = "plugin.json"
    name = plugin.get("name")
    if not isinstance(name, str) or not NAME_PATTERN.match(name) or len(name) > MAX_NAME:
        report.fail(where, f"name must be 1 to {MAX_NAME} ASCII letters, digits, '_' or '-', got {name!r}")
        name = None
    version = plugin.get("version")
    if not isinstance(version, str) or not SEMVER_PATTERN.match(version) or len(version) > MAX_VERSION:
        report.fail(where, f"version must be semver of at most {MAX_VERSION} chars, got {version!r}")
    elif version in submitted_versions:
        report.fail(where, f"version {version} was already submitted; bump the version for a new ZIP")
    description = plugin.get("description")
    if not isinstance(description, str) or not description.strip():
        report.fail(where, "description is required")
    elif len(description) > MAX_DESCRIPTION:
        report.fail(where, f"description is {len(description)} chars, over {MAX_DESCRIPTION}")
    for field in ("homepage", "repository"):
        if field in plugin and not is_https(plugin[field]):
            report.fail(where, f"{field} must be an https:// URL, got {plugin[field]!r}")
    author = plugin.get("author")
    if isinstance(author, dict) and "url" in author and not is_https(author["url"]):
        report.fail(where, f"author.url must be an https:// URL, got {author['url']!r}")
    for key in ("hooks", "apps"):
        if key in plugin:
            report.fail(where, f"top-level '{key}' is not allowed in a ChatGPT plugin")

    openai = (plugin.get("extensions") or {}).get("com.openai")
    if not isinstance(openai, dict):
        report.fail(where, "extensions.com.openai is missing")
        return name
    for key in ("hooks", "apps"):
        if key in openai:
            report.fail(where, f"extensions.com.openai.{key} is not allowed")
    interface = openai.get("interface")
    if not isinstance(interface, dict):
        report.fail(where, "extensions.com.openai.interface is missing")
        return name

    validate_interface(stage, interface, for_submission, report)

    onboarding = openai.get("onboardingSkill")
    if onboarding is not None:
        match = re.match(r"^\./skills/([^/]+)/SKILL\.md$", str(onboarding))
        if not match:
            report.fail(where, f"onboardingSkill must be ./skills/<name>/SKILL.md, got {onboarding!r}")
        elif not (stage / "skills" / match.group(1) / "SKILL.md").is_file():
            report.fail(where, f"onboardingSkill {onboarding} is not in the package")

    validate_review(openai.get("review"), for_submission, report)
    publication = openai.get("publication")
    if for_submission and not (isinstance(publication, dict) and publication.get("countries")):
        report.fail(where, "publication.countries is required for submission")
    return name


def validate_interface(stage: Path, interface: Dict[str, Any], for_submission: bool, report: Report) -> None:
    where = "plugin.json interface"

    def text_field(field: str, limit: int, required: bool = True) -> Optional[str]:
        value = interface.get(field)
        if value is None:
            if required:
                report.fail(where, f"{field} is required")
            return None
        if not isinstance(value, str) or not value.strip():
            report.fail(where, f"{field} must be a non-empty string")
            return None
        if len(value) > limit:
            report.fail(where, f"{field} is {len(value)} chars, over {limit}")
        return value

    display = text_field("displayName", MAX_DISPLAY_NAME)
    if display is not None:
        if not one_line(display):
            report.fail(where, "displayName must be one line")
        if re.search(r"(?i)(\bmcp|\bmcp server|\bplugin)\s*$", display):
            report.fail(where, "displayName must not end in 'MCP', 'MCP Server' or 'Plugin'")
    short = text_field("shortDescription", MAX_SHORT_DESCRIPTION)
    if short is not None and not one_line(short):
        report.fail(where, "shortDescription must be one line")
    long_description = text_field("longDescription", MAX_LONG_DESCRIPTION, required=False)
    text_field("developerName", MAX_DEVELOPER_NAME)
    for field, value in (("displayName", display), ("shortDescription", short), ("longDescription", long_description)):
        if value and PROMO_PATTERN.search(value):
            report.fail(where, f"{field} has promotional or pricing copy ('{PROMO_PATTERN.search(value).group(0)}')")

    category = interface.get("category")
    if category not in CATEGORIES:
        report.fail(where, f"category {category!r} is not one of the allowed categories")

    capabilities = interface.get("capabilities")
    if not isinstance(capabilities, list):
        report.fail(where, "capabilities must be a list")
    else:
        if len(capabilities) > MAX_CAPABILITIES:
            report.fail(where, f"{len(capabilities)} capabilities, over {MAX_CAPABILITIES}")
        for cap in capabilities:
            if not isinstance(cap, str) or not cap.strip():
                report.fail(where, f"capability {cap!r} must be a non-empty string")
            elif len(cap) > MAX_CAPABILITY_CHARS:
                report.fail(where, f"capability '{cap[:40]}...' is {len(cap)} chars, over {MAX_CAPABILITY_CHARS}")

    for field in URL_FIELDS:
        value = interface.get(field)
        if value is None:
            if for_submission or field in ("privacyPolicyURL", "termsOfServiceURL"):
                report.fail(where, f"{field} is required")
        elif not is_https(value):
            report.fail(where, f"{field} must be an https:// URL, got {value!r}")

    prompts = interface.get("defaultPrompt", [])
    if not isinstance(prompts, list):
        report.fail(where, "defaultPrompt must be a list")
        prompts = []
    if len(prompts) > MAX_DEFAULT_PROMPTS:
        report.fail(where, f"{len(prompts)} default prompts, over {MAX_DEFAULT_PROMPTS}")
    if len(set(map(str, prompts))) != len(prompts):
        report.fail(where, "defaultPrompt entries must be unique")
    for prompt in prompts:
        if not isinstance(prompt, str) or not prompt.strip():
            report.fail(where, f"default prompt {prompt!r} must be a non-empty string")
            continue
        if len(prompt) > MAX_PROMPT_CHARS:
            report.fail(where, f"default prompt is {len(prompt)} chars, over {MAX_PROMPT_CHARS}")
        if not one_line(prompt):
            report.fail(where, "default prompts must be one line")
        if MENTION_PATTERN.search(prompt):
            report.fail(where, f"default prompt '{prompt}' must not contain an @mention")

    light = interface.get("brandColor")
    if light is not None:
        if not isinstance(light, str) or not HEX_COLOR.match(light):
            report.fail(where, f"brandColor must be six-digit hex, got {light!r}")
        elif contrast_ratio(light, "#FFFFFF") < MIN_BRAND_CONTRAST:
            report.fail(where, f"brandColor {light} has {contrast_ratio(light, '#FFFFFF'):.2f}:1 contrast vs white, under {MIN_BRAND_CONTRAST}:1")
    dark = interface.get("brandColorDark")
    if dark is not None:
        if not isinstance(dark, str) or not HEX_COLOR.match(dark):
            report.fail(where, f"brandColorDark must be six-digit hex, got {dark!r}")
        elif contrast_ratio(dark, DARK_SURFACE) < MIN_BRAND_CONTRAST:
            report.fail(where, f"brandColorDark {dark} has {contrast_ratio(dark, DARK_SURFACE):.2f}:1 contrast vs {DARK_SURFACE}, under {MIN_BRAND_CONTRAST}:1")

    referenced = set()
    for field in ICON_FIELDS:
        value = interface.get(field)
        if value is None:
            if field in ("composerIcon", "logo"):
                report.fail(where, f"{field} is required")
            continue
        path = resolve_asset(stage, field, value, report)
        if path is not None:
            referenced.add(path)
            validate_image(stage, path, report, screenshot=False)

    screenshots = interface.get("screenshots", [])
    if not isinstance(screenshots, list):
        report.fail(where, "screenshots must be a list")
        screenshots = []
    if screenshots and len(screenshots) != len(prompts):
        report.fail(where, f"{len(screenshots)} screenshots for {len(prompts)} default prompts; OpenAI expects one per starter prompt")
    for value in screenshots:
        path = resolve_asset(stage, "screenshots", value, report)
        if path is None:
            continue
        referenced.add(path)
        placeholder = validate_image(stage, path, report, screenshot=True)
        rel = path.relative_to(stage).as_posix()
        if placeholder and for_submission:
            report.fail(rel, "is a placeholder screenshot; replace it with the bar-passed widget capture")
        elif placeholder:
            report.warn(rel, "placeholder screenshot; --for-submission refuses it")

    assets = stage / "assets"
    if assets.is_dir():
        for path in sorted(assets.rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(stage).as_posix()
            if path.suffix.lower() not in IMAGE_SUFFIXES:
                report.fail(rel, "only PNG, JPEG, WebP and SVG files may sit under assets/")
            elif path not in referenced:
                validate_image(stage, path, report, screenshot=False)


def resolve_asset(stage: Path, field: str, value: Any, report: Report) -> Optional[Path]:
    if not isinstance(value, str) or not value.startswith("./assets/"):
        report.fail("plugin.json interface", f"{field} must be a ./assets/ path, got {value!r}")
        return None
    path = (stage / value[2:]).resolve()
    if stage.resolve() not in path.parents or not path.is_file():
        report.fail("plugin.json interface", f"{field} {value} is not in the package")
        return None
    return stage / value[2:]


def validate_image(stage: Path, path: Path, report: Report, screenshot: bool) -> bool:
    rel = path.relative_to(stage).as_posix()
    size = path.stat().st_size
    if size > MAX_IMAGE_BYTES:
        report.fail(rel, f"is {size} bytes, over the 5 MiB image limit")
    suffix = path.suffix.lower()
    if suffix == ".svg":
        if screenshot:
            report.fail(rel, "screenshots must be PNG, JPEG or WebP")
            return False
        text = path.read_text(encoding="utf-8", errors="replace")
        box, attrs = svg_viewbox(text)
        if box is None:
            report.fail(rel, "SVG needs a numeric viewBox")
        else:
            width, height = box[2], box[3]
            if width != height:
                report.fail(rel, f"SVG viewBox must be square, got {width:g} x {height:g}")
            elif not MIN_IMAGE_PX <= width <= MAX_IMAGE_PX:
                report.fail(rel, f"SVG viewBox is {width:g} units, outside {MIN_IMAGE_PX} to {MAX_IMAGE_PX}")
        for dim in ("width", "height"):
            if dim in attrs and not re.match(r"^\d+(\.\d+)?(px)?$", attrs[dim]):
                report.fail(rel, f"SVG {dim} '{attrs[dim]}' must be a plain number")
        if "width" in attrs and "height" in attrs and attrs["width"] != attrs["height"]:
            report.fail(rel, "SVG width and height must be equal")
        if re.search(r"<script\b", text, re.I) or re.search(r"(?:xlink:)?href\s*=\s*\"(?:https?:)?//", text, re.I):
            report.fail(rel, "SVG must not contain scripts or external references")
        return False
    try:
        width, height, placeholder = raster_info(path)
    except ValueError as exc:
        report.fail(rel, f"cannot read image ({exc})")
        return False
    if screenshot:
        if width != SCREENSHOT_WIDTH or not SCREENSHOT_MIN_HEIGHT <= height <= SCREENSHOT_MAX_HEIGHT:
            report.fail(rel, f"screenshot is {width} x {height}; it must be exactly {SCREENSHOT_WIDTH} px wide and {SCREENSHOT_MIN_HEIGHT} to {SCREENSHOT_MAX_HEIGHT} px tall")
    else:
        if width != height:
            report.fail(rel, f"image must be square, got {width} x {height}")
        elif not MIN_IMAGE_PX <= width <= MAX_IMAGE_PX:
            report.fail(rel, f"image is {width} px, outside {MIN_IMAGE_PX} to {MAX_IMAGE_PX}")
    return placeholder


def validate_review(review: Any, for_submission: bool, report: Report) -> None:
    where = "plugin.json review"
    if review is None:
        if for_submission:
            report.fail(where, "extensions.com.openai.review is required for submission")
        return
    if not isinstance(review, dict):
        report.fail(where, "must be an object")
        return
    cases = review.get("test_cases")
    if cases is not None:
        positive = cases.get("positive", []) if isinstance(cases, dict) else []
        negative = cases.get("negative", []) if isinstance(cases, dict) else []
        if len(positive) != REVIEW_POSITIVE_CASES or len(negative) != REVIEW_NEGATIVE_CASES:
            report.fail(where, f"needs exactly {REVIEW_POSITIVE_CASES} positive and {REVIEW_NEGATIVE_CASES} negative test cases, got {len(positive)} and {len(negative)}")
        for i, case in enumerate(positive, 1):
            for field in ("description", "prompt", "tools_triggered", "expected_behavior"):
                if not isinstance(case, dict) or not case.get(field):
                    report.fail(where, f"positive case {i} is missing {field}")
            url = case.get("expected_output_url") if isinstance(case, dict) else None
            if url is None and for_submission:
                report.fail(where, f"positive case {i} needs expected_output_url for submission")
            elif url is not None and not is_https(url):
                report.fail(where, f"positive case {i} expected_output_url must be https://, got {url!r}")
            for attachment in (case.get("file_attachment_urls") or []) if isinstance(case, dict) else []:
                if not is_https(attachment):
                    report.fail(where, f"positive case {i} attachment URL must be https://, got {attachment!r}")
        for i, case in enumerate(negative, 1):
            for field in ("description", "prompt"):
                if not isinstance(case, dict) or not case.get(field):
                    report.fail(where, f"negative case {i} is missing {field}")
    elif for_submission:
        report.fail(where, "test_cases are required for submission")
    demo = review.get("demo_recording_url")
    if demo is None and for_submission:
        report.fail(where, "demo_recording_url is required for submission")
    elif demo is not None and not is_https(demo):
        report.fail(where, f"demo_recording_url must be an https:// URL, got {demo!r}")
    if "commerce" in review and not isinstance(review["commerce"], bool):
        report.fail(where, "commerce must be true or false")


def validate_skills(stage: Path, plugin_name: str, mcp_entry: Optional[Tuple[str, str]], report: Report) -> None:
    skills = stage / "skills"
    if not skills.is_dir():
        return
    for skill_md in sorted(skills.rglob("SKILL.md")):
        rel = skill_md.relative_to(stage)
        if len(rel.parts) != 3:
            report.fail(rel.as_posix(), "skill directories must be direct children of skills/")
    for child in sorted(skills.iterdir()):
        where = child.relative_to(stage).as_posix()
        if not child.is_dir():
            report.fail(where, "only skill directories may sit directly under skills/")
            continue
        if not SKILL_DIR_PATTERN.match(child.name):
            report.fail(where, "skill directory names must be kebab-case")
        identity = f"{plugin_name}:{child.name}"
        if len(identity) > MAX_SKILL_IDENTITY:
            report.fail(where, f"skill identity '{identity}' is {len(identity)} chars, over {MAX_SKILL_IDENTITY}")
        skill_md = child / "SKILL.md"
        if not skill_md.is_file():
            report.fail(where, "missing SKILL.md")
        else:
            fields = parse_frontmatter(skill_md.read_text(encoding="utf-8"))
            if fields is None:
                report.fail(f"{where}/SKILL.md", "has no YAML frontmatter")
            else:
                if fields.get("name") != child.name:
                    report.fail(f"{where}/SKILL.md", f"frontmatter name {fields.get('name')!r} does not match the directory")
                description = fields.get("description", "")
                if not description:
                    report.fail(f"{where}/SKILL.md", "frontmatter description is required")
                elif len(description) > MAX_SKILL_DESCRIPTION:
                    report.fail(f"{where}/SKILL.md", f"description is {len(description)} chars, over {MAX_SKILL_DESCRIPTION}")
        validate_skill_yaml(stage, child, mcp_entry, report)


def validate_skill_yaml(stage: Path, skill: Path, mcp_entry: Optional[Tuple[str, str]], report: Report) -> None:
    path = skill / "agents" / "openai.yaml"
    where = path.relative_to(stage).as_posix()
    if not path.is_file():
        report.fail(where, "missing; every skill needs agents/openai.yaml with policy.products")
        return
    try:
        data = parse_yaml(path.read_text(encoding="utf-8"))
    except ValueError as exc:
        report.fail(where, f"cannot parse ({exc})")
        return
    if not isinstance(data, dict):
        report.fail(where, "must be a mapping")
        return
    interface = data.get("interface") or {}
    if not isinstance(interface, dict) or not interface.get("display_name"):
        report.fail(where, "interface.display_name is required")
    else:
        color = interface.get("brand_color")
        if color is not None and not (isinstance(color, str) and HEX_COLOR.match(color)):
            report.fail(where, f"interface.brand_color must be six-digit hex, got {color!r}")
        prompt = interface.get("default_prompt")
        if prompt is not None:
            if not isinstance(prompt, str) or len(prompt) > MAX_PROMPT_CHARS or not one_line(prompt):
                report.fail(where, f"interface.default_prompt must be one line of at most {MAX_PROMPT_CHARS} chars")
            elif MENTION_PATTERN.search(prompt):
                report.fail(where, "interface.default_prompt must not contain an @mention")
    policy = data.get("policy") or {}
    products = policy.get("products") if isinstance(policy, dict) else None
    if not isinstance(products, list) or not products:
        report.fail(where, "policy.products must list CHAT and/or CODEX")
    else:
        unknown = [p for p in products if p not in SKILL_PRODUCTS]
        if unknown:
            report.fail(where, f"policy.products has unknown values {unknown}; allowed are CHAT and CODEX")
        if len(set(products)) != len(products):
            report.fail(where, "policy.products has duplicates")
    tools = ((data.get("dependencies") or {}).get("tools") or []) if isinstance(data.get("dependencies"), dict) else []
    for tool in tools:
        if not isinstance(tool, dict) or tool.get("type") != "mcp":
            continue
        url = tool.get("url")
        if url is not None and not is_https(url):
            report.fail(where, f"MCP dependency url must be https://, got {url!r}")
        if mcp_entry is not None:
            key, mcp_url = mcp_entry
            if tool.get("value") != key:
                report.fail(where, f"MCP dependency value {tool.get('value')!r} does not match the mcp.json server '{key}'")
            if url is not None and url != mcp_url:
                report.fail(where, f"MCP dependency url {url} does not match mcp.json {mcp_url}")


# ---- build -------------------------------------------------------------------
def ignore_os_junk(_dir: str, names: List[str]) -> List[str]:
    return [n for n in names if n in (".DS_Store", "Thumbs.db")]


def stage_package(stage: Path) -> List[str]:
    """Assemble the allowlisted package into `stage`. Returns source problems."""
    problems: List[str] = []
    manifest = SOURCE_DIR / "plugin.json"
    if not manifest.is_file():
        return [f"{manifest.relative_to(ROOT)} is missing"]
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir(parents=True)

    shutil.copyfile(manifest, stage / "plugin.json")
    mcp = {"$schema": MCP_SCHEMA, "mcpServers": {MCP_SERVER_KEY: {"type": "streamable-http", "url": MCP_URL}}}
    (stage / "mcp.json").write_text(json.dumps(mcp, indent=2) + "\n", encoding="utf-8")

    tools_ref = SOURCE_DIR / "references" / "chatgpt-tools.md"
    overlay = SOURCE_DIR / "overlay" / "skills"
    names = sorted(p.name for p in SKILLS_DIR.iterdir() if p.is_dir())
    for name in names:
        target = stage / "skills" / name
        shutil.copytree(SKILLS_DIR / name, target, ignore=ignore_os_junk)
        if (overlay / name).is_dir():
            shutil.copytree(overlay / name, target, ignore=ignore_os_junk, dirs_exist_ok=True)
        generated = target / "references" / "chatgpt-tools.md"
        if generated.exists():
            problems.append(f"skills/{name}/references/chatgpt-tools.md exists in the source; the build generates it")
            continue
        generated.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(tools_ref, generated)
        skill_md = target / "SKILL.md"
        if skill_md.is_file():
            body = skill_md.read_text(encoding="utf-8").rstrip("\n")
            skill_md.write_text(f"{body}\n\n{POINTER_LINE}\n", encoding="utf-8")
    if overlay.is_dir():
        for extra in sorted(set(p.name for p in overlay.iterdir() if p.is_dir()) - set(names)):
            problems.append(f"chatgpt/overlay/skills/{extra} has no matching skills/{extra}")

    shutil.copytree(SOURCE_DIR / "assets", stage / "assets", ignore=ignore_os_junk)
    return problems


def write_zip(stage: Path, zip_path: Path) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(p for p in stage.rglob("*") if p.is_file()):
            info = zipfile.ZipInfo(path.relative_to(stage).as_posix(), date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())


def validate_zip(zip_path: Path, submitted_versions: List[str], for_submission: bool) -> Report:
    report = Report()
    size = zip_path.stat().st_size
    if size > MAX_ZIP_BYTES:
        report.fail(zip_path.name, f"is {size} bytes compressed, over 100 MB")
    with zipfile.ZipFile(zip_path) as archive:
        infos = archive.infolist()
        if len(infos) > MAX_ENTRIES:
            report.fail(zip_path.name, f"{len(infos)} entries, over {MAX_ENTRIES}")
        extracted = sum(i.file_size for i in infos)
        if extracted > MAX_EXTRACTED_BYTES:
            report.fail(zip_path.name, f"extracts to {extracted} bytes, over 512 MiB")
        for info in infos:
            name = PurePosixPath(info.filename)
            if name.is_absolute() or ".." in name.parts:
                report.fail(info.filename, "unsafe path in ZIP")
                return report
            top = name.parts[0] if name.parts else ""
            if not (info.filename in TOP_LEVEL_FILES or top in TOP_LEVEL_DIRS):
                report.fail(info.filename, "ZIP entries must be plugin.json, mcp.json, skills/** or assets/**")
        with tempfile.TemporaryDirectory() as tmp:
            archive.extractall(tmp)
            inner = validate_tree(Path(tmp), submitted_versions, for_submission)
    report.errors.extend(inner.errors)
    report.warnings.extend(inner.warnings)
    return report


def load_submitted_versions(path: Path) -> List[str]:
    if not path.is_file():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    versions = data.get("versions", []) if isinstance(data, dict) else data
    return [str(v) for v in versions]


def print_report(report: Report) -> None:
    for warning in report.warnings:
        print(f"warning: {warning}", file=sys.stderr)
    if report.errors:
        print(f"build-chatgpt-plugin: {len(report.errors)} problem(s) found:", file=sys.stderr)
        for error in report.errors:
            print(f"  - {error}", file=sys.stderr)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Assemble and validate the ChatGPT plugin package.")
    parser.add_argument("--validate", metavar="PATH", help="validate a staged package directory or ZIP and build nothing")
    parser.add_argument("--for-submission", action="store_true", help="also refuse placeholder screenshots and missing review fields")
    parser.add_argument("--submitted-versions", metavar="FILE", default=str(SOURCE_DIR / "submitted-versions.json"),
                        help="JSON list (or {versions: [...]}) of versions already submitted")
    parser.add_argument("--out", metavar="DIR", default=str(OUT_DIR), help="output directory (default dist/chatgpt)")
    args = parser.parse_args(argv)

    try:
        submitted = load_submitted_versions(Path(args.submitted_versions))
    except ValueError as exc:
        print(f"build-chatgpt-plugin: cannot read {args.submitted_versions} ({exc})", file=sys.stderr)
        return 2

    if args.validate:
        target = Path(args.validate)
        if not target.exists():
            print(f"build-chatgpt-plugin: {target} does not exist", file=sys.stderr)
            return 2
        if target.is_file() and target.suffix == ".zip":
            report = validate_zip(target, submitted, args.for_submission)
        else:
            report = validate_tree(target, submitted, args.for_submission)
        print_report(report)
        if report.errors:
            return 1
        print(f"OK: {target} is a valid ChatGPT plugin package")
        return 0

    out = Path(args.out)
    stage = out / PACKAGE_NAME
    problems = stage_package(stage)
    if problems:
        print("build-chatgpt-plugin: source problems:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1
    report = validate_tree(stage, submitted, args.for_submission)
    if report.errors:
        print_report(report)
        return 1
    version = json.loads((stage / "plugin.json").read_text(encoding="utf-8"))["version"]
    zip_path = out / f"{PACKAGE_NAME}-{version}.zip"
    write_zip(stage, zip_path)
    zip_report = validate_zip(zip_path, submitted, args.for_submission)
    zip_report.warnings = [w for w in zip_report.warnings if w not in report.warnings]
    report.errors.extend(zip_report.errors)
    report.warnings.extend(zip_report.warnings)
    print_report(report)
    if report.errors:
        return 1
    skills = sorted(p.name for p in (stage / "skills").iterdir() if p.is_dir())
    files = sum(1 for p in stage.rglob("*") if p.is_file())
    print(f"OK: {stage.relative_to(ROOT) if ROOT in stage.parents else stage} ({len(skills)} skills, {files} files)")
    print(f"OK: {zip_path.relative_to(ROOT) if ROOT in zip_path.parents else zip_path} ({zip_path.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
