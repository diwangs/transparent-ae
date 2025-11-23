# TranSPArent Artifact Evaluation
This repository contains the artifact accompanying the paper titled "TranSPArent: Taint-style Vulnerability Detection in Generic Single-Page Applications through Automated Framework Abstraction".

The subsections below describe how to re-produce the core results of the paper: Table IV and Table V.

## Installing Dependencies
0. Pre-requisite: have Nix package manager installed with the `nix` CLI and 'flakes' feature enabled permanently
    - Each Linux distribution might have idiomatically different ways of installing Nix and enabling relevant features. 
    - To install, check your package manager or download Nix from upstream: [nixos.org](https://nixos.org/download/)
    - Guide to enabling `nix` CLI and Flakes permanently on different distributions: [wiki.nixos.org](https://wiki.nixos.org/wiki/Flakes#Setup)
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

## Automated Framework Abstraction (Table V)
1. `cd transparent`
2. `./main.sh` (execution takes approximately 2 hours in Ryzen 7 7840U-based system)
3. Table V will be printed to `stdout` and the resulting queries will be written in `qlpack/transparentsinks`

## Accuracy Evaluation (Table IV)
0. Pre-requisite: do Automated Framework Abstraction first to synthesize the necessary queries 
1. `cd accuracy`
2. `./main.sh` (execution takes approximately 4 hours in Ryzen 7 7840U-based system)
3. Table IV will be printed to `stdout`

---
---

## Reproducibility Details
- Uses versioned nixpkgs (nixpkgs-24.05 except CodeQL, which uses nixpkgs-25.05)
- Frozen lockfile
- Disabled corepack signature verification due to periodic NPM key rotation