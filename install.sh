#!/usr/bin/env bash
pushd transparent
# NIXPKGS_ALLOW_UNFREE=1 nix develop --impure --install
./install.sh
popd
pushd accuracy
# NIXPKGS_ALLOW_UNFREE=1 nix develop --impure --install
./install.sh
popd