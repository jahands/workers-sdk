# Justfile Usage for Wrangler/OpenCode Development

This document explains how to use the Justfile for efficient wrangler/opencode development.

## Prerequisites

- [just](https://github.com/casey/just) - Command runner
- Node.js 20+
- Go 1.21+ (for TUI builds)
- pnpm

Install just:
```bash
# macOS
brew install just

# Other platforms: https://github.com/casey/just#installation
```

## Quick Start

```bash
# Show all available commands
just --list

# First time setup
just setup

# Show common workflows
just help
```

## Common Development Workflows

### 🚀 First Time Setup
```bash
just setup
```
This will install dependencies, build OpenCode packages, build Wrangler, and verify the integration works.

### 🔄 Development Cycle
```bash
# Quick rebuild and test
just quick-test "your prompt here"

# Auto-rebuild on file changes (requires watchexec)
just watch
```

### 🧪 Testing Different Modes
```bash
# Test with a specific prompt
just test "Help me with Cloudflare Workers"

# Test interactive mode (no initial prompt)
just test-interactive

# Test in a Workers project context
just test-context my-project "Help me understand this project"
```

### 📦 Package Management
```bash
# Use workspace packages (for development)
just use-workspace

# Use published packages from a PR (for testing)
just use-published 123  # Uses packages from PR #123

# Check current package configuration
just info
```

### 🔍 Debugging and Status
```bash
# Check build status
just status

# Show package information
just info

# Show recent OpenCode logs
just logs
```

### 🏗️ Building
```bash
# Build everything
just build

# Build only OpenCode packages
just build-opencode

# Build only Wrangler
just build-wrangler

# Development build (faster, single platform)
just dev-build

# Clean all build artifacts
just clean
```

### 🧪 Testing with Workers Projects
```bash
# Create a test Workers project
just create-test-project my-test-worker

# Test OpenCode in the context of a Workers project
just test-context my-test-worker "Help me add a KV binding"
```

## Advanced Usage

### Watch Mode
If you have `watchexec` installed, you can use watch mode for automatic rebuilds:

```bash
# Install watchexec
brew install watchexec  # macOS
# or: cargo install watchexec-cli

# Start watch mode
just watch
```

This will automatically rebuild and test when you make changes to OpenCode or Wrangler source files.

### Package Switching for Testing
When testing published packages from pkg.pr.new:

```bash
# Switch to published packages from PR #123
just use-published 123

# Test the published packages
just test "test published version"

# Switch back to workspace packages
just use-workspace
```

### Creating Test Projects
The Justfile can create simple Workers projects for testing context detection:

```bash
# Create a basic Workers project
just create-test-project my-worker

# Test OpenCode with this project
just test-context my-worker "Help me add error handling"
```

Test projects are created in `test-projects/` and are ignored by git.

## Troubleshooting

### Build Issues
```bash
# Check what's built and what's missing
just status

# Clean and rebuild everything
just clean
just setup
```

### Integration Issues
```bash
# Check current package configuration
just info

# Make sure you're using workspace packages
just use-workspace

# Rebuild and test
just quick-test "test integration"
```

### OpenCode Not Launching
```bash
# Check if TUI binary exists
just status

# Rebuild OpenCode packages
just build-opencode

# Check logs for errors
just logs
```

## Tips

1. **Use `just help`** to see common workflows
2. **Use `just status`** to quickly check what's built
3. **Use `just quick-test`** for fast development cycles
4. **Use `just watch`** for automatic rebuilds during development
5. **Use test projects** to verify context detection works correctly

## Available Commands

Run `just --list` to see all available commands with descriptions.
