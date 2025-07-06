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

2. **Preserve existing OpenCode dependency versions** to avoid conflicts:
   - Keep OpenCode packages' existing package.json files unchanged
   - Avoid integrating with workers-sdk catalog system for POC
   - Let OpenCode packages maintain their own dependency versions

#### Step 1.3: Resolve Package Dependencies

**Dependency Strategy for POC**:

- **Preserve OpenCode versions**: Keep existing package.json files as-is
- **Avoid catalog integration**: Skip workers-sdk catalog system to prevent version conflicts
- **Isolate dependencies**: Let OpenCode packages use their proven dependency versions
- **Handle Go modules**: Keep existing go.mod structure unchanged

**Rationale**: Minimizes integration complexity and reduces risk of dependency conflicts during POC development

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

- Single prompt mode: Spawn Node.js process for core OpenCode package
- Interactive mode: Spawn Go binary for TUI package
- Context passing: Environment variables with JSON-serialized project data

### Phase 3: Build System Integration (Week 3-4)

#### Step 3.1: Update Build Configuration

**Dependency Management Strategy**:

- Keep OpenCode packages as external dependencies for POC simplicity
- Preserve OpenCode's existing dependency versions (no catalog integration)
- Avoid bundling OpenCode to minimize build complexity
- Let each OpenCode package manage its own node_modules

**Key Changes**:

- Update `EXTERNAL_DEPENDENCIES` to exclude OpenCode from bundling
- Add workspace dependency reference: `"opencode": "workspace:*"`
- Ensure build process can locate OpenCode binaries at runtime
- No changes to OpenCode package.json files (preserve existing versions)

#### Step 3.2: Update Turbo Configuration

**Build Pipeline Integration**:

- Include OpenCode packages in monorepo build dependency graph
- Ensure proper build ordering (OpenCode before Wrangler)
- Handle mixed language builds (TypeScript + Go)

**Configuration Updates**:

- Add OpenCode packages to Turbo task dependencies
- Create package-specific turbo.json files for custom build steps
- Configure Go build tasks for TUI package

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

- Pass Workers project context to OpenCode via environment variables
- Enable AI to understand current project's binding configuration
- Provide Workers-specific code suggestions and best practices

## Build and Deployment

### Development Workflow

**Setup Process**:

1. Install dependencies across all packages (`pnpm install`)
2. Build OpenCode packages before Wrangler
3. Verify binary paths and permissions for Go TUI executable

**Testing Commands**:

- Interactive mode: `wrangler -p`
- Single prompt mode: `wrangler -p "question"`
- Verify context detection with sample Workers projects

### Testing Strategy

**Test Coverage Areas**:

1. **Unit Tests**: Integration module functions and context gathering
2. **Integration Tests**: CLI argument parsing and process spawning
3. **E2E Tests**: Full workflow with various Workers project configurations
4. **Cross-Platform Tests**: Windows, macOS, Linux compatibility

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
