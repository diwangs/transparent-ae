#!/usr/bin/env bash

mkdir -p ../../build/codeql-db
codeql database create \
    --language javascript \
    --source-root ../../build/react-ts-src \
    --search-path ../../build \
    --overwrite ../../build/codeql-db/react-ts-src