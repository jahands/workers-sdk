#!/bin/bash
set -e

# Helper script to switch between workspace and published OpenCode packages
# Usage: ./scripts/opencode-package-switch.sh [workspace|published] [pr-number]

MODE=${1:-"workspace"}
PR_NUMBER=${2:-""}

if [ "$MODE" = "workspace" ]; then
    echo "Switching to workspace packages..."
    cd packages/wrangler
    
    # Update package.json to use workspace version
    if command -v jq >/dev/null 2>&1; then
        jq '.dependencies.opencode = "workspace:*"' package.json > package.json.tmp && mv package.json.tmp package.json
        echo "Updated Wrangler to use workspace:* for opencode"
    else
        echo "jq not found. Please manually update packages/wrangler/package.json:"
        echo '  "opencode": "workspace:*"'
    fi
    
    cd ../..
    pnpm install
    echo "✅ Switched to workspace packages. Run 'pnpm turbo build --filter=opencode' to build locally."
    
elif [ "$MODE" = "published" ]; then
    if [ -z "$PR_NUMBER" ]; then
        echo "Error: PR number required for published mode"
        echo "Usage: $0 published <pr-number>"
        exit 1
    fi
    
    echo "Switching to published packages from PR #$PR_NUMBER..."
    cd packages/wrangler
    
    # Update package.json to use published version
    if command -v jq >/dev/null 2>&1; then
        jq ".dependencies.opencode = \"@jahands/opencode-cf@pr-$PR_NUMBER\"" package.json > package.json.tmp && mv package.json.tmp package.json
        echo "Updated Wrangler to use @jahands/opencode-cf@pr-$PR_NUMBER"
    else
        echo "jq not found. Please manually update packages/wrangler/package.json:"
        echo "  \"opencode\": \"@jahands/opencode-cf@pr-$PR_NUMBER\""
    fi
    
    cd ../..
    pnpm install --workspace=false
    echo "✅ Switched to published packages from PR #$PR_NUMBER"
    
else
    echo "Usage: $0 [workspace|published] [pr-number]"
    echo ""
    echo "Examples:"
    echo "  $0 workspace                    # Switch to workspace packages"
    echo "  $0 published 123               # Switch to published packages from PR #123"
    exit 1
fi

echo ""
echo "Test the integration with:"
echo "  wrangler -p \"test question\""
