// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');

async function main() {
  const heroNFT = await hre.ethers.deployContract('HeroNFT');
  console.log(`Deployed HeroNFT to ${heroNFT.address}`);
}

module.exports = main;
