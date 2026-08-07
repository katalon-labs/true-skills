/**
 * skills.config.mjs - per-skill metadata shared by the build and the validator.
 *
 * This is the one place that has to know about each skill beyond its folder:
 *   - INTERFACE: display name / short blurb / starter prompt for generated wrappers
 *   - ORDER:     the order skills appear in generated indexes (setup first, orchestrator last)
 *   - ROLES:     the closed role vocabulary; each INTERFACE entry declares a subset in `roles`
 *
 * Adding a skill means adding it here AND creating skills/<name>/. The validator
 * (scripts/validate-skills.mjs) fails the build if these ever drift apart.
 *
 * No external dependencies - Node >= 18, ESM.
 */

// The closed role vocabulary. A skill declares a role only when a request phrased
// in role terms, naming no skill, should land on it first. Secondary users arrive by
// handoff or through the router, so the role token stays selective.
export const ROLES = ["manual tester", "automation tester", "test lead", "test manager"];

// The one skill allowed to declare more than two roles, because it is the router.
export const ROUTER = "true-platform-testing";

// Per-skill interface metadata (display name / short blurb / starter prompt).
// Used to generate Codex openai.yaml overlays, plugin defaultPrompt, and prompt headers.
export const INTERFACE = {
  "platform-setup": {
    title: "Katalon Platform Setup",
    short: "Install and connect the Katalon MCP",
    prompt: "Install the Katalon MCP server and connect it to my platform account.",
    roles: [],
  },
  "test-plan": {
    title: "Katalon Test Plan",
    short: "Plan and prioritize Katalon testing",
    prompt: "Plan testing for this sprint: show coverage gaps and build the executable suite.",
    roles: ["test lead"],
  },
  "create-test-cases": {
    title: "Katalon Create Test Cases",
    short: "Create and link Katalon manual tests",
    prompt: "Design and import manual test cases from requirement CEL-6.",
    roles: ["manual tester"],
  },
  "test-management": {
    title: "Katalon Test Management",
    short: "Organize and trace Katalon test assets",
    prompt: "Audit requirement-to-test traceability and list orphan requirements.",
    roles: ["test lead"],
  },
  "test-review": {
    title: "Katalon Test Review",
    short: "Review coverage and quality before the pipeline",
    prompt: "Review this suite for the pipeline and give a verdict with weak cases.",
    roles: ["test lead"],
  },
  "execute-test": {
    title: "Katalon Execute Test",
    short: "Run Katalon cases or suites",
    prompt: "Run this Katalon test suite with AI and report the result.",
    roles: ["manual tester"],
  },
  "upload-report": {
    title: "Katalon Upload Report",
    short: "Upload and verify Katalon reports",
    prompt: "Upload a Katalon, JUnit, or Playwright report to Katalon Platform and summarize results.",
    roles: ["automation tester"],
  },
  "test-case-to-playwright": {
    title: "Katalon Test Case to Playwright Script",
    short: "Generate Playwright from Katalon cases",
    prompt: "Generate Playwright TypeScript automation from Katalon Platform test cases using Page Object Model and fixtures.",
    roles: ["automation tester"],
  },
  "playwright-execute": {
    title: "Katalon Playwright Execute",
    short: "Run Playwright and upload Katalon reports",
    prompt: "Run a Playwright suite, upload the report to Katalon Platform, and verify the uploaded result.",
    roles: ["automation tester"],
  },
  "analyze-failures": {
    title: "Katalon Analyze Failures",
    short: "Triage failures and file defects",
    prompt: "Triage this execution: product bug vs flaky vs environment, and what to file.",
    roles: ["manual tester", "automation tester"],
  },
  "release-analyze": {
    title: "Katalon Release Analyze",
    short: "Assess release testing readiness",
    prompt: "Assess whether this Katalon release is ready based on testing quality metrics.",
    roles: ["test manager", "test lead"],
  },
  "test-maintenance": {
    title: "Katalon Test Maintenance",
    short: "Repair and evolve the regression suite",
    prompt: "Which cases went flaky this month, and which should we repair vs regenerate?",
    roles: ["automation tester", "test lead"],
  },
  "true-platform-testing": {
    title: "Katalon True Platform Testing",
    short: "Route and run the full 7-stage testing lifecycle",
    prompt: "Analyze requirements, create manual test cases, organize suites, run with AI, and report results.",
    roles: ["manual tester", "automation tester", "test lead", "test manager"],
  },
};

// Order skills appear in generated indexes (setup first, then lifecycle order, orchestrator last).
export const ORDER = [
  "platform-setup",
  "test-plan",
  "create-test-cases",
  "test-management",
  "test-review",
  "execute-test",
  "upload-report",
  "test-case-to-playwright",
  "playwright-execute",
  "analyze-failures",
  "release-analyze",
  "test-maintenance",
  "true-platform-testing",
];
