# Wrangler OpenCode Integration POC - Technical Implementation Specification

## Overview

This document provides detailed technical implementation guidance for integrating OpenCode AI assistant functionality into Wrangler CLI as a Proof of Concept (POC). The POC focuses on demonstrating feasibility and user experience rather than long-term optimization.

## Architecture Overview

### Integration Strategy

**Integration Strategy**: Develop OpenCode packages within workers-sdk monorepo, then publish as `@jahands/opencode-cf` and use as dependency in Wrangler.

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
- Publish both `@jahands/opencode-cf` and `@jahands/wrangler` packages via pkg.pr.new
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
   # Copy base TypeScript configuration
   cp /path/to/opencode/tsconfig.json packages/opencode/tsconfig.base.json
   ```

   **Note**: Skip `bunfig.toml` as we use pnpm for dependency management instead of Bun.

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

2. **Use pnpm for dependency management**:
   - Keep OpenCode packages' existing package.json files unchanged
   - Use pnpm instead of Bun for consistent tooling across the monorepo
   - Avoid integrating with workers-sdk catalog system for POC
   - Let pnpm resolve and manage all OpenCode dependencies via standard package.json files

#### Step 1.3: Setup Publishing and Dependency

1. **Prepare OpenCode for publishing**:

   - Configure build process to create `@jahands/opencode-cf` package
   - Include all necessary binaries and assets in published package
   - Ensure Go TUI binary is included in the npm distribution

2. **Add OpenCode as Wrangler dependency**:
   - Add `@jahands/opencode-cf` to Wrangler's package.json for production
   - Use `workspace:*` reference for local development
   - Switch between workspace and npm versions as needed

### Phase 2: Wrangler CLI Integration (Week 2-3)

#### Step 2.1: Add OpenCode Command Line Options

1. **Extend Wrangler CLI argument parser** to support:

   - `-p` / `--prompt` flag for launching OpenCode
   - Optional positional argument for initial messages
   - Both modes launch interactive OpenCode TUI

2. **Add command handler** that:
   - Launches interactive OpenCode TUI for both `-p` and `-p <prompt>`
   - Automatically sends prompt when provided
   - Imports OpenCode integration module dynamically
   - Passes parsed arguments to integration layer

#### Step 2.2: Create OpenCode Integration Module

**Purpose**: Bridge between Wrangler CLI and OpenCode packages

**Key Responsibilities**:

- **Context Gathering**: Collect Wrangler configuration and project metadata
- **Interactive Session Management**: Launch OpenCode TUI for both modes
- **Process Management**: Spawn and manage OpenCode processes
- **Error Handling**: Graceful degradation when OpenCode unavailable

**Integration Interfaces**:

- `launchOpenCode(args)` - Main entry point from CLI
- `gatherProjectContext()` - Collect Workers project context
- `runInteractiveSession(initialPrompt?)` - Launch TUI mode with optional initial message

**Process Architecture**:

- Both modes: Spawn Go binary distributed with `@jahands/opencode-cf` for interactive TUI
- Initial prompt: Pass prompt to OpenCode which automatically sends it after launch
- Context passing: Temporary files with JSON-serialized project data
- Asset resolution: Use `require.resolve()` to locate OpenCode binaries in node_modules

### Phase 3: Multi-Platform Build System Integration (Week 3-5)

#### Step 3.1: Multi-Platform Build Architecture

**Build Complexity Overview**:

OpenCode requires a sophisticated multi-platform build system due to its dual TypeScript/Go architecture. We need to adapt the existing opencode build patterns from `tmp/opencode/packages/opencode/script/publish.ts` for the workers-sdk monorepo.

**Key Components to Adapt**:

- **Platform Matrix**: Support 5 platforms (linux-arm64, linux-x64, darwin-arm64, darwin-x64, windows-x64)
- **Dual Build Process**: Go TUI cross-compilation + TypeScript compilation with embedded binaries
- **Distribution Strategy**: Platform-specific npm packages with optional dependencies pattern
- **Binary Resolution**: Shell wrapper and postinstall scripts for platform detection

**Reference Implementation**:

- Build logic: `tmp/opencode/packages/opencode/script/publish.ts` (lines 22-63)
- Platform detection: `tmp/opencode/packages/opencode/script/postinstall.mjs`
- Shell wrapper: `tmp/opencode/packages/opencode/bin/opencode`

#### Step 3.2: Build Process Integration

**Go TUI Build Setup**:

Adapt the Go cross-compilation process from opencode's publish script:

- Copy build logic from `tmp/opencode/packages/opencode/script/publish.ts` lines 42-47
- Create build script in `packages/opencode/tui/scripts/` following the CGO_ENABLED=0 pattern
- Support all 5 target platforms with proper GOOS/GOARCH mapping

**TypeScript Build with Embedded Binaries**:

Implement the Bun compilation pattern from opencode:

- Follow `tmp/opencode/packages/opencode/script/publish.ts` lines 46-47 for bun build command
- Embed TUI binary using the `--compile` flag with embedded files
- Generate platform-specific packages following the naming pattern `@jahands/opencode-cf-{platform}-{arch}`

#### Step 3.3: Distribution Package Structure

**Wrapper Package Pattern**:

Implement the opencode distribution strategy:

- **Main Package**: `@jahands/opencode-cf` (wrapper with platform detection)
- **Platform Packages**: `@jahands/opencode-cf-{platform}-{arch}` (contains binaries)
- **Optional Dependencies**: Platform packages as optional dependencies in main package

**Platform Detection Scripts**:

Copy and adapt from opencode:

- **Postinstall Script**: Adapt `tmp/opencode/packages/opencode/script/postinstall.mjs` for our package naming
- **Shell Wrapper**: Adapt `tmp/opencode/packages/opencode/bin/opencode` for platform detection and binary resolution
- **Binary Linking**: Symlink creation pattern for cross-platform compatibility

#### Step 3.4: Monorepo Build Integration

**Turbo Configuration**:

Integrate OpenCode builds into the existing turbo pipeline:

- Add Go build tasks with proper dependency ordering
- Configure build caching for TypeScript components (cache Go builds as needed)
- Ensure proper build sequence: TUI → OpenCode → Wrangler

**Development vs Production Builds**:

- **Development**: Single-platform builds for faster iteration
- **Production**: Full multi-platform builds for publishing
- **CI/CD**: Automated builds using the opencode publishing pattern

#### Step 3.5: Publishing Strategy

**pkg.pr.new Integration**:

Adapt the opencode publishing workflow for pkg.pr.new:

- Publish all 6 packages (1 main + 5 platform-specific) in coordinated releases
- Update GitHub Actions to handle multi-platform builds
- Add Go toolchain setup to CI pipeline

**Development Workflow**:

- **Local Development**: Use `workspace:*` dependency in Wrangler
- **Testing**: Switch between workspace and published packages using pnpm commands
- **Publishing**: Coordinated release of all platform packages

**Reference Files to Copy/Adapt**:

- Publishing logic: `tmp/opencode/packages/opencode/script/publish.ts`
- Platform detection: `tmp/opencode/packages/opencode/script/postinstall.mjs`
- Shell wrapper: `tmp/opencode/packages/opencode/bin/opencode`
- Package structure: `tmp/opencode/packages/opencode/package.json` (optionalDependencies pattern)

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
pnpm add @jahands/opencode-cf@pr-123 --workspace=false
pnpm add @jahands/wrangler@pr-123 --workspace=false
wrangler -p   # Uses preview packages

# Switch back to workspace version
pnpm install  # Restores workspace links
```

**Testing Commands**:

- Interactive mode: `wrangler -p`
- Interactive mode with initial message: `wrangler -p "question"`
- Verify context detection with sample Workers projects

## Success Criteria

### Functional Requirements

- [x] `wrangler -p` launches interactive OpenCode TUI
- [x] `wrangler -p "question"` launches interactive OpenCode TUI and automatically sends the question
- [x] OpenCode detects Wrangler configuration files (all variants)
- [x] OpenCode understands Workers project context (bindings, runtime version)
- [x] OpenCode dependency installs successfully on macOS
- [x] pkg.pr.new publishing workflow functions correctly

### User Experience Requirements

- [x] Seamless integration with existing Wrangler workflow
- [x] Clear error messages when AI services unavailable
- [x] Consistent CLI interface patterns
- [x] Workers-specific guidance and suggestions

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

## Implementation Status

### Completed Features (Updated Requirements)

The implementation has been updated to meet the new requirements where both `wrangler -p` and `wrangler -p <prompt>` launch OpenCode interactively:

#### Core Integration

- **Interactive Mode**: `wrangler -p` launches OpenCode TUI successfully
- **Interactive Mode with Initial Prompt**: `wrangler -p "question"` launches OpenCode TUI and automatically sends the question
- **Context Detection**: Successfully detects and parses wrangler.jsonc, wrangler.json, and wrangler.toml files
- **Binding Analysis**: Correctly identifies D1 databases, Durable Objects, KV namespaces, and other Workers bindings
- **Environment Variable Communication**: Uses `OPENCODE_INITIAL_PROMPT` to pass initial prompts to the TUI

#### Technical Implementation

- **Unified Architecture**: Both modes use the same interactive TUI process, eliminating the previous single-prompt mode
- **Dynamic Loading**: OpenCode integration is loaded only when needed, maintaining Wrangler performance
- **Workspace Development**: Uses `workspace:*` dependency for seamless local development
- **Error Handling**: Graceful degradation when OpenCode is unavailable

#### Testing Results

- ✅ Basic interactive mode works across different Workers projects
- ✅ Initial prompt mode correctly passes and sends prompts automatically
- ✅ Context detection works with various binding types (D1, Durable Objects, KV)
- ✅ Integration maintains existing Wrangler CLI patterns and performance

### Phase 3 Implementation (Multi-Platform Build System Integration)

#### Build System Architecture

- **Multi-Platform Build Scripts**: Adapted publish.ts for workers-sdk monorepo with @jahands/opencode-cf package naming
- **Go TUI Cross-Compilation**: Created build.sh script for TUI binary builds with proper GOOS/GOARCH mapping
- **TypeScript Compilation**: Integrated Bun compilation with embedded TUI binaries for platform-specific packages
- **Development vs Production**: Added --dev flag for single-platform builds during development

#### Turbo Pipeline Integration

- **Build Dependencies**: Configured proper build ordering (TUI → OpenCode → Wrangler)
- **Caching Strategy**: Enabled build caching for both Go and TypeScript components
- **Package Management**: Added package.json for TUI to enable turbo management
- **Build Commands**: Integrated into existing turbo build pipeline

#### Publishing Infrastructure

- **pkg.pr.new Integration**: Leveraged existing prerelease workflow for automatic publishing
- **Prerelease Configuration**: Added prerelease flags to OpenCode package.json
- **GitHub Actions**: Enhanced prerelease workflow with Go setup for TUI builds
- **Branch Triggers**: Added opencode branch to prerelease workflow triggers

#### Package Distribution

- **Main Package**: @jahands/opencode-cf with platform detection and optional dependencies
- **Platform Packages**: @jahands/opencode-cf-{platform}-{arch} with compiled binaries
- **Workspace Development**: Uses workspace:\* dependency for seamless local development
- **Package Switching**: Created helper script for testing published vs workspace packages

#### Testing Results

- ✅ TUI builds successfully for current platform (darwin/arm64)
- ✅ OpenCode package builds with embedded TUI binary
- ✅ Wrangler builds successfully with OpenCode dependency
- ✅ Integration test passes: `wrangler -p "test integration"` launches OpenCode TUI
- ✅ Turbo pipeline respects build dependencies and caching

## Status

✅ **Phase 3 Complete** - Multi-platform build system integrated, pkg.pr.new publishing configured, all build and integration tests passing. Ready for Phase 4 (Workers Context Integration).
