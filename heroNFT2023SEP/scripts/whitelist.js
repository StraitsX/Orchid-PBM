const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
    const { deployer } = await getNamedAccounts();
    const deployerSigner = ethers.provider.getSigner(deployer);

    const HeroNFT = await ethers.getContractFactory('HeroNFT');
    const heroNFTDeployment = await deployments.get('HeroNFT');
    const heroNFT = await HeroNFT.attach(heroNFTDeployment.address).connect(deployerSigner);

    // const pbmAddr = "0xb9f5fc449dDd21302Ab52aF1FfeA8d7A49614D3b"
    // mainnet with 2 decimals DSGD
    // const pbmAddr = "0xfEfF2DA6B1782BE7cB3908f9c92c0c275Dfc8a13"

    // mainnet with real xsgd
    const pbmAddr = "0x6d41906cce58491dAF2cA8141A1C4B180fa6E7B9"
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
