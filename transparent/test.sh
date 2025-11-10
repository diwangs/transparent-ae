#!/bin/sh

PACKAGES="querygen utils template-mapping"

for PACKAGE in $PACKAGES; do
  pushd packages/$PACKAGE
  yarn test
  popd
done