# Note: 
# - Because CodeQL has a license that is not considered "free", we need to add
#       the `NIXPKGS_ALLOW_UNFREE=1` env for Nix operations.
# - We also need to specify `--impure` flag due to it, because we use the newer
#       `nix` command instead of `nix-shell` or `nix-build`.
{
    description = "TranSPArent";

    inputs = {
        nixpkgs.url = "nixpkgs/nixos-24.05";
        nixpkgs-2505.url = "nixpkgs/nixos-25.05";
        flake-utils.url = "github:numtide/flake-utils";
    };

    outputs = { self, nixpkgs, nixpkgs-2505, flake-utils }: flake-utils.lib.eachDefaultSystem (system: 
        let
            pkgs = import nixpkgs { inherit system; };
            pkgs-2505 = import nixpkgs-2505 { inherit system; };
        in rec {
            # For development
            devShells.default = pkgs.mkShell {
                name = "transparent";
                src = self;
                buildInputs = with pkgs; [
                    jdk17       # 17.0.7
                    # codeql      # 2.19.3
                    nodejs_18   # 18.20.3
                    # Corepack is used to support Vue, which requires pnpm)
                    corepack_18 # Yarn 1.22.19
                ] ++ [ pkgs-2505.codeql ]; # 2.21.1
                shellHook = ''
                    yarn install --frozen-lockfile
                '';
            };
        }
    );
}