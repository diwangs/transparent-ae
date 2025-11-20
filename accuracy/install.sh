#!/usr/bin/env -S NIXPKGS_ALLOW_UNFREE=1 nix develop --impure --command bash

QLPACK_ROOT="../qlpack"

# Prepare qlpack
pushd $QLPACK_ROOT
codeql pack install
popd