#!/bin/bash
set -e

# Build script for OpenCode TUI
# Adapted from the original opencode publish script for workers-sdk integration

VERSION=${1:-"0.0.0-dev"}
OUTPUT_DIR=${2:-"../opencode/dist"}
PLATFORM=${3:-$(uname -s | tr '[:upper:]' '[:lower:]')}
ARCH=${4:-$(uname -m)}

# Map platform names
case "$PLATFORM" in
    "darwin") GOOS="darwin" ;;
    "linux") GOOS="linux" ;;
    "windows"|"win32") GOOS="windows" ;;
    *) GOOS="$PLATFORM" ;;
esac

# Map architecture names
case "$ARCH" in
    "x86_64"|"amd64") GOARCH="amd64" ;;
    "aarch64"|"arm64") GOARCH="arm64" ;;
    "armv7l") GOARCH="arm" ;;
    *) GOARCH="$ARCH" ;;
esac

echo "Building OpenCode TUI for $GOOS/$GOARCH (version: $VERSION)"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build the TUI binary
CGO_ENABLED=0 GOOS="$GOOS" GOARCH="$GOARCH" go build \
    -ldflags="-s -w -X main.Version=$VERSION" \
    -o "$OUTPUT_DIR/tui" \
    ./cmd/opencode/main.go

echo "TUI binary built successfully: $OUTPUT_DIR/tui"
