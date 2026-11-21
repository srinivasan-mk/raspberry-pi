#!/usr/bin/env bash
# ==============================================================================
# Cross-Cutting Concern: DNS Fallback & Resilience Validator
# Verifies DNS health and tests fallback resolver (1.1.1.1 / 8.8.8.8) to ensure
# cloud MQTT brokers remain reachable even if local Pi-hole is restarting.
# ==============================================================================
set -euo pipefail

BROKER_HOST="${1:-xxxxxx.emqxsl.com}"
FALLBACK_DNS="${2:-1.1.1.1}"

echo "============================================================"
echo "  DNS Resolution & Connectivity Resilience Test"
echo "============================================================"

# Test local resolver
echo -n "[*] Testing primary DNS resolution (127.0.0.1 / Pi-hole)... "
if dig +short +time=2 +tries=1 "${BROKER_HOST}" @127.0.0.1 >/dev/null 2>&1; then
    echo "SUCCESS (Pi-hole resolving)"
else
    echo "WARNING (Local Pi-hole not responding or domain unresolvable)"
    echo -n "[*] Testing fallback resolver (@${FALLBACK_DNS})... "
    if dig +short +time=2 +tries=1 "${BROKER_HOST}" @"${FALLBACK_DNS}" >/dev/null 2>&1; then
        echo "SUCCESS (Fallback resolver operational)"
    else
        echo "FAILED (No external DNS connectivity)"
    fi
fi
