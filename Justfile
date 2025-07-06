# Justfile for wrangler/opencode development
#
# This Justfile provides convenient commands for developing the OpenCode integration
# with Wrangler. It simplifies common tasks like building, testing, and switching
# between workspace and published packages.
#
# Prerequisites:
# - just (https://github.com/casey/just)
# - Node.js 20+
# - Go 1.21+ (for TUI builds)
# - pnpm
#
# Quick start:
#   just setup     # First time setup
#   just help      # Show development workflows
#   just --list    # Show all available commands

# Default recipe - show help
default:
    @just --list

# Install dependencies
install:
    pnpm install --child-concurrency=10

# Build all packages
build:
    pnpm turbo build

# Build only OpenCode packages
build-opencode:
    pnpm turbo build --filter=opencode

# Build only Wrangler
build-wrangler:
    pnpm turbo build --filter=wrangler

# Build TUI binary only
build-tui:
    pnpm turbo build:tui --filter=opencode-tui

# Clean all build artifacts
clean:
    rm -rf packages/opencode/opencode/dist
    rm -rf packages/wrangler/wrangler-dist
    pnpm turbo clean

# Development build (single platform, faster)
dev-build:
    cd packages/opencode/opencode && bun run script/publish.ts --dev

# Test the integration with a simple prompt
test prompt="Hello OpenCode":
    cd packages/wrangler && node wrangler-dist/cli.js -p "{{prompt}}"

# Test interactive mode (no prompt)
test-interactive:
    cd packages/wrangler && node wrangler-dist/cli.js -p

# Switch to workspace packages for development
use-workspace:
    ./scripts/opencode-package-switch.sh workspace

# Switch to published packages for testing (requires PR number)
use-published pr:
    ./scripts/opencode-package-switch.sh published {{pr}}

# Run type checking
typecheck:
    pnpm turbo typecheck

# Run linting
lint:
    pnpm turbo check:lint

# Format code
format:
    pnpm run check:format

# Full development setup (install + build + test)
setup:
    @echo "🚀 Setting up wrangler/opencode development environment..."
    just install
    just build-opencode
    just build-wrangler
    @echo "✅ Setup complete! Test with: just test"

# Quick rebuild and test cycle
quick-test prompt="test":
    @echo "🔄 Quick rebuild and test..."
    just dev-build
    just build-wrangler
    just test "{{prompt}}"

# Watch mode for development (requires watchexec)
watch:
    watchexec -w packages/opencode -w packages/wrangler --ignore "*/dist/*" --ignore "*/node_modules/*" -- just quick-test

# Show OpenCode package info
info:
    @echo "📦 OpenCode Package Information:"
    @echo "Workspace packages:"
    @ls -la packages/opencode/
    @echo ""
    @echo "Built packages:"
    @ls -la packages/opencode/opencode/dist/ 2>/dev/null || echo "No built packages found. Run 'just build-opencode' first."
    @echo ""
    @echo "Current Wrangler dependency:"
    @grep -A1 -B1 '"opencode"' packages/wrangler/package.json || echo "OpenCode dependency not found"

# Show build status
status:
    @echo "🔍 Build Status:"
    @echo "TUI binary:"
    @ls -la packages/opencode/opencode/dist/tui 2>/dev/null && echo "✅ TUI built" || echo "❌ TUI not built"
    @echo "OpenCode packages:"
    @ls -la packages/opencode/opencode/dist/@jahands/ 2>/dev/null && echo "✅ OpenCode packages built" || echo "❌ OpenCode packages not built"
    @echo "Wrangler CLI:"
    @ls -la packages/wrangler/wrangler-dist/cli.js 2>/dev/null && echo "✅ Wrangler built" || echo "❌ Wrangler not built"

# Create a test Workers project for context testing
create-test-project name="test-worker":
    mkdir -p test-projects/{{name}}
    cd test-projects/{{name}} && echo 'export default { fetch() { return new Response("Hello World!"); } }' > index.js
    cd test-projects/{{name}} && echo 'name = "{{name}}"' > wrangler.toml
    cd test-projects/{{name}} && echo 'main = "index.js"' >> wrangler.toml
    @echo "✅ Created test project at test-projects/{{name}}"

# Test OpenCode in a Workers project context
test-context project="test-worker" prompt="Help me with this Workers project":
    @if [ ! -d "test-projects/{{project}}" ]; then just create-test-project {{project}}; fi
    cd test-projects/{{project}} && node ../../packages/wrangler/wrangler-dist/cli.js -p "{{prompt}}"

# Show logs from the last OpenCode run
logs:
    @echo "📋 Recent OpenCode logs (if any):"
    @tail -n 20 ~/.local/share/opencode/logs/*.log 2>/dev/null || echo "No logs found"

# Publish packages to pkg.pr.new (for testing)
publish-preview:
    @echo "📦 Publishing preview packages..."
    @echo "This will trigger the prerelease workflow on push to opencode branch"
    git push origin opencode

# Show help for common development workflows
help:
    @echo "🛠️  Common Development Workflows:"
    @echo ""
    @echo "First time setup:"
    @echo "  just setup"
    @echo ""
    @echo "Development cycle:"
    @echo "  just quick-test 'your prompt here'"
    @echo "  just watch  # Auto-rebuild on changes"
    @echo ""
    @echo "Testing different modes:"
    @echo "  just test 'prompt with message'"
    @echo "  just test-interactive"
    @echo "  just test-context my-project 'help with this project'"
    @echo ""
    @echo "Package management:"
    @echo "  just use-workspace     # Use local packages"
    @echo "  just use-published 123 # Use packages from PR #123"
    @echo ""
    @echo "Debugging:"
    @echo "  just status  # Check build status"
    @echo "  just info    # Show package info"
    @echo "  just logs    # Show recent logs"
