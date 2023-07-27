const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
    const { deployer } = await getNamedAccounts();
    const deployerSigner = ethers.provider.getSigner(deployer);

    const HeroNFT = await ethers.getContractFactory('HeroNFT');
    const heroNFTDeployment = await deployments.get('HeroNFT');
    const heroNFT = await HeroNFT.attach(heroNFTDeployment.address).connect(deployerSigner);

    const pbmAddr = "fill in PBM contract address here"
    // whitelist PBM to be minter
    await heroNFT.addWhitelisted(pbmAddr)

    console.log(`Whitelisted PBM: ${pbmAddr} to be minter`)

}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
