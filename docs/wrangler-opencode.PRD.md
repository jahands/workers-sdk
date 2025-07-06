# Wrangler OpenCode Integration PRD

## Overview

This PRD outlines the integration of OpenCode, an AI coding agent, into Wrangler CLI to provide developers with an intelligent assistant specifically tailored for Cloudflare Workers development.

## Background

**OpenCode** is an open-source AI coding agent built for the terminal that features:

- A responsive, native, themeable terminal UI
- Automatic LSP integration for better code understanding
- Support for multiple AI providers (Anthropic, OpenAI, Google, local models)
- Multi-agent parallel work capabilities
- Shareable session links
- Client/server architecture

**Wrangler** is the command-line tool for building Cloudflare Workers, providing commands for development, deployment, and management of Workers applications.

## Problem Statement

Developers working with Cloudflare Workers often need assistance with:

- Understanding Workers-specific APIs and patterns
- Debugging Workers code and configuration
- Learning best practices for Workers development
- Implementing common Workers use cases (queues, KV, D1, etc.)
- Troubleshooting deployment and runtime issues

Currently, developers must context-switch between their development environment and external AI tools, losing the context of their current project and Workers-specific knowledge.

## Solution

Integrate OpenCode directly into Wrangler CLI to provide an AI assistant that:

1. Has deep knowledge of Cloudflare Workers APIs and patterns
2. Understands the current project context (wrangler.toml, code structure)
3. Can execute Workers-specific commands and operations
4. Provides contextual help and code generation

## Goals

### Primary Goals

- Provide seamless AI assistance within the Wrangler CLI workflow
- Reduce context switching for developers seeking AI help
- Improve developer productivity with Workers-specific AI guidance
- Maintain the existing Wrangler CLI experience and performance

### Secondary Goals

- Enable advanced AI-powered Workers development workflows
- Provide a foundation for future AI integrations in Workers tooling
- Demonstrate Cloudflare's commitment to developer experience innovation

## Non-Goals

- Replace existing Wrangler commands or functionality
- Require internet connectivity for basic Wrangler operations
- Significantly increase Wrangler bundle size or startup time
- Support non-Workers related AI assistance

## User Stories

### Story 1: Quick AI Assistance

**As a** Workers developer
**I want to** quickly ask AI questions about my Workers project
**So that** I can get immediate help without leaving my terminal

**Acceptance Criteria:**

- `wrangler -p "how do I add a queue to my worker"` launches OpenCode with the prompt
- OpenCode has context about the current Workers project
- OpenCode can suggest appropriate code changes and configurations

### Story 2: Interactive Development Session

**As a** Workers developer
**I want to** start an interactive AI session for my Workers project
**So that** I can have an ongoing conversation about my code and get iterative help

**Acceptance Criteria:**

- `wrangler -p` or `wrangler --prompt` launches interactive OpenCode TUI
- OpenCode understands Workers APIs, bindings, and configuration
- OpenCode can read and modify project files with Workers context

### Story 3: Workers-Specific Knowledge

**As a** Workers developer
**I want** the AI to understand Workers-specific concepts
**So that** I get accurate and relevant suggestions for my Workers project

**Acceptance Criteria:**

- OpenCode recognizes wrangler.toml configuration
- OpenCode understands Workers runtime APIs (Request/Response, KV, D1, Queues, etc.)
- OpenCode can suggest appropriate Workers patterns and best practices

## Technical Design

### Command Interface

#### New CLI Options

```bash
# Interactive mode - launches OpenCode TUI
wrangler -p
wrangler --prompt

# Direct prompt mode - runs single prompt and exits
wrangler -p "add a queue to my worker"
wrangler --prompt "how do I use KV in my worker?"
```

#### Implementation Approach

1. Add new global options `-p` and `--prompt` to Wrangler's yargs configuration
2. When these options are detected, delegate to OpenCode integration
3. Pass current working directory and project context to OpenCode

### Integration Architecture

#### Option 1: Embedded OpenCode (Recommended)

- Include OpenCode as a dependency in Wrangler
- Create a Wrangler-specific OpenCode configuration
- Launch OpenCode programmatically from within Wrangler

**Pros:**

- Seamless user experience
- Shared context and configuration
- Single installation for users

**Cons:**

- Increases Wrangler bundle size
- Dependency management complexity

#### Option 2: External OpenCode Process

- Require separate OpenCode installation
- Launch OpenCode as external process with Workers context

**Pros:**

- Smaller Wrangler bundle
- Independent OpenCode updates

**Cons:**

- Additional installation requirement
- More complex context passing

### Workers Context Integration

#### Project Context Detection

- Automatically detect wrangler.toml/wrangler.json configuration
- Parse Workers project structure and bindings
- Identify Workers runtime version and compatibility date

#### Workers-Specific Prompts and Tools

- Pre-configure OpenCode with Workers-specific system prompts
- Add custom tools for Workers operations:
  - Reading/writing wrangler.toml
  - Understanding Workers bindings (KV, D1, Queues, etc.)
  - Suggesting Workers API usage patterns

#### Custom OpenCode Configuration

```json
{
	"$schema": "https://opencode.ai/config.json",
	"theme": "cloudflare",
	"model": "anthropic/claude-sonnet-4-20250514",
	"systemPrompt": "You are an expert Cloudflare Workers developer assistant...",
	"tools": {
		"workers": {
			"enabled": true,
			"features": ["wrangler-config", "workers-apis", "bindings"]
		}
	}
}
```

### Implementation Details

#### File Structure

```
packages/wrangler/src/
├── opencode/
│   ├── index.ts          # Main integration entry point
│   ├── config.ts         # Workers-specific OpenCode configuration
│   ├── context.ts        # Project context detection and parsing
│   └── tools/            # Custom Workers tools for OpenCode
│       ├── wrangler-config.ts
│       ├── workers-apis.ts
│       └── bindings.ts
```

#### Core Integration Code

```typescript
// packages/wrangler/src/opencode/index.ts
import { bootstrap } from "opencode/cli/bootstrap";
import { createCommand } from "../core/create-command";
import { createWorkersConfig } from "./config";
import { detectProjectContext } from "./context";

export const openCodeCommand = createCommand({
	metadata: {
		description: "🤖 AI assistant for Workers development",
		owner: "Workers: Authoring and Testing",
		status: "experimental",
	},
	args: {
		prompt: {
			type: "string",
			describe: "Initial prompt for the AI assistant",
		},
	},
	async handler(args, { config }) {
		const projectContext = await detectProjectContext(process.cwd());
		const openCodeConfig = createWorkersConfig(projectContext);

		if (args.prompt) {
			// Direct prompt mode
			await runDirectPrompt(args.prompt, openCodeConfig);
		} else {
			// Interactive TUI mode
			await launchInteractiveTUI(openCodeConfig);
		}
	},
});
```

#### Yargs Integration

```typescript
// packages/wrangler/src/index.ts (additions)
.option("p", {
  describe: "Launch AI assistant for Workers development",
  alias: "prompt",
  type: "string",
})
.middleware((argv) => {
  if (argv.p !== undefined) {
    // Handle OpenCode integration
    return handleOpenCodeIntegration(argv);
  }
})
```

## Success Metrics

### Adoption Metrics

- Number of developers using `wrangler -p` command
- Frequency of OpenCode usage per developer
- Session duration and interaction patterns

### Quality Metrics

- User satisfaction scores for AI assistance quality
- Accuracy of Workers-specific suggestions
- Reduction in documentation lookup time

### Performance Metrics

- OpenCode startup time from Wrangler
- Impact on Wrangler CLI performance
- Bundle size increase (target: <10MB)

## Risks and Mitigations

### Risk 1: Bundle Size Impact

**Risk:** OpenCode integration significantly increases Wrangler bundle size
**Mitigation:**

- Use dynamic imports for OpenCode functionality
- Consider optional installation model
- Optimize OpenCode dependencies

### Risk 2: AI Provider Dependencies

**Risk:** Reliance on external AI services affects reliability
**Mitigation:**

- Support multiple AI providers
- Graceful degradation when AI services unavailable
- Clear error messaging for connectivity issues

### Risk 3: User Experience Complexity

**Risk:** New CLI options confuse existing users
**Mitigation:**

- Clear documentation and examples
- Progressive disclosure of AI features
- Maintain backward compatibility

## Timeline

### Phase 1: Foundation (4 weeks)

- Basic OpenCode integration infrastructure
- Simple prompt handling (`wrangler -p "prompt"`)
- Workers project context detection

### Phase 2: Enhanced Integration (4 weeks)

- Interactive TUI mode (`wrangler -p`)
- Workers-specific system prompts and tools
- wrangler.toml understanding

### Phase 3: Advanced Features (4 weeks)

- Custom Workers tools (KV, D1, Queues assistance)
- Performance optimization
- Documentation and examples

### Phase 4: Polish and Launch (2 weeks)

- User testing and feedback incorporation
- Final performance tuning
- Launch preparation and documentation

## Open Questions

1. **AI Provider Strategy**: Should we default to a specific AI provider or require user configuration?
2. **Offline Capabilities**: How should the feature behave when AI services are unavailable?
3. **Data Privacy**: What project information should be sent to AI providers?
4. **Versioning**: How do we handle OpenCode version compatibility with Wrangler?
5. **Enterprise Considerations**: Are there special requirements for enterprise users?

## Appendix

### Related Documentation

- [OpenCode Documentation](https://opencode.ai/docs)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Workers Runtime APIs](https://developers.cloudflare.com/workers/runtime-apis/)

### Competitive Analysis

- GitHub Copilot CLI
- Cursor AI
- Aider
- Claude Code

### Future Enhancements

- Integration with Cloudflare Dashboard
- Workers-specific code templates
- Automated testing suggestions
- Performance optimization recommendations
