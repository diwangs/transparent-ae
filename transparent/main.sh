#!/bin/sh

# Patch JS extractor
scripts/patch_codeql_extractor.sh

# Build Vue2, React, and Angular DB
pushd targets/vue2-src
yarn build
popd
pushd targets/angular-src
yarn build
popd

pushd packages/main
yarn exec ts-node main.ts
popd