const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
    const { deployer } = await getNamedAccounts();
    const deployerSigner = ethers.provider.getSigner(deployer);

    // const pbmDeployment = await deployments.get('PBM');
    // const addressListDeployment = await deployments.get('PBMAddressList');

    // pbm on mumbai: 0xfEBf3DE57946F941432B8Da1D341D0647357Ee1a
    // const pbm = (await ethers.getContractFactory('PBM'))
    //     .attach("0xfEBf3DE57946F941432B8Da1D341D0647357Ee1a")
    //     .connect(deployerSigner);
    // const addressList = (await ethers.getContractFactory('PBMAddressList')).attach("0x25ff780bc5549fa65e2a94c06e8c1c8ee858d37b").connect(deployerSigner);
    // const XSGD = await ethers.getContractFactory('Spot');
    // const xsgd = await XSGD.attach(
    //     '0x16e28369bc318636abbf6cb1035da77ffbf4a3bc',
    // ).connect(deployerSigner); // XSGD deployed on mumbai

    // await addressList.addMerchantAddresses(
    //     ["0x505d56be68dd4c00311a15513D548316F6C4aaEd", "0x9f99F2346E9dadDfeFeb1D3084148506F0adD956", "0x143e5cb75B3c417E239e9fC23C90D97C52bda84c"],
    //     'testMerchant',
    // );

    // heroNFT on mumbai: 0x03d757C5b2BA632Af155794328aA98eF46999efC
    const heroNFT = (await ethers.getContractFactory('HeroNFT')).attach("0x03d757C5b2BA632Af155794328aA98eF46999efC").connect(deployerSigner);
    await heroNFT.addWhitelisted('0xfEBf3DE57946F941432B8Da1D341D0647357Ee1a')

    // await addressList.addHeroMerchant(["0x505d56be68dd4c00311a15513D548316F6C4aaEd", "0x9f99F2346E9dadDfeFeb1D3084148506F0adD956"], [1,2])

}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




