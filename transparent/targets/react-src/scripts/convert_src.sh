#!/usr/bin/env bash

TS_SRC_PATH=../../build/react-ts-src

# Prepare directory
mkdir -p "$TS_SRC_PATH"
cp -r react/packages/* "$TS_SRC_PATH"
rm -rf "$TS_SRC_PATH/react-devtools-extensions" "$TS_SRC_PATH/jest-react"

# Convert Flow to TypeScript
# Run this twice because the first run have errors
flow-to-ts $TS_SRC_PATH/**/*.js --write --delete-source --inline-utility-types 2>/dev/null
flow-to-ts $TS_SRC_PATH/**/*.js --write --delete-source --inline-utility-types 2>/dev/null

# CodeQL won't recognize TypeScript project without a tsconfig.json file
echo "{" > $TS_SRC_PATH/tsconfig.json
echo "  \"compilerOptions\": {" >> $TS_SRC_PATH/tsconfig.json
echo "    \"target\": \"ES2021\"," >> $TS_SRC_PATH/tsconfig.json
echo "    \"module\": \"ES2015\"" >> $TS_SRC_PATH/tsconfig.json
echo "  }" >> $TS_SRC_PATH/tsconfig.json
echo "}" >> $TS_SRC_PATH/tsconfig.json
# cp patch/tsconfig.json $TS_SRC_PATH