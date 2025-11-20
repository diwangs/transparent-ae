#!/usr/bin/env bash

pushd react
git apply ../patch/node-version-bump.patch
popd