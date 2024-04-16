{
    description = "Noah-pbm-2024";

    inputs ={
        nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
        flake-utils.url = "github:numtide/flake-utils";
    };

    outputs = { self, nixpkgs, flake-utils }:
        flake-utils.lib.eachDefaultSystem (system: let
            pkgs = nixpkgs.legacyPackages.${system};
        in {
            devShells.default = pkgs.mkShell {
                packages = [
                    pkgs.nodejs_18
                ];
                shellHook = ''
                    echo "node `${pkgs.nodejs_18}/bin/node --version`"
                '';
            };
        });       
}