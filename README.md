# TranSPArent Artifact Evaluation

[![DOI](https://zenodo.org/badge/1093523357.svg)](https://doi.org/10.5281/zenodo.17822391)

This repository contains the artifact accompanying the NDSS 26 paper titled "TranSPArent: Taint-style Vulnerability Detection in Generic Single-Page Applications through Automated Framework Abstraction".

The subsections below describe how to re-produce the core results of the paper: Table IV and Table V.

## Installing Dependencies
Before running any script, it is necessary to have the required software dependencies installed. 
Below we detail how to install all dependencies of the experiments on a generic Linux machine:
<details>
<summary>Pre-requisite: have Nix package manager installed with the `nix` CLI and 'flakes' feature enabled permanently</summary>

- Each Linux distribution might have idiomatically different ways of installing Nix and enabling relevant features. 
- To install, check your package manager or download Nix from upstream: [nixos.org](https://nixos.org/download/)
- Guide to enabling `nix` CLI and Flakes permanently on different distributions: [wiki.nixos.org](https://wiki.nixos.org/wiki/Flakes#Setup)

</details>

<details>
<summary>Pre-requisite: have Git with LFS plugin installed and initialized</summary>

- Git comes bundled with most Linux distribution.
- Each Linux distribution might have idiomatically different ways of installing Git LFS from their package manager.
- To install Git LFS, check your package manager: [github.com/git-lfs/git-lfs](https://github.com/git-lfs/git-lfs?utm_source=gitlfs_site&utm_medium=installation_link&utm_campaign=gitlfs#installing)
- To initialize Git LFS globally after installation, run `git lfs install`
- Technically, Git LFS is not strictly required, since we do initialize Git LFS local hooks (see `accuracy/install.sh`). Nonetheless, there are some cases where the repository itself fails to be cloned and run because an error in the Git global hooks. Installing Git LFS manually solves this issue.

</details>


After these pre-requisites have been fulfilled, run the following commands:
1. `git clone --recursive https://github.com/diwangs/transparent-ae`
2. `cd transparent-ae`
3. `./install.sh` (execution takes approximately 30 mins in Ryzen 7 7840U-based system)
    - This will install system, Node.js, and accuracy evaluation dependencies by executing the child `install.sh` script located in both `transparent` and `accuracy` directory
    - System dependencies (e.g., Java, CodeQL, Git LFS, Node.js) will be installed from nixpkgs.
    - Node dependencies will be installed from NPM.
    - Accuracy evaluation repositories will be downloaded from GitHub via Git LFS.

## Basic Test
1. `cd transparent`
2. `./test.sh`
3. If the script runs without error, it means the environment is (hopefully) ready

## Experiment 1: Automated Framework Abstraction (Table V)
In Experiment 1, TranSPArent is applied against Vue, React, and Angular source code to produce the intermediate SPA sinks (Table V) and CodeQL queries to analyze applications built on top of them.
In broad strokes, this experiment will:
- Prepare and convert Vue, React, and Angular source code (stored in `transparent/targets`) into CodeQL database format.
- Run the three successive analyses of TranSPArent (autostitch, taint path analysis, and template mapping; main TypeScript code is stored in `transparent/packages` and accompanying CodeQL queries are stored in `transparent/qlpacks`) against the CodeQL database to produce SPA sinks.
- Compile the found SPA sinks into Table V and synthesize CodeQL queries to be used in Experiment 2.

To run Experiment 1, follow these steps:
1. `cd transparent`
2. `./main.sh` (execution takes approximately 2 hours in Ryzen 7 7840U-based system)
3. Table V will be printed to `stdout` and the resulting queries will be written in `qlpack/transparentsinks`

## Experiment 2: Accuracy Evaluation (Table IV)
In Experiment 2, the SPA sinks that is found in Experiment 1 is used to analyze the two datasets (known vulnerability dataset and positive label GitHub dataset) for false negative rate (FNR) and false discovery rate (FDR) respectively.
In broad strokes, this experiment will:
- Run CodeQL with and without the synthesized queries in Experiment 1 against the known vulnerability dataset (located in `accuracy/fnr/repos.tar.gz`) and comparing it to the provided labels (located in `accuracy/fnr/labels`).
- Run CodeQL with and without the synthesized queries in Experiment 1 against the positive label GitHub dataset (located in `accuracy/fdr/repos.tar.gz`) and comparing it to the provided labels (located in `accuracy/fdr/labels`).
- Compile the FNR and FDR for Vanilla CodeQL (CodeQL without synthesized queries) and TranSPArent into Table IV.

To run Experiment 2, follow these steps after running Experiment 1:
1. `cd accuracy`
2. `./main.sh` (execution takes approximately 4 hours in Ryzen 7 7840U-based system)
3. Table IV will be printed to `stdout`