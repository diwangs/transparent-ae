#!/usr/bin/env -S NIXPKGS_ALLOW_UNFREE=1 nix develop --impure --command bash

QLPACK_ROOT="../qlpack"

# Process for FNR
mkdir -p fnr/build
for dir in fnr/repos/*/; do 
  repo_name=$(basename $dir)

  # Create DB
  codeql database create --language javascript --source-root fnr/repos/$repo_name --overwrite fnr/build/${repo_name}_db

  # Run both queries
  codeql query run --database fnr/build/${repo_name}_db --output fnr/build/${repo_name}_b.bqrs $QLPACK_ROOT/Baseline.ql
  codeql query run --database fnr/build/${repo_name}_db --output fnr/build/${repo_name}_t.bqrs $QLPACK_ROOT/TranSPArent.ql

  # Decode BQRS
  codeql bqrs decode --format=json fnr/build/${repo_name}_b.bqrs > fnr/build/${repo_name}_b.json
  codeql bqrs decode --format=json fnr/build/${repo_name}_t.bqrs > fnr/build/${repo_name}_t.json

  # Delete intermediate files to save space
  rm -rf fnr/build/${repo_name}_db
  rm fnr/build/${repo_name}_b.bqrs
  rm fnr/build/${repo_name}_t.bqrs
done

# Process for FDR
mkdir -p fdr/build
for dir in fdr/repos/*/; do
  repo_name=$(basename $dir)

  # Create DB
  codeql database create --language javascript --source-root fdr/repos/$repo_name --overwrite fdr/build/${repo_name}_db

  # Run both queries
  codeql query run --database fdr/build/${repo_name}_db --output fdr/build/${repo_name}_b.bqrs $QLPACK_ROOT/Baseline.ql
  codeql query run --database fdr/build/${repo_name}_db --output fdr/build/${repo_name}_t.bqrs $QLPACK_ROOT/TranSPArent.ql

  # Decode BQRS
  codeql bqrs decode --format=json fdr/build/${repo_name}_b.bqrs > fdr/build/${repo_name}_b.json
  codeql bqrs decode --format=json fdr/build/${repo_name}_t.bqrs > fdr/build/${repo_name}_t.json

  # Delete intermediate files to save space
  rm -rf fdr/build/${repo_name}_db
  rm fdr/build/${repo_name}_b.bqrs
  rm fdr/build/${repo_name}_t.bqrs
done

# Verify FDR samples and calculate results
pushd scripts
node ./verify_fdr_sample.js
node ./calculate.js
popd
