#!/bin/sh

pushd react
git apply ../patch/node-version-bump.patch
popd