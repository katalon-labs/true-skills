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
  "katalon-test-plan": {
    title: "Katalon Test Plan",
    short: "Plan and prioritize Katalon testing",
    prompt: "Plan testing for this sprint: show coverage gaps and build the executable suite.",
  },
  "katalon-create-test-cases": {
    title: "Katalon Create Test Cases",
    short: "Create and link Katalon manual tests",
    prompt: "Design and import manual test cases from requirement CEL-6.",
  },
  "katalon-test-management": {
    title: "Katalon Test Management",
    short: "Organize and trace Katalon test assets",
    prompt: "Audit requirement-to-test traceability and list orphan requirements.",
  },
  "katalon-test-review": {
    title: "Katalon Test Review",
    short: "Review coverage and quality before the pipeline",
    prompt: "Review this suite for the pipeline and give a verdict with weak cases.",
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
  "katalon-analyze-failures": {
    title: "Katalon Analyze Failures",
    short: "Triage failures and file defects",
    prompt: "Triage this execution: product bug vs flaky vs environment, and what to file.",
  },
  "katalon-release-analyze": {
    title: "Katalon Release Analyze",
    short: "Assess release testing readiness",
    prompt: "Assess whether this Katalon release is ready based on testing quality metrics.",
  },
  "katalon-test-maintenance": {
    title: "Katalon Test Maintenance",
    short: "Repair and evolve the regression suite",
    prompt: "Which cases went flaky this month, and which should we repair vs regenerate?",
  },
  "katalon-dogfood-session": {
    title: "Katalon Dogfood Session",
    short: "Durable test-of / dogfooding session",
    prompt: "Dogfood product-980: open a session, design cases, run both lanes, cross-verify, and file defects.",
  },
  "katalon-trueplatform-testing": {
    title: "Katalon True Platform Testing",
    short: "Route and run the full 7-stage testing lifecycle",
    prompt: "Analyze requirements, create manual test cases, organize suites, run with AI, and report results.",
  },
};

// Order skills appear in generated indexes (setup first, then lifecycle order, orchestrator last).
export const ORDER = [
  "katalon-platform-setup",
  "katalon-test-plan",
  "katalon-create-test-cases",
  "katalon-test-management",
  "katalon-test-review",
  "katalon-execute-test",
  "katalon-upload-report",
  "katalon-test-case-to-playwright-script",
  "katalon-playwright-execute",
  "katalon-analyze-failures",
  "katalon-release-analyze",
  "katalon-test-maintenance",
  "katalon-dogfood-session",
  "katalon-trueplatform-testing",
];
