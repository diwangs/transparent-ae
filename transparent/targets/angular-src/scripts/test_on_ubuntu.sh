#!/bin/sh

# Angular uses Bazel but binaries downloaded through it is too difficult to
# run with NixOS. Thus, the simplest way to run Angular test in NixOS is to use 
# a container to run it on other distro (in this case, Ubuntu).
# We can't integrate this with the root `flake.nix` because it doesn't detect podman.

# Solution: for Angular, use a standalone terminal emulator instead of VSCode's.
# In NixOS, do this:
# `distrobox create -r -i ubuntu:24.04 ubuntu`
# `distrobox enter -r ubuntu -- scripts/test_on_ubuntu.sh`

cd ../angular

# sudo apt update
# sudo apt upgrade -y
# sudo apt install yarnpkg -y

yarn install
yarn test --cache_test_results=no //packages/core/test //packages/common/test
# yarn test //packages/compiler-cli/test/ngtsc