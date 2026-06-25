/**
 * skills.config.mjs - per-skill metadata shared by the build and the validator.
 *
 * This is the one place that has to know about each skill beyond its folder:
 *   - INTERFACE: display name / short blurb / starter prompt for generated wrappers
 *   - ORDER:     the order skills appear in generated indexes (setup first, orchestrator last)
 *
 * Adding a skill means adding it here AND creating skills/<name>/. The validator
 * (scripts/validate-skills.mjs) fails the build if these ever drift apart.
 *
 * No external dependencies - Node >= 18, ESM.
 */

// Per-skill interface metadata (display name / short blurb / starter prompt).
// Used to generate Codex openai.yaml overlays, plugin defaultPrompt, and prompt headers.
export const INTERFACE = {
  "katalon-platform-setup": {
    title: "Katalon Platform Setup",
    short: "Install and connect the Katalon MCP",
    prompt: "Install the Katalon MCP server and connect it to my platform account.",
  },
  "katalon-create-test-cases": {
    title: "Katalon Create Test Cases",
    short: "Create and link Katalon manual tests",
    prompt: "Design and import manual test cases from requirement CEL-6.",
  },
  "katalon-execute-test": {
    title: "Katalon Execute Test",
    short: "Run Katalon cases or suites",
    prompt: "Run this Katalon test suite with AI and report the result.",
  },
  "katalon-upload-report": {
    title: "Katalon Upload Report",
    short: "Upload and verify Katalon reports",
    prompt: "Upload a Katalon, JUnit, or Playwright report to Katalon Platform and summarize results.",
  },
  "katalon-test-case-to-playwright-script": {
    title: "Katalon Test Case to Playwright Script",
    short: "Generate Playwright from Katalon cases",
    prompt: "Generate Playwright TypeScript automation from Katalon Platform test cases using Page Object Model and fixtures.",
  },
  "katalon-playwright-execute": {
    title: "Katalon Playwright Execute",
    short: "Run Playwright and upload Katalon reports",
    prompt: "Run a Playwright suite, upload the report to Katalon Platform, and verify the uploaded result.",
  },
  "katalon-release-analyze": {
    title: "Katalon Release Analyze",
    short: "Assess release testing readiness",
    prompt: "Assess whether this Katalon release is ready based on testing quality metrics.",
  },
  "katalon-trueplatform-testing": {
    title: "Katalon True Platform Testing",
    short: "Plan, import, execute, and report Katalon tests",
    prompt: "Analyze requirements, create manual test cases, organize suites, run with AI, and report results.",
  },
};

// Order skills appear in generated indexes (setup first, orchestrator last).
export const ORDER = [
  "katalon-platform-setup",
  "katalon-create-test-cases",
  "katalon-execute-test",
  "katalon-upload-report",
  "katalon-test-case-to-playwright-script",
  "katalon-playwright-execute",
  "katalon-release-analyze",
  "katalon-trueplatform-testing",
];
