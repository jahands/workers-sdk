# Wrangler OpenCode Integration POC - Technical Implementation Specification

## Overview

This document provides detailed technical implementation guidance for integrating OpenCode AI assistant functionality into Wrangler CLI as a Proof of Concept (POC). The POC focuses on demonstrating feasibility and user experience rather than long-term optimization.

## Architecture Overview

### Integration Strategy

**Package Copying Approach**: Copy all OpenCode packages from the opencode repository into the workers-sdk repository to simplify dependency management during POC development.

**Directory Structure**:

```
packages/
├── opencode/           # New directory for all OpenCode packages
│   ├── opencode/       # Core OpenCode package (TypeScript/Node.js)
│   ├── tui/           # Terminal UI package (Go)
│   ├── function/      # Function package (TypeScript)
│   └── web/           # Web package (TypeScript/Astro)
├── wrangler/          # Existing Wrangler package
└── ...                # Other existing packages
```

## Implementation Steps

### Phase 1: Package Integration (Week 1-2)

#### Step 1.1: Copy OpenCode Packages

1. **Create target directory structure**:

   ```bash
   mkdir -p packages/opencode
   ```

2. **Copy packages from opencode repository**:

   ```bash
   # From workers-sdk root
   cp -r /path/to/opencode/packages/* packages/opencode/
   ```

3. **Copy additional required files**:
   ```bash
   # Copy root-level configuration files needed by OpenCode
   cp /path/to/opencode/bunfig.toml packages/opencode/
   cp /path/to/opencode/tsconfig.json packages/opencode/tsconfig.base.json
   ```

#### Step 1.2: Update Workspace Configuration

1. **Update `pnpm-workspace.yaml`**:

   ```yaml
   packages:
     - "packages/*"
     - "packages/opencode/*" # Add this line
     - "packages/vite-plugin-cloudflare/playground/*"
     - "packages/vite-plugin-cloudflare/playground"
     - "fixtures/*"
     - "tools"
   ```

2. **Update root `package.json`** to include OpenCode dependencies in catalog:
   ```json
   {
   	"dependencies": {
   		// ... existing dependencies
   		"@ai-sdk/anthropic": "1.2.12",
   		"@clack/prompts": "0.11.0",
   		"ai": "4.3.16",
   		"hono": "4.7.10",
   		"yargs": "18.0.0",
   		"zod": "3.24.2"
   	}
   }
   ```

#### Step 1.3: Resolve Package Dependencies

1. **Update OpenCode package.json files** to use workspace references:

   ```json
   // packages/opencode/opencode/package.json
   {
   	"dependencies": {
   		"ai": "catalog:",
   		"zod": "catalog:"
   		// ... other dependencies
   	}
   }
   ```

2. **Handle Go module dependencies** for TUI package:
   - Keep the existing `go.mod` structure
   - Ensure Go toolchain is available in CI/CD

### Phase 2: Wrangler CLI Integration (Week 2-3)

#### Step 2.1: Add OpenCode Command Line Options

1. **Update Wrangler CLI argument parser** in `packages/wrangler/src/index.ts`:

```typescript
// Add new global options for OpenCode integration
.option("p", {
  describe: "Launch OpenCode AI assistant",
  alias: "prompt",
  type: "string",
  requiresArg: false,
})
.option("opencode", {
  describe: "OpenCode-specific options",
  type: "boolean",
  hidden: true, // Internal flag
})
```

2. **Add OpenCode command handler** before the catch-all command:

```typescript
// Add before the ["*"] command registration
wrangler.command(
	["prompt [question]", "p [question]"],
	"Launch OpenCode AI assistant for Workers development",
	(yargs) => {
		return yargs
			.positional("question", {
				describe: "Optional question to ask the AI assistant",
				type: "string",
			})
			.option("interactive", {
				describe: "Force interactive mode even with a question",
				type: "boolean",
				default: false,
			});
	},
	async (args) => {
		const { launchOpenCode } = await import("../opencode/integration");
		await launchOpenCode(args);
	}
);
```

#### Step 2.2: Create OpenCode Integration Module

1. **Create integration module** at `packages/wrangler/src/opencode/integration.ts`:

```typescript
import { spawn } from "child_process";
import { resolve } from "path";
import { detectWranglerConfig } from "../config";
import { logger } from "../logger";

export interface OpenCodeArgs {
	question?: string;
	interactive?: boolean;
	config?: string;
}

export async function launchOpenCode(args: OpenCodeArgs): Promise<void> {
	try {
		// Detect Workers project context
		const projectContext = await gatherProjectContext(args.config);

		// Determine execution mode
		if (args.question && !args.interactive) {
			await runSinglePrompt(args.question, projectContext);
		} else {
			await runInteractiveSession(args.question, projectContext);
		}
	} catch (error) {
		logger.error("Failed to launch OpenCode:", error);
		throw error;
	}
}

async function gatherProjectContext(configPath?: string) {
	// Gather Wrangler configuration and project context
	const config = await detectWranglerConfig(configPath);

	return {
		wranglerConfig: config,
		projectRoot: process.cwd(),
		// Add more context as needed
	};
}

async function runSinglePrompt(question: string, context: any): Promise<void> {
	// Implementation for single prompt mode
	const opencodePath = resolve(
		__dirname,
		"../../opencode/opencode/bin/opencode"
	);

	const child = spawn("node", [opencodePath, "ask", question], {
		stdio: "inherit",
		env: {
			...process.env,
			WRANGLER_CONTEXT: JSON.stringify(context),
		},
	});

	return new Promise((resolve, reject) => {
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`OpenCode exited with code ${code}`));
			}
		});
	});
}

async function runInteractiveSession(
	initialQuestion?: string,
	context?: any
): Promise<void> {
	// Implementation for interactive TUI mode
	const tuiPath = resolve(__dirname, "../../opencode/tui/cmd/tui");

	const args = ["serve"];
	if (initialQuestion) {
		args.push("--initial-prompt", initialQuestion);
	}

	const child = spawn(tuiPath, args, {
		stdio: "inherit",
		env: {
			...process.env,
			WRANGLER_CONTEXT: JSON.stringify(context),
		},
	});

	return new Promise((resolve, reject) => {
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`OpenCode TUI exited with code ${code}`));
			}
		});
	});
}
```

### Phase 3: Build System Integration (Week 3-4)

#### Step 3.1: Update Build Configuration

1. **Update Wrangler's `tsup.config.ts`** to handle OpenCode dependencies:

```typescript
// Add to EXTERNAL_DEPENDENCIES in packages/wrangler/scripts/deps.ts
export const EXTERNAL_DEPENDENCIES = [
	// ... existing dependencies
	"opencode", // Keep OpenCode external for POC
];
```

2. **Update Wrangler's `package.json`** to include OpenCode as dependency:

```json
{
	"dependencies": {
		// ... existing dependencies
		"opencode": "workspace:*"
	}
}
```

#### Step 3.2: Update Turbo Configuration

1. **Add OpenCode packages to build pipeline** in `turbo.json`:

```json
{
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"outputLogs": "new-only"
		}
	}
}
```

2. **Create individual turbo.json files** for OpenCode packages as needed.

### Phase 4: Workers Context Integration (Week 4-5)

#### Step 4.1: Enhance Context Detection

1. **Extend project context gathering** in integration module:

```typescript
async function gatherProjectContext(configPath?: string) {
	const config = await detectWranglerConfig(configPath);

	// Detect all Wrangler configuration variants
	const configFiles = await detectAllConfigFiles();

	// Analyze bindings and services
	const bindings = analyzeBindings(config);

	return {
		wranglerConfig: config,
		configFiles,
		bindings,
		projectRoot: process.cwd(),
		workersRuntime: config?.compatibility_date,
		// Add Workers-specific context
	};
}

async function detectAllConfigFiles(): Promise<string[]> {
	const configFiles = [];
	const possibleConfigs = ["wrangler.toml", "wrangler.json", "wrangler.jsonc"];

	for (const configFile of possibleConfigs) {
		if (await fileExists(configFile)) {
			configFiles.push(configFile);
		}
	}

	return configFiles;
}

function analyzeBindings(config: any) {
	// Extract and categorize bindings (KV, D1, R2, etc.)
	return {
		kv: config?.kv_namespaces || [],
		d1: config?.d1_databases || [],
		r2: config?.r2_buckets || [],
		queues: config?.queues || [],
		// ... other binding types
	};
}
```

#### Step 4.2: Create Workers Knowledge Integration

1. **Create Workers documentation integration** for OpenCode:
   - Configure OpenCode to use Cloudflare Workers documentation
   - Add Workers-specific system prompts
   - Integrate with Cloudflare API documentation

## Build and Deployment

### Development Workflow

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Build all packages**:

   ```bash
   pnpm build
   ```

3. **Test Wrangler with OpenCode**:

   ```bash
   # Interactive mode
   ./packages/wrangler/bin/wrangler.js -p

   # Single prompt mode
   ./packages/wrangler/bin/wrangler.js -p "How do I add a KV binding?"
   ```

### Testing Strategy

1. **Unit Tests**: Test integration module functions
2. **Integration Tests**: Test CLI argument parsing and command execution
3. **E2E Tests**: Test full workflow with sample Workers projects

## Success Criteria

### Functional Requirements

- [ ] `wrangler -p` launches interactive OpenCode TUI
- [ ] `wrangler -p "question"` runs single prompt and returns answer
- [ ] OpenCode detects Wrangler configuration files (all variants)
- [ ] OpenCode understands Workers project context (bindings, runtime version)
- [ ] Performance impact < 500ms for non-AI commands
- [ ] Bundle size increase < 10MB

### User Experience Requirements

- [ ] Seamless integration with existing Wrangler workflow
- [ ] Clear error messages when AI services unavailable
- [ ] Consistent CLI interface patterns
- [ ] Workers-specific guidance and suggestions

## Risk Mitigation

### Technical Risks

1. **Dependency Conflicts**: Use workspace references and external dependencies
2. **Build Complexity**: Keep OpenCode packages external during POC
3. **Performance Impact**: Lazy load OpenCode components
4. **Cross-Platform Compatibility**: Test on Windows, macOS, Linux

### User Experience Risks

1. **Confusing Interface**: Follow existing Wrangler CLI patterns
2. **Poor AI Responses**: Implement Workers-specific prompts and documentation
3. **Reliability Issues**: Graceful degradation when AI unavailable

## Future Considerations

### Post-POC Optimizations

1. **Bundle Optimization**: Investigate bundling strategies for production
2. **Caching**: Implement response caching for common queries
3. **Offline Mode**: Local model support for enterprise users
4. **Integration Depth**: Deeper integration with Wrangler commands

### Scalability Considerations

1. **Multi-language Support**: Handle Go TUI package in CI/CD
2. **Documentation Updates**: Automated sync with Cloudflare docs
3. **Telemetry**: Usage analytics and performance monitoring
4. **Enterprise Features**: SSO, audit logging, custom models

## Acceptance Criteria

The POC is considered successful when:

1. All functional requirements are met
2. Demo can be shown to stakeholders
3. User feedback is positive (>4.0/5.0 satisfaction)
4. Technical feasibility is proven
5. Performance requirements are satisfied
6. Integration feels native to Wrangler CLI

This POC will serve as the foundation for production implementation and provide valuable insights for the full integration roadmap.
