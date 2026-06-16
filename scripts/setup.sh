#!/bin/bash
# Generates lumen-launch.command with the correct local path.
# Run automatically via `npm run setup` or `npm install`.

# Skip in CI environments
if [ "${CI}" = "true" ] || [ "${GITHUB_ACTIONS}" = "true" ]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE="$SCRIPT_DIR/lumen-launch.command.template"
OUTPUT="$PROJECT_DIR/lumen-launch.command"

if [ ! -f "$TEMPLATE" ]; then
  echo "setup: template not found at $TEMPLATE" >&2
  exit 1
fi

sed "s|__APP_DIR__|$PROJECT_DIR|g" "$TEMPLATE" > "$OUTPUT"
chmod +x "$OUTPUT"

echo ""
echo "  ✓ lumen-launch.command generated"
echo "    Path: $OUTPUT"
echo "    Copy it to your Desktop to launch Lumen with a double-click."
echo ""
