#!/bin/sh

# Short tests only just to do sanity check
PACKAGES="querygen utils template-mapping"

for PACKAGE in $PACKAGES; do
  cd packages/$PACKAGE
  yarn test
  cd ../..
done