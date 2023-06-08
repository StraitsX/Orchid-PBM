# Overview

# Nix 

- If you do not have nix, go to https://nixos.org/download.html 
- install Single-user installation by running the command `$ sh <(curl -L https://nixos.org/nix/install) --no-daemon` 

# Setting up Nix environment for Orchid
- Clone this repository in to your local drive
- Navigate to this repository in the terminal
- Run `nix-shell` command in terminal to start the shell with all the dev environment required. The following dependencies (see package.json file for details) will be installed:
  - nodejs version 18
  - hardhat
  - @nomicfoundation/hardhat-toolbox

# Hardhat commands
- Navigate to this folder:
  - To compile:  Enter `npx hardhat compile` in terminal.
  - To run test: Enter `npx hardhat test` in terminal.
  - To check coverage: `npx hardhat coverage` in terminal.
