#!/bin/sh

mkdir -p ../../build/codeql-db
codeql database create \
    --language javascript \
    --source-root vue \
    --search-path ../../build \
    --overwrite ../../build/codeql-db/vue2-src