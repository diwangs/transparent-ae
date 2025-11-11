#!/bin/sh

# Patch JS extractor
yarn patch

# Build Vue2, React, and Angular DB
TARGETS="vue2-src react-src angular-src"
for TARGET in $TARGETS; do
  pushd targets/$TARGET
  yarn build
  popd
done

# Do main processing
pushd packages/main
yarn exec ts-node main.ts
popd