#!/usr/bin/env -S NIXPKGS_ALLOW_UNFREE=1 nix develop --impure --command bash

# Set up qlpack
pushd qlpacks/transparent
codeql pack install
popd

# Build Vue2, React, and Angular DB and install dependencies for tests
TARGETS="vue2-src react-src angular-src"
for TARGET in $TARGETS; do
  pushd targets/$TARGET
  yarn targetinstall
  popd
done