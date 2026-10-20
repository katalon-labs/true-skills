"""Runs the Node fixture tests for the validator, the shared-reference sync and the live MCP diff.

The checks live in scripts/validate-skills.mjs, scripts/sync-shared.mjs and
scripts/check-mcp-live.mjs, and are tested in tests/validate-skills.test.mjs with node:test.
This wrapper lets `python3 -m unittest discover -s tests` run them too. It skips when Node
is not installed.

Run with either:
    python3 -m unittest discover -s tests
    node --test tests/validate-skills.test.mjs
"""

from __future__ import annotations

import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NODE = shutil.which("node")


@unittest.skipUnless(NODE, "node is not installed")
class NodeValidatorTests(unittest.TestCase):
    def test_node_fixture_tests_pass(self) -> None:
        proc = subprocess.run(
            [NODE, "--test", str(ROOT / "tests" / "validate-skills.test.mjs")],
            capture_output=True,
            text=True,
            timeout=180,
            cwd=ROOT,
        )
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)


if __name__ == "__main__":
    unittest.main()
