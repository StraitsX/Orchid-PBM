// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');

module.exports = main;
async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  const heroNFT = await hre.ethers.deployContract('HeroNFT');

  console.log(`Deployed HeroNFT to ${heroNFT.address}`);

  const tokenId = 0; // Define the token ID
  const amount = 1; // Define the amount
  const data = '0x'; // Define additional data here if needed

  // Call the mint function to mint to deployer address
  const mintTx = await heroNFT.mint(deployer.address, tokenId, amount, data);
  // Wait for it to be mined
  await mintTx.wait();

  console.log(`Minted token ${tokenId} to ${deployer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
