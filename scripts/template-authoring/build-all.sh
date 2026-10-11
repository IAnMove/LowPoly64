#!/bin/bash
# Regenerates every non-carve-out template from the pinned source, then verifies.
# usage: build-all.sh [--no-render]   (character ids redesigned by characters.mjs are skipped by the polish step)
set -e
cd /home/ina/LowPoly64
A=scripts/template-authoring
for s in nature furniture props effects food arch gaming monsters monsters-cm; do node $A/$s.mjs > /dev/null; echo "ok $s"; done
node $A/reparent.mjs > /dev/null && echo "ok reparent"
REDESIGNED=$( [ -f $A/characters.mjs ] && node $A/characters.mjs --list || true )
[ -f $A/characters.mjs ] && node $A/characters.mjs > /dev/null && echo "ok characters"
node $A/characters-polish.mjs $REDESIGNED > /dev/null && echo "ok characters-polish"
node $A/lint.mjs | grep -E "dup|missing|ARRAY|unknown|tris" || true
node scripts/template-asset-audit.mjs | tail -1
[ "$1" = "--no-render" ] || $A/sheets.sh
