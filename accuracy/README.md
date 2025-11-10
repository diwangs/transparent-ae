# FNR
- `repos` is the __Known Vulnerability Dataset__
- `labels` contains the CVE and GHSA vulnerability label
- `repos` contains the Git repositories

# FDR
- `repos` is the __Positive Label GitHub Dataset__
- `labels` contains a vulnerability in a given repo
- `samples` contains the sample of alerts that TranSPArent and Vanilla CodeQL produces
  - This will be verified against the actual output

# Scripts
- `verify_fdr_sample.js` used to verify whether samples appear in the output and print an error if it is not
- `calculate.js` used to calculate Table IV