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
- Publish both `@jahands/opencode-cf` and `@jahands/wrangler` packages to npm
- **POC Package Naming**: Rename wrangler to `@jahands/wrangler` for POC to avoid conflicts with official package
- Use standard npm publishing workflow for distribution

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

**npm Publishing**:

Use standard npm publishing workflow:

- Publish all 6 packages (1 main + 5 platform-specific) in coordinated releases
- Use existing prerelease workflow or manual publishing as needed
- Leverage existing CI/CD infrastructure for multi-platform builds

**Development Workflow**:

- **Local Development**: Use `workspace:*` dependency in Wrangler
- **Testing**: Switch between workspace and published packages using pnpm commands
- **Publishing**: Coordinated release of all platform packages to npm

**Reference Files to Copy/Adapt**:

- Publishing logic: `tmp/opencode/packages/opencode/script/publish.ts`
- Platform detection: `tmp/opencode/packages/opencode/script/postinstall.mjs`
- Shell wrapper: `tmp/opencode/packages/opencode/bin/opencode`
- Package structure: `tmp/opencode/packages/opencode/package.json` (optionalDependencies pattern)

#### Step 3.6: Auto Updater Customization

**Problem**: OpenCode includes an auto updater that automatically upgrades to the upstream `opencode-ai` package, which would replace our custom `@jahands/opencode-cf` package.

**Requirements**:

- Prevent auto updater from reverting to upstream `opencode-ai` package
- Maintain auto update functionality for POC packages
- Support standard package manager workflows (npm, pnpm, bun)

**Solution**: Update OpenCode's installation module to use custom package names (`@jahands/opencode-cf`) instead of upstream names (`opencode-ai`) in upgrade logic and package detection.

**Key Changes**:

- Modify upgrade commands to install `@jahands/opencode-cf` packages
- Update package detection to look for custom package names
- Configure version checking for POC release cycle

### Phase 4: UI Polish and Branding (Week 4)

#### Step 4.1: Update OpenCode Branding

**Problem**: Currently OpenCode displays "opencode" in the chat interface, but for the Wrangler integration we want it to show "Wrangler" with "Powered by OpenCode" in smaller text.

**Current UI**: The startup screen shows "OPENCODE" in large ASCII art with version number.

**Target UI Changes**:

- Replace "OPENCODE" branding with "WRANGLER" in the main display
- Add "Powered by OpenCode" subtitle in smaller text
- Maintain existing version display and command structure
- Preserve OpenCode functionality while updating visual branding

**Implementation Strategy**:

**UI Component Updates**:

- Modify TUI startup screen to display "WRANGLER" instead of "OPENCODE"
- Add subtitle text "Powered by OpenCode" below main branding
- Update any chat interface elements that show "opencode" to show "Wrangler"
- Maintain existing color scheme and layout structure

**Configuration Approach**:

- Add branding configuration options to OpenCode packages
- Allow customization of display name and subtitle text
- Pass branding configuration from Wrangler integration
- Ensure changes don't affect core OpenCode functionality

**Key Files to Modify**:

- TUI startup screen and branding components
- Chat interface display elements
- Any help text or about information that shows product name
- Configuration files that control UI text and branding

#### Step 4.2: Integration Testing

**Verification Steps**:

- Confirm "WRANGLER" appears in startup screen instead of "OPENCODE"
- Verify "Powered by OpenCode" subtitle is visible and properly formatted
- Test that all existing functionality remains intact
- Ensure branding changes apply consistently across all UI elements

**User Experience Validation**:

- Startup experience feels native to Wrangler ecosystem
- Branding clearly indicates this is Wrangler with OpenCode technology
- No confusion about which tool is being used
- Maintains professional appearance and usability

### Phase 5: Workers Context Integration (Week 5-6)

#### Step 5.1: Enhance Context Detection

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

#### Step 5.2: Implement Cloudflare Documentation Integration

**MCP Integration Approach**:

OpenCode has robust Model Context Protocol (MCP) support that allows integration of external tools and knowledge sources. We can leverage the official Cloudflare Docs MCP server to provide seamless documentation access.

**Implementation**:

- **Hard-code Cloudflare Docs MCP server**: Modify OpenCode's MCP initialization to always include the official Cloudflare Docs MCP server (`https://docs.mcp.cloudflare.com/sse`) as a built-in server
- **No user configuration required**: The MCP server will be automatically available without requiring users to configure anything
- **Automatic tool availability**: The `search_cloudflare_documentation` tool will be automatically available to the LLM alongside built-in tools
- **Seamless integration**: Documentation search becomes part of the natural conversation flow without explicit commands
- **Context-aware suggestions**: The AI can proactively search Cloudflare docs when discussing Workers, R2, D1, KV, or other Cloudflare services

#### Step 5.3: Implement Workers Context Passing

**Implementation**:

- Design Workers project context interface (config, bindings, runtime info)
- Extend existing Wrangler config parsing to extract comprehensive metadata
- Serialize context to temporary JSON file and pass via environment variable
- Sanitize sensitive data before passing to OpenCode

## Build and Deployment

### POC Package Naming Strategy

**Wrangler Package Renaming**:

For the POC, we will rename the wrangler package from `wrangler` to `@jahands/wrangler` to:

- **Avoid Conflicts**: Prevent conflicts with the official `wrangler` package on npm
- **Enable Testing**: Allow users to install and test the POC version alongside the official version
- **Simplify Publishing**: Use npm publishing without affecting the official package namespace
- **Clear Identification**: Make it obvious that this is a POC/experimental version

**Implementation**:

- Update `packages/wrangler/package.json` to use `"name": "@jahands/wrangler"`
- Maintain all existing functionality and CLI commands
- Publish to npm as `@jahands/wrangler`
- Users can install with: `npm install @jahands/wrangler`

### npm Publishing Setup

**Publishing Strategy**:

- Use standard npm publishing for both `@jahands/opencode-cf` and `@jahands/wrangler` packages
- Leverage existing prerelease workflow in `.github/workflows/prerelease.yml`
- Publish packages manually or via CI/CD as needed

**Key Benefits**:

- Standard npm distribution and installation
- No dependency on external preview services
- Direct control over package versions and releases
- Familiar npm ecosystem integration

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
wrangler -p   # Uses local OpenCode build (or @jahands/wrangler -p for POC)
```

**Published Package Testing** (using npm):

```bash
# Install from npm
pnpm add @jahands/opencode-cf --workspace=false
pnpm add @jahands/wrangler --workspace=false
wrangler -p   # Uses published packages

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
- [x] npm publishing workflow functions correctly

### User Experience Requirements

- [x] Seamless integration with existing Wrangler workflow
- [x] Clear error messages when AI services unavailable
- [x] Consistent CLI interface patterns
- [x] Workers-specific guidance and suggestions

## Risk Mitigation

### Technical Risks

1. **Dependency Conflicts**: Manage OpenCode dependencies separately from workers-sdk catalog
2. **Publishing Complexity**: Use standard npm publishing workflow
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
5. npm publishing workflow is validated
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

- **npm Publishing**: Leveraged existing prerelease workflow for automatic publishing
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

### Phase 4 Implementation (UI Polish and Branding)

#### UI Branding Updates

- **TUI Startup Screen**: Replaced "OPENCODE" ASCII art with "WRANGLER" ASCII art and added "Powered by OpenCode" subtitle
- **Status Bar**: Updated from "opencode" to "wrangler powered by opencode"
- **CLI Help Output**: Updated ASCII art to show "WRANGLER" with "Powered by OpenCode" subtitle

#### Technical Implementation

- **TUI Components**: Modified `packages/opencode/tui/internal/tui/tui.go` startup screen branding
- **Status Component**: Updated `packages/opencode/tui/internal/components/status/status.go` logo display
- **CLI Interface**: Modified `packages/opencode/opencode/src/cli/ui.ts` logo function and ASCII art

#### Testing Results

- ✅ CLI help displays "WRANGLER" ASCII art with "Powered by OpenCode" subtitle
- ✅ Wrangler integration launches OpenCode successfully with new branding
- ✅ Status bar shows updated "wrangler powered by opencode" text
- ✅ All existing functionality preserved while updating visual branding

## Status

✅ **Phase 4 Complete** - UI Polish and Branding implemented successfully. OpenCode now displays "WRANGLER" branding with "Powered by OpenCode" subtitle in startup screen, status bar, and CLI help. Ready for Phase 5 (Workers Context Integration).
