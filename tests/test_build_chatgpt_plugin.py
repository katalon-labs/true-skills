"""Fixture tests for scripts/build-chatgpt-plugin.py (spec AC-57, AC-58, AC-66).

Each bad fixture is the real staged package with exactly one forbidden item
added, so a failure can only come from that item. The script runs as a
subprocess, which checks the exit code a CI job or a person would see.

Run with either:
    python3 -m unittest discover -s tests
    python3 -m pytest tests
No network access and no third-party packages.
"""

from __future__ import annotations

import importlib.util
import json
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest
import zipfile
import zlib
from pathlib import Path
from typing import Callable, Dict, Tuple

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "build-chatgpt-plugin.py"

_spec = importlib.util.spec_from_file_location("build_chatgpt_plugin", SCRIPT)
build = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(build)


def make_png(width: int, height: int, placeholder: bool = False) -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    rows = b"".join(b"\x00" + b"\xff\xff\xff" * width for _ in range(height))
    out = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    if placeholder:
        out += chunk(b"tEXt", b"katalon:placeholder\x00true")
    return out + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b"")


def run_script(*args: str) -> Tuple[int, str]:
    proc = subprocess.run([sys.executable, str(SCRIPT), *args], capture_output=True, text=True, timeout=120)
    return proc.returncode, proc.stdout + proc.stderr


def edit_json(path: Path, change: Callable[[dict], None]) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    change(data)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def interface(data: dict) -> dict:
    return data["extensions"]["com.openai"]["interface"]


def set_skill_description(pkg: Path, skill: str, description: str) -> None:
    path = pkg / "skills" / skill / "SKILL.md"
    text = path.read_text(encoding="utf-8")
    path.write_text(re.sub(r"(?m)^description: .*$", "description: " + description, text, count=1), encoding="utf-8")


def add_skill(pkg: Path, name: str) -> Path:
    skill = pkg / "skills" / name
    shutil.copytree(pkg / "skills" / "test-plan", skill)
    path = skill / "SKILL.md"
    path.write_text(re.sub(r"(?m)^name: .*$", "name: " + name, path.read_text(encoding="utf-8"), count=1), encoding="utf-8")
    return skill


def write(pkg: Path, rel: str, content: str = "x") -> None:
    path = pkg / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


# One fixture per forbidden item: name -> (mutation, text the error must contain).
BAD_FIXTURES: Dict[str, Tuple[Callable[[Path], None], str]] = {
    "apps_dir": (lambda p: write(p, "apps/katalon-testing-skills/README.md"), "not allowed at the package root"),
    "app_assets_dir": (lambda p: write(p, "app-assets/katalon-testing-skills/icon.svg", "<svg/>"), "not allowed at the package root"),
    "plugins_dir": (lambda p: write(p, "plugins/katalon-true-platform/plugin.json", "{}"), "not allowed at the package root"),
    "hooks_dir": (lambda p: write(p, "hooks/hooks.json", "{}"), "not allowed at the package root"),
    "nested_apps_dir": (lambda p: write(p, "skills/test-plan/apps/notes.md"), "'apps/' is not allowed"),
    "setup_dir_in_skill": (lambda p: write(p, "skills/test-plan/setup/notes.md"), "'setup/' is not allowed"),
    "app_json_manifest": (lambda p: write(p, "skills/test-plan/katalon.app.json", "{}"), "app manifests (.app.json)"),
    "shell_script": (lambda p: write(p, "skills/test-plan/references/install.sh", "echo hi"), "shell scripts and lifecycle hooks"),
    "dotfile": (lambda p: write(p, "skills/test-plan/.env", "A=1"), "dotfile or dot directory"),
    "extra_root_file": (lambda p: write(p, "README.md", "# readme"), "not allowed at the package root"),
    "too_many_entries": (
        lambda p: [write(p, f"skills/test-plan/references/bulk/n{i}.md") for i in range(build.MAX_ENTRIES + 1)],
        "entries, over the 5000 limit",
    ),
    "too_many_segments": (
        lambda p: write(p, "skills/test-plan/references/" + "/".join(f"d{i}" for i in range(18)) + "/deep.md"),
        "path segments, over the 20 limit",
    ),
    "skill_description_too_long": (lambda p: set_skill_description(p, "test-plan", "Plans testing. " * 80), "over 1024"),
    "skill_identity_too_long": (lambda p: add_skill(p, "a" * 50), "skill identity"),
    "nested_skill": (lambda p: write(p, "skills/test-plan/inner/SKILL.md", "---\nname: inner\ndescription: x\n---\n"), "direct children of skills/"),
    "skill_name_mismatch": (lambda p: write(p, "skills/test-plan/SKILL.md", "---\nname: other\ndescription: " + "y" * 60 + "\n---\n"), "does not match the directory"),
    "file_mentions_claude": (lambda p: write(p, "skills/test-plan/references/notes.md", "Works in Claude Code too."), "contains 'claude'"),
    "svg_without_viewbox": (
        lambda p: shutil.copyfile(ROOT / "assets" / "katalon-logo.svg", p / "assets" / "logo.svg"),
        "SVG needs a numeric viewBox",
    ),
    "svg_not_square": (
        lambda p: write(p, "assets/logo.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><rect width="100" height="60"/></svg>'),
        "viewBox must be square",
    ),
    "svg_too_small": (
        lambda p: write(p, "assets/composer-icon.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20"/></svg>'),
        "outside 48 to 4096",
    ),
    "svg_external_reference": (
        lambda p: write(p, "assets/logo.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image href="https://example.com/x.png"/></svg>'),
        "scripts or external references",
    ),
    "raster_not_square": (lambda p: (p / "assets" / "logo.png").write_bytes(make_png(512, 500)), "image must be square"),
    "raster_too_small": (lambda p: (p / "assets" / "composer-icon.png").write_bytes(make_png(32, 32)), "outside 48 to 4096"),
    "raster_too_large": (lambda p: (p / "assets" / "logo.png").write_bytes(make_png(4100, 4100)), "outside 48 to 4096"),
    "non_image_asset": (lambda p: write(p, "assets/notes.txt", "hello"), "only PNG, JPEG, WebP and SVG"),
    "screenshot_wrong_width": (lambda p: (p / "assets" / "screenshot-coverage.png").write_bytes(make_png(700, 560)), "exactly 706 px wide"),
    "screenshot_too_tall": (lambda p: (p / "assets" / "screenshot-triage.png").write_bytes(make_png(706, 900)), "400 to 860 px tall"),
    "screenshot_count": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d)["screenshots"].pop()),
        "one per starter prompt",
    ),
    "version_already_submitted": (lambda p: None, "was already submitted"),
    "test_credentials_key": (
        lambda p: edit_json(p / "plugin.json", lambda d: d["extensions"]["com.openai"]["review"].update(test_credentials={"user": "x"})),
        "contains 'test_credentials'",
    ),
    "reviewer_instructions_key": (
        lambda p: edit_json(p / "plugin.json", lambda d: d["extensions"]["com.openai"]["review"].update(reviewer_instructions="log in")),
        "contains 'reviewer_instructions'",
    ),
    "hooks_key": (lambda p: edit_json(p / "plugin.json", lambda d: d.update(hooks={"onInstall": "x"})), "top-level 'hooks' is not allowed"),
    "name_too_long": (lambda p: edit_json(p / "plugin.json", lambda d: d.update(name="k" * 65)), "name must be 1 to 64"),
    "bad_version": (lambda p: edit_json(p / "plugin.json", lambda d: d.update(version="1.0")), "version must be semver"),
    "description_too_long": (lambda p: edit_json(p / "plugin.json", lambda d: d.update(description="x" * 4001)), "description is 4001 chars"),
    "display_name_too_long": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d).update(displayName="Katalon True Platform Testing Hub")),
        "displayName is 33 chars",
    ),
    "display_name_ends_in_plugin": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d).update(displayName="Katalon Plugin")),
        "must not end in 'MCP', 'MCP Server' or 'Plugin'",
    ),
    "short_description_too_long": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d).update(shortDescription="Plan, run and triage your tests")),
        "shortDescription is 31 chars",
    ),
    "long_description_too_long": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d).update(longDescription="y" * 4001)),
        "longDescription is 4001 chars",
    ),
    "promotional_copy": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d).update(shortDescription="The best test tool")),
        "promotional or pricing copy",
    ),
    "too_many_capabilities": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d).update(capabilities=[f"Cap {i}" for i in range(21)])),
        "21 capabilities, over 20",
    ),
    "capability_too_long": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d)["capabilities"].append("c" * 121)),
        "over 120",
    ),
    "bad_category": (lambda p: edit_json(p / "plugin.json", lambda d: interface(d).update(category="Testing")), "is not one of the allowed categories"),
    "http_url": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d).update(privacyPolicyURL="http://katalon.com/privacy")),
        "privacyPolicyURL must be an https:// URL",
    ),
    "mcp_url_not_https": (
        lambda p: edit_json(p / "mcp.json", lambda d: d["mcpServers"]["katalon"].update(url="http://platform.katalon.io/mcp/chatgpt")),
        "url must be an https:// URL",
    ),
    "mcp_two_servers": (
        lambda p: edit_json(p / "mcp.json", lambda d: d["mcpServers"].update(other={"type": "streamable-http", "url": "https://example.com/mcp"})),
        "exactly one server",
    ),
    "too_many_prompts": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d)["defaultPrompt"].append("Show my flaky tests")),
        "4 default prompts, over 3",
    ),
    "prompt_with_mention": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d)["defaultPrompt"].__setitem__(0, "Ask @katalon about my run")),
        "must not contain an @mention",
    ),
    "brand_color_low_contrast_light": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d).update(brandColor="#DDDDDD")),
        "contrast vs white",
    ),
    "brand_color_low_contrast_dark": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d).update(brandColorDark="#333333")),
        "contrast vs #212121",
    ),
    "brand_color_not_hex": (
        lambda p: edit_json(p / "plugin.json", lambda d: interface(d).update(brandColor="purple")),
        "brandColor must be six-digit hex",
    ),
    "missing_logo_file": (lambda p: (p / "assets" / "logo.svg").unlink(), "logo ./assets/logo.svg is not in the package"),
    "secret_openai_key": (lambda p: write(p, "skills/test-plan/references/notes.md", "key sk-" + "A1b2C3d4" * 4), "OpenAI-style secret key"),
    "secret_aws_key": (lambda p: write(p, "skills/test-plan/references/notes.md", "AKIA" + "ABCDEFGHIJKLMNOP"), "AWS access key"),
    "secret_private_key": (lambda p: write(p, "skills/test-plan/references/notes.md", "-----BEGIN RSA PRIVATE KEY-----"), "private key block"),
    "secret_hardcoded_password": (
        lambda p: write(p, "skills/test-plan/references/notes.md", 'password: "Sup3rS3cretValue!"'),
        "hard-coded credential",
    ),
    "skill_missing_openai_yaml": (lambda p: (p / "skills" / "test-plan" / "agents" / "openai.yaml").unlink(), "every skill needs agents/openai.yaml"),
    "skill_bad_products": (
        lambda p: write(p, "skills/test-plan/agents/openai.yaml", 'interface:\n  display_name: "Test plan"\npolicy:\n  products: [CHAT, BROWSER]\n'),
        "unknown values ['BROWSER']",
    ),
    "skill_mcp_mismatch": (
        lambda p: write(
            p,
            "skills/test-plan/agents/openai.yaml",
            'interface:\n  display_name: "Test plan"\npolicy:\n  products: [CHAT]\ndependencies:\n  tools:\n'
            '    - type: "mcp"\n      value: "katalon-prod-mcp"\n      url: "https://platform.katalon.io/mcp"\n',
        ),
        "does not match the mcp.json server",
    ),
    "onboarding_skill_missing": (
        lambda p: edit_json(p / "plugin.json", lambda d: d["extensions"]["com.openai"].update(onboardingSkill="./skills/welcome/SKILL.md")),
        "onboardingSkill ./skills/welcome/SKILL.md is not in the package",
    ),
    "review_case_count": (
        lambda p: edit_json(p / "plugin.json", lambda d: d["extensions"]["com.openai"]["review"]["test_cases"]["negative"].pop()),
        "exactly 5 positive and 3 negative",
    ),
}


class BuildChatGPTPluginTests(unittest.TestCase):
    tmp: Path
    base: Path
    no_versions: Path

    @classmethod
    def setUpClass(cls) -> None:
        cls.tmp = Path(tempfile.mkdtemp(prefix="chatgpt-plugin-test-"))
        cls.base = cls.tmp / "base"
        problems = build.stage_package(cls.base)
        if problems:
            raise AssertionError(f"staging the real package failed: {problems}")
        cls.no_versions = cls.tmp / "none.json"
        cls.no_versions.write_text('{"versions": []}', encoding="utf-8")

    @classmethod
    def tearDownClass(cls) -> None:
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def fixture(self, name: str) -> Path:
        target = self.tmp / name
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(self.base, target)
        return target

    def test_base_fixture_is_valid(self) -> None:
        code, output = run_script("--validate", str(self.base), "--submitted-versions", str(self.no_versions))
        self.assertEqual(code, 0, output)

    def test_real_package_builds_and_zip_is_clean(self) -> None:
        out = self.tmp / "out"
        code, output = run_script("--out", str(out), "--submitted-versions", str(self.no_versions))
        self.assertEqual(code, 0, output)
        zips = sorted(out.glob("katalon-true-platform-*.zip"))
        self.assertEqual(len(zips), 1, output)
        with zipfile.ZipFile(zips[0]) as archive:
            names = archive.namelist()
            # AC-58: only plugin.json, mcp.json, skills/** and assets/**, with 19 skills directly under skills/.
            for name in names:
                self.assertTrue(name in ("plugin.json", "mcp.json") or name.startswith(("skills/", "assets/")), name)
            skills = {n.split("/")[1] for n in names if n.startswith("skills/")}
            self.assertEqual(len(skills), 19, sorted(skills))
            self.assertIn("get-started", skills)
            for skill in skills:
                self.assertIn(f"skills/{skill}/SKILL.md", names)
                self.assertIn(f"skills/{skill}/agents/openai.yaml", names)
                self.assertIn(f"skills/{skill}/references/chatgpt-tools.md", names)
            # AC-66: grep -E "test_credentials|reviewer_instructions" over the ZIP finds nothing.
            for name in names:
                self.assertIsNone(re.search(rb"test_credentials|reviewer_instructions", archive.read(name)), name)
            plugin = json.loads(archive.read("plugin.json"))
            mcp = json.loads(archive.read("mcp.json"))
        self.assertEqual(mcp["mcpServers"], {"katalon": {"type": "streamable-http", "url": "https://platform.katalon.io/mcp/chatgpt"}})
        openai = plugin["extensions"]["com.openai"]
        self.assertEqual(openai["onboardingSkill"], "./skills/get-started/SKILL.md")
        self.assertEqual(openai["interface"]["brandColor"], "#6059E4")
        code, output = run_script("--validate", str(zips[0]), "--submitted-versions", str(self.no_versions))
        self.assertEqual(code, 0, output)

    def test_chatgpt_copy_never_tells_the_model_to_write_without_asking(self) -> None:
        # AC-65 metadata-steering: writes are cards in ChatGPT.
        pattern = re.compile(r"without asking again|Run with AI automatically|Continue to AI automatically|Do not ask whether to continue with AI")
        for path in sorted((self.base / "skills").rglob("*.md")):
            self.assertIsNone(pattern.search(path.read_text(encoding="utf-8")), path.relative_to(self.base))
        for relative, rewrites in build.CHATGPT_REWRITES.items():
            staged = (self.base / "skills" / relative).read_text(encoding="utf-8")
            source = (ROOT / "skills" / relative).read_text(encoding="utf-8")
            for old, new in rewrites:
                self.assertIn(new, staged, relative)
                self.assertIn(old, source, f"{relative}: the canonical skill keeps its line")

    def test_root_manifests_for_other_agents_are_untouched(self) -> None:
        root_mcp = json.loads((ROOT / "mcp.json").read_text(encoding="utf-8"))
        self.assertEqual(root_mcp["mcpServers"], {"katalon-prod-mcp": {"type": "streamable-http", "url": "https://platform.katalon.io/mcp"}})
        root_plugin = json.loads((ROOT / "plugin.json").read_text(encoding="utf-8"))
        self.assertNotIn("extensions", root_plugin)

    def test_onboarding_requires_manifest_event_or_explicit_request(self) -> None:
        # AC-65: missing defaults discovered during another task do not permit
        # onboarding. The install/connect hook remains an authorized entry.
        skill = self.base / "skills" / "get-started"
        text = (skill / "SKILL.md").read_text(encoding="utf-8")
        description = re.search(r"(?m)^description: (.*)$", text).group(1)
        policy = build.parse_yaml((skill / "agents" / "openai.yaml").read_text(encoding="utf-8"))["policy"]
        plugin = json.loads((self.base / "plugin.json").read_text(encoding="utf-8"))
        self.assertFalse(policy["allow_implicit_invocation"])
        self.assertEqual(plugin["extensions"]["com.openai"]["onboardingSkill"], "./skills/get-started/SKILL.md")
        self.assertIn("manifest onboarding event immediately after the user installs or connects Katalon", description)
        self.assertIn("an explicit user request to get started, set up Katalon, or pick/change their default project", description)
        self.assertIn("A missing default project alone does not authorize invocation or tool calls.", description)
        self.assertNotIn("or when no default project is stored yet", description)
        self.assertIn("If neither applies, stop without calling tools, including when a read tool reveals that no default project is stored.", text)
        self.assertLess(text.index("Before calling any tool"), text.index("Call `katalon_profile`"))
        canonical = (ROOT / "skills" / "get-started" / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("or when no default project is stored yet", canonical)

    def test_onboarding_stops_before_workspace_actions(self) -> None:
        # Inspect the packaged procedure, rather than only the source rewrite,
        # so overlays or future source changes cannot add workspace actions.
        text = (self.base / "skills" / "get-started" / "SKILL.md").read_text(encoding="utf-8")
        procedure = text.split("## Steps\n", 1)[1].split("## Stop conditions\n", 1)[0]
        tools = set(re.findall(r"`([a-z]+(?:_[a-z]+)+)`", procedure))
        self.assertEqual(tools, {"katalon_profile", "list_projects", "list_repositories", "read_auts", "settings_update", "katalon_home"})
        self.assertIn("Reads only, plus one settings save. Nothing in the user's workspace changes.", text)
        self.assertIn("Stop after step 5. Do not start a run, design cases or file anything during onboarding.", text)

    def test_skill_products_follow_the_design(self) -> None:
        codex_only = {"platform-setup", "test-case-to-playwright", "test-case-to-katalon-studio", "playwright-execute", "upload-report"}
        for skill in sorted((self.base / "skills").iterdir()):
            data = build.parse_yaml((skill / "agents" / "openai.yaml").read_text(encoding="utf-8"))
            expected = ["CODEX"] if skill.name in codex_only else ["CHAT", "CODEX"]
            self.assertEqual(data["policy"]["products"], expected, skill.name)
            self.assertEqual(data["dependencies"]["tools"][0]["url"], "https://platform.katalon.io/mcp/chatgpt", skill.name)

    def test_brand_colors_pass_contrast(self) -> None:
        self.assertGreaterEqual(build.contrast_ratio("#6059E4", "#FFFFFF"), 2.0)
        self.assertGreaterEqual(build.contrast_ratio("#8C86F0", "#212121"), 2.0)

    def test_submission_mode_refuses_placeholder_screenshots(self) -> None:
        code, output = run_script("--validate", str(self.base), "--for-submission", "--submitted-versions", str(self.no_versions))
        self.assertEqual(code, 1, output)
        self.assertIn("is a placeholder screenshot", output)
        self.assertIn("demo_recording_url is required for submission", output)

    def test_zip_with_forbidden_entry_fails(self) -> None:
        zip_path = self.tmp / "bad.zip"
        build.write_zip(self.base, zip_path)
        with zipfile.ZipFile(zip_path, "a") as archive:
            archive.writestr("apps/katalon-testing-skills/app.json", "{}")
        code, output = run_script("--validate", str(zip_path), "--submitted-versions", str(self.no_versions))
        self.assertEqual(code, 1, output)
        self.assertIn("ZIP entries must be plugin.json, mcp.json, skills/** or assets/**", output)

    def test_yaml_reader(self) -> None:
        data = build.parse_yaml(
            'interface:\n  display_name: "Analyze failures"\npolicy:\n  products: [CHAT, CODEX]\n'
            "  allow_implicit_invocation: true\ndependencies:\n  tools:\n    - type: \"mcp\"\n      value: \"katalon\"\n"
        )
        self.assertEqual(data["policy"], {"products": ["CHAT", "CODEX"], "allow_implicit_invocation": True})
        self.assertEqual(data["dependencies"]["tools"], [{"type": "mcp", "value": "katalon"}])


def _make_bad_fixture_test(name: str, mutate: Callable[[Path], None], expected: str) -> Callable[[BuildChatGPTPluginTests], None]:
    def test(self: BuildChatGPTPluginTests) -> None:
        pkg = self.fixture(name)
        mutate(pkg)
        versions = self.no_versions
        if name == "version_already_submitted":
            versions = self.tmp / "submitted.json"
            version = json.loads((pkg / "plugin.json").read_text(encoding="utf-8"))["version"]
            versions.write_text(json.dumps({"versions": [version]}), encoding="utf-8")
        code, output = run_script("--validate", str(pkg), "--submitted-versions", str(versions))
        self.assertEqual(code, 1, f"{name} should fail the build:\n{output}")
        self.assertIn(expected, output)
        shutil.rmtree(pkg, ignore_errors=True)

    return test


for _name, (_mutate, _expected) in BAD_FIXTURES.items():
    setattr(BuildChatGPTPluginTests, f"test_bad_fixture_{_name}", _make_bad_fixture_test(_name, _mutate, _expected))


if __name__ == "__main__":
    unittest.main()
