#!/bin/bash
# Parses JS modules with macOS JavaScriptCore (no Node needed). Usage: scripts/check-syntax.sh [files...]
cd "$(dirname "$0")/.." || exit 1
if [ $# -eq 0 ]; then set -- $(find src -name '*.js'); fi
osascript -l JavaScript scripts/check-syntax.jxa.js "$@"
