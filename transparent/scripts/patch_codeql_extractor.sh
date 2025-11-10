#!/bin/sh

# !! DO NOT RUN DIRECTLY, RUN IT WITH YARN INSTEAD !!

# This script is used to patch CodeQL JS extractor to disable string truncation
# when a string is longer than 20 characters. Since the extractor can't be 
# built in isolation (despite some source being open), we need to update the 
# jar file directly. The script is only need to be run once per CodeQL install.
# i.e. if you update / reinstall CodeQL, you need to run this script again.
# Afterwards, specify `search-path` in your database creation

# see: https://stackoverflow.com/a/76336777

echo "Patching CodeQL extractor..."

OLD_EXTRACTOR_PATH=/nix/store/whvfczb8lz3f076m734v4p9hgc71x9my-codeql-2.21.1/codeql/javascript
NEW_EXTRACTOR_PATH=build/patched-js-extractor
SRC_DIR=scripts/extractor_patch

# Make a copy of the extractor to modify
mkdir -p build
cp -r "$OLD_EXTRACTOR_PATH" "$NEW_EXTRACTOR_PATH"
chmod -R 755 "$NEW_EXTRACTOR_PATH"

# Compile the modified extractor (assumed to use Java 17)
javac -cp "$OLD_EXTRACTOR_PATH/tools/extractor-javascript.jar" "$SRC_DIR/com/semmle/js/extractor/TextualExtractor.java"

# Replace the class file in the new jar
jar uf "$NEW_EXTRACTOR_PATH/tools/extractor-javascript.jar" -C "$SRC_DIR" "com/semmle/js/extractor/TextualExtractor.class"
