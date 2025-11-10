#!/bin/sh

mkdir -p ../../build/codeql-db
codeql database create \
    --language javascript \
    --source-root react/packages \
    --search-path ../../build \
    --overwrite ../../build/codeql-db/react-src