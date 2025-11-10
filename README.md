# TranSPArent Artifact Evaluation
- Install -> `./install.sh`

## Basic Test (run unit test)
1. `cd transparent`
2. `NIXPKGS_ALLOW_UNFREE=1 nix develop --impure`
3. `./test.sh`
4. `exit`
  - This will exit the current Nix environment

## Framework Abstraction
1. `cd transparent`
2. `NIXPKGS_ALLOW_UNFREE=1 nix develop --impure`
3. `./main.sh`
  - Table V will be printed in the `stdout`
4. `exit`
  - This will exit the current Nix environment

## Accuracy Evaluation (do this after Framework Abstraction)
1. `cd accuracy`
2. `NIXPKGS_ALLOW_UNFREE=1 nix develop --impure`
3. `./main.sh`
  - Table IV will be printed in the `stdout`
3. `exit`
  - This will exit the current Nix environment