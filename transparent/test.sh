#!/usr/bin/env -S NIXPKGS_ALLOW_UNFREE=1 nix develop --impure --command bash

# Short tests only just to do sanity check
PACKAGES="querygen utils template-mapping"

for PACKAGE in $PACKAGES; do
  cd packages/$PACKAGE
  yarn test
  cd ../..
done