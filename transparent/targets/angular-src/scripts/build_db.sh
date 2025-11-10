#!/bin/sh

mkdir -p ../../build/codeql-db
codeql database create \
    --language javascript \
    --source-root angular/packages \
    --search-path ../../build \
    --overwrite ../../build/codeql-db/angular-src