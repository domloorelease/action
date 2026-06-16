#!/bin/bash

set -e

if [ -f "package.json" ]; then
  sed -i "s/\"version\": \".*\"/\"version\": \"${{ env.NEW_VERSION }}\"/g" package.json
fi
if [ -f "Cargo.toml" ]; then
  sed -i "s/^version = \".*\"/version = \"${{ env.NEW_VERSION }}\"/g" Cargo.toml
fi