# Wrangler OpenCode Integration POC - Technical Implementation Specification

## Overview

This document provides detailed technical implementation guidance for integrating OpenCode AI assistant functionality into Wrangler CLI as a Proof of Concept (POC). The POC focuses on demonstrating feasibility and user experience rather than long-term optimization.

## Architecture Overview

### Integration Strategy

**Integration Strategy**: Develop OpenCode packages within workers-sdk monorepo, then publish as `@jahands/wrangler-opencode` and use as dependency in Wrangler.

**Directory Structure**:

```
packages/
├── opencode/           # Copied OpenCode packages for development
│   ├── opencode/       # Core OpenCode package (TypeScript/Node.js)
│   ├── tui/           # Terminal UI package (Go)
│   ├── function/      # Function package (TypeScript)
│   └── web/           # Web package (TypeScript/Astro)
├── wrangler/          # Existing Wrangler package
└── ...                # Other existing packages
```

**Publishing Strategy**:

- Develop OpenCode packages within workers-sdk monorepo
- Use pkg.pr.new for rapid iteration and testing during POC
- Publish both `@jahands/wrangler-opencode` and `@jahands/wrangler` packages via pkg.pr.new
- Switch to npm publishing after POC validation

## Implementation Steps

### Phase 1: Package Setup (Week 1-2)

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

2. **Preserve existing OpenCode dependency versions**:
   - Keep OpenCode packages' existing package.json files unchanged
   - Avoid integrating with workers-sdk catalog system for POC
   - Let OpenCode packages maintain their own dependency versions

#### Step 1.3: Setup Publishing and Dependency

1. **Prepare OpenCode for publishing**:

   - Configure build process to create `@jahands/wrangler-opencode` package
   - Include all necessary binaries and assets in published package
   - Ensure Go TUI binary is included in the npm distribution

2. **Add OpenCode as Wrangler dependency**:
   - Add `@jahands/wrangler-opencode` to Wrangler's package.json for production
   - Use `workspace:*` reference for local development
   - Switch between workspace and npm versions as needed

### Phase 2: Wrangler CLI Integration (Week 2-3)

#### Step 2.1: Add OpenCode Command Line Options

1. **Extend Wrangler CLI argument parser** to support:

   - `-p` / `--prompt` flag for launching OpenCode
   - Optional positional argument for direct questions
   - Interactive mode override option

2. **Add command handler** that:
   - Detects execution mode (interactive vs single prompt)
   - Imports OpenCode integration module dynamically
   - Passes parsed arguments to integration layer

#### Step 2.2: Create OpenCode Integration Module

**Purpose**: Bridge between Wrangler CLI and OpenCode packages

**Key Responsibilities**:

- **Context Gathering**: Collect Wrangler configuration and project metadata
- **Execution Mode Detection**: Route to appropriate OpenCode interface
- **Process Management**: Spawn and manage OpenCode processes
- **Error Handling**: Graceful degradation when OpenCode unavailable

**Integration Interfaces**:

- `launchOpenCode(args)` - Main entry point from CLI
- `gatherProjectContext()` - Collect Workers project context
- `runSinglePrompt()` - Execute single question mode
- `runInteractiveSession()` - Launch TUI mode

**Process Architecture**:

- Single prompt mode: Spawn Node.js process for OpenCode from npm package
- Interactive mode: Spawn Go binary distributed with `@jahands/wrangler-opencode`
- Context passing: Temporary files with JSON-serialized project data
- Asset resolution: Use `require.resolve()` to locate OpenCode binaries in node_modules

### Phase 3: Build System Integration (Week 3-4)

#### Step 3.1: Setup OpenCode Publishing

**Publishing Configuration**:

- Create build process for `@jahands/wrangler-opencode` package
- Include OpenCode packages in monorepo build dependency graph
- Ensure proper build ordering (OpenCode before publishing)
- Handle mixed language builds (TypeScript + Go)

**Key Changes**:

- Add OpenCode packages to Turbo task dependencies
- Create package-specific turbo.json files for custom build steps
- Configure Go build tasks for TUI package (macOS only for POC)
- Setup pkg.pr.new GitHub Actions workflow for publishing

#### Step 3.2: Wrangler Integration

**Dependency Resolution**:

- Wrangler imports OpenCode from `@jahands/wrangler-opencode` npm package
- Use `require.resolve()` to locate OpenCode binaries in node_modules
- Integration module spawns processes from published package
- No direct workspace references in Wrangler code

**Development Workflow**:

- **Local Development**: Use `workspace:*` dependency for immediate testing
- **Integration Testing**: Use pnpm commands to temporarily test published version
- **Production Releases**: Change to pinned npm version (e.g., `^0.1.0`)
- **Daily Development**: Use pnpm commands to avoid manual package.json editing

**Dependency Configuration**:

For development, use `workspace:*` in package.json:

```json
{
	"dependencies": {
		"@jahands/wrangler-opencode": "workspace:*"
	}
}
```

For production releases, change to pinned version:

```json
{
	"dependencies": {
		"@jahands/wrangler-opencode": "^0.1.0"
	}
}
```

**Switching Between Versions**:

```bash
# Local development (default) - uses workspace packages
pnpm install

# Test published package - temporarily overrides workspace
pnpm add @jahands/wrangler-opencode@latest --workspace=false

# Back to workspace version - restores workspace links
pnpm install
```

### Phase 4: Workers Context Integration (Week 4-5)

#### Step 4.1: Enhance Context Detection

**Configuration Detection**:

- Support all Wrangler configuration variants (wrangler.toml, wrangler.json, wrangler.jsonc)
- Parse and extract relevant project metadata
- Detect Workers runtime version and compatibility settings

**Binding Analysis**:

- Identify configured bindings (KV, D1, R2, Queues, etc.)
- Extract binding names and configuration details
- Categorize bindings by type for AI context

**Project Context Structure**:

```
{
  wranglerConfig: ParsedConfig,
  configFiles: string[],
  bindings: BindingsByType,
  projectRoot: string,
  workersRuntime: string
}
```

#### Step 4.2: Create Workers Knowledge Integration

**Documentation Integration**:

- Configure OpenCode to access Cloudflare Workers documentation
- Implement Workers-specific system prompts and knowledge base
- Enable real-time API reference lookup

**Context Enhancement**:

- Pass Workers project context to OpenCode via temporary files
- Enable AI to understand current project's binding configuration
- Provide Workers-specific code suggestions and best practices

## Build and Deployment

### pkg.pr.new GitHub Actions Setup

**Workflow Configuration**:

Create `.github/workflows/pkg-pr-new.yml`:

```yaml
name: Publish with pkg.pr.new

on:
  push:
    branches:
      - opencode
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --child-concurrency=10

      - name: Build (MacOS only)
        run: pnpm turbo build -F './packages/opencode/*' -F 'wrangler'

      - name: Publish to pkg.pr.new
        run: npx pkg-pr-new publish './packages/opencode/opencode' './packages/wrangler'
```

**Key Benefits**:

- Automatic preview releases on every PR
- Easy testing of integrated changes
- No manual npm publishing during development
- Simplified dependency management for testing

### Development Workflow

**Setup Process**:

1. Install dependencies across all packages (`pnpm install`)
2. Build OpenCode packages before Wrangler
3. Verify binary paths and permissions for Go TUI executable

**Development Modes**:

**Local Development** (using workspace):

```bash
# Wrangler uses workspace version of OpenCode
pnpm install  # Links workspace packages
pnpm build    # Builds OpenCode packages locally (macOS only)
wrangler -p   # Uses local OpenCode build
```

**Published Package Testing** (using pkg.pr.new):

```bash
# Install from pkg.pr.new preview release
pnpm add @jahands/wrangler-opencode@pr-123 --workspace=false
pnpm add @jahands/wrangler@pr-123 --workspace=false
wrangler -p   # Uses preview packages

# Switch back to workspace version
pnpm install  # Restores workspace links
```

**Testing Commands**:

- Interactive mode: `wrangler -p`
- Single prompt mode: `wrangler -p "question"`
- Verify context detection with sample Workers projects

### Testing Strategy

**Test Coverage Areas**:

1. **Unit Tests**: Integration module functions and context gathering
2. **Integration Tests**: CLI argument parsing and process spawning
3. **E2E Tests**: Full workflow with various Workers project configurations
4. **Platform Tests**: macOS compatibility (POC scope)

## Success Criteria

### Functional Requirements

- [ ] `wrangler -p` launches interactive OpenCode TUI
- [ ] `wrangler -p "question"` runs single prompt and returns answer
- [ ] OpenCode detects Wrangler configuration files (all variants)
- [ ] OpenCode understands Workers project context (bindings, runtime version)
- [ ] OpenCode dependency installs successfully on macOS
- [ ] pkg.pr.new publishing workflow functions correctly

### User Experience Requirements

- [ ] Seamless integration with existing Wrangler workflow
- [ ] Clear error messages when AI services unavailable
- [ ] Consistent CLI interface patterns
- [ ] Workers-specific guidance and suggestions

## Risk Mitigation

### Technical Risks

1. **Dependency Conflicts**: Manage OpenCode dependencies separately from workers-sdk catalog
2. **Publishing Complexity**: Use pkg.pr.new for simplified preview publishing
3. **Performance Impact**: Lazy load OpenCode components and optimize process spawning
4. **Platform Compatibility**: Focus on macOS compatibility for POC

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
5. pkg.pr.new publishing workflow is validated
6. Integration feels native to Wrangler CLI

This POC will serve as the foundation for production implementation and provide valuable insights for the full integration roadmap.
