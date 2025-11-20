#!/usr/bin/env bash

# Set up qlpack: define it here instead of `../install.sh` because it requires codeql
# pushd qlpacks/transparent
# codeql pack install
# popd

# Patch JS extractor
yarn patch

# Build Vue2, React, and Angular DB and install dependencies for tests
TARGETS="vue2-src react-src angular-src"
for TARGET in $TARGETS; do
  pushd targets/$TARGET
  yarn build
  # yarn targetinstall
  popd
done

# Do main processing
pushd packages/main
yarn exec ts-node main.ts
popd