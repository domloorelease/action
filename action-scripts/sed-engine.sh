#!/bin/bash
# ============================================
# Copyright 2026 SoTeen Studio
# Domloo Release Action
# ============================================
set -euo pipefail

if [ -n "$NEW_VERSION" ]; then
  if [ -f "package.json" ]; then
    sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/g" package.json
  fi
  if [ -f "Cargo.toml" ]; then
    sed -i "s/^version = \".*\"/version = \"$NEW_VERSION\"/g" Cargo.toml
    
    cargo check
  fi
fi