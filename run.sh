#!/bin/bash
set -e

cd "$(dirname "$0")"

WAILS=$(command -v wails || echo "$HOME/go/bin/wails")

if [ ! -x "$WAILS" ]; then
  echo "wails not found, installing..."
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  WAILS="$HOME/go/bin/wails"
fi

"$WAILS" dev
