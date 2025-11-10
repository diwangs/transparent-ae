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
            # buildNodeJs = with nixpkgs.legacyPackages.${system}; callPackage "${nixpkgs}/pkgs/development/web/nodejs/nodejs.nix" {
            #   icu = pkgs.icu68;
            #   python = pkgs.python310;
            #   openssl = pkgs.openssl_1_1;
            # };
            # # Node <18 is marked as vulnerable by Nix, so this necessitates 
            # # `NIXPKGS_ALLOW_INSECURE=1` flag.
            # # See: https://github.com/NixOS/nixpkgs/blob/2391cd0676590c967beedc513e3af98ccc39ed8c/pkgs/development/web/nodejs/nodejs.nix#L212
            # nodejs_14 = (buildNodeJs {
            #     version = "14.21.3";
            #     sha256 = "0ph7ajgajn4fkadzklxkgd6dl5aw8cyvd707rzfh1mqaws9c13j5";
            #     enableNpm = true;
            # });
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

            # For release (doesn't work yet)
            packages = rec {
                # Doesn't work yet since it requires `yarn install`
                # yarn2nix with workspaces?
                # https://github.com/nix-community/yarn2nix/issues/57
                default = pkgs.stdenv.mkDerivation {
                    name = "transparent";
                    src = self;
                    buildInputs = with pkgs; [
                        nodejs_18
                        yarn
                        codeql
                    ];
                    buildPhase = ''
                        yarn build
                    '';
                    # installPhase = ''
                    #     mkdir -p $out/react-security-queries
                    #     cp -r react-src/build/react-security-queries/* $out/react-security-queries
                    # '';
                };

                dockerDevShell = pkgs.dockerTools.buildNixShellImage {
                    tag = "latest";
                    drv = devShells.default.overrideAttrs (old: { 
                        src = null; 
                        shellHook = ''
                            cd transparent
                            yarn
                        '';
                    });
                };
            };
        }
    );
}