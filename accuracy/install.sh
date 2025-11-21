#!/usr/bin/env -S NIXPKGS_ALLOW_UNFREE=1 nix develop --impure --command bash

QLPACK_ROOT="../qlpack"

# Prepare repositories
git lfs pull
pushd fnr
tar xvzf repos.tar.gz
popd
pushd fdr
tar xvzf repos.tar.gz
popd

# Prepare qlpack
pushd $QLPACK_ROOT
codeql pack install
popd