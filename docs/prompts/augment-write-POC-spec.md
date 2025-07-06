Write a technical implementation specification for the POC (Proof of Concept) based on the PRD located at `/Users/jh/src/workers-sdk/docs/wrangler-opencode.PRD.md`. The specification should be saved as `/Users/jh/src/workers-sdk/docs/wrangler-opencode-POC.spec.md`. Use the Augment Context Engine where possible for understanding wrangler and opencode.

**POC Context and Constraints:**

- This is a proof of concept focused on demonstrating feasibility and user experience
- Performance optimization and long-term maintainability are not primary concerns for this POC
- The goal is to create a working demo that stakeholders can interact with to validate the concept

**Proposed Technical Approach:**

1. **Package Integration Strategy:** Copy all packages from the opencode repository into the workers-sdk repository to simplify dependency management during POC development
2. **Directory Structure:** Place all opencode packages in a new subdirectory `packages/opencode/` within the existing workers-sdk packages directory
3. **Workspace Configuration:** Update `/Users/jh/src/workers-sdk/pnpm-workspace.yaml` and other relevant configuration files to include all packages under `packages/opencode/` (e.g., `packages/opencode/tui`, `packages/opencode/function`, etc.)
4. **Dependency Management:** Configure the wrangler package to use these locally copied opencode packages as dependencies

**Specification Requirements:**

- Include detailed implementation steps for the package copying and integration process
- Specify exact changes needed for workspace configuration files
- Define how wrangler will integrate with the opencode packages
- Outline any build process modifications required
- Document the user experience flow for the POC feature
- Include acceptance criteria for the POC demonstration

Please ensure the specification is implementation-focused and provides clear technical guidance for developers to build this POC.
