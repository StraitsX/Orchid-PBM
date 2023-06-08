# Import the nix package collection
with import <nixpkgs> {};

# Define the versions of packages we want to use
let
  # Use NodeJS version 18
  nodejs = pkgs.nodejs-18_x;
  
in

# Use pkgs.mkShell to create a shell environment for development
pkgs.mkShell {
  # Name of the environment
  name = "Orchid-Hardhat";

  # Packages to include in the environment
  buildInputs = [ nodejs ];

  # Shell hook to run when the shell starts
  shellHook = ''
    # install default package.json
    npm install
  '';

}