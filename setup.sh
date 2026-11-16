#!/usr/bin/env bash
# Convenience wrapper for Raspberry Pi setup
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
chmod +x "$DIR/scripts/setup-pi.sh"
exec "$DIR/scripts/setup-pi.sh" "$@"
