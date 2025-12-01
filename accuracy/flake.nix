{
    description = "TranSPArent accuracy evaluation";

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
            devShells.default = pkgs.mkShell {
                name = "transparent";
                src = self;
                packages = with pkgs; [
                    gnutar
                    git
                    git-lfs
                    nodejs_18   # 18.20.3
                ] ++ [ pkgs-2505.codeql ]; # 2.21.1
            };
        }
    );
}