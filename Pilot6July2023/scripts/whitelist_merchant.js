const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
    const { deployer } = await getNamedAccounts();
    const deployerSigner = ethers.provider.getSigner(deployer);

    const pbmDeployment = await deployments.get('PBM');
    const addressListDeployment = await deployments.get('PBMAddressList');

    // pbm on mumbai: 0xfEBf3DE57946F941432B8Da1D341D0647357Ee1a
    const pbm = (await ethers.getContractFactory('PBM'))
        .attach("0xfEBf3DE57946F941432B8Da1D341D0647357Ee1a")
        .connect(deployerSigner);
    const addressList = (await ethers.getContractFactory('PBMAddressList'))
        .attach("0x25ff780bc5549fa65e2a94c06e8c1c8ee858d37b ")
        .connect(deployerSigner);
    const XSGD = await ethers.getContractFactory('Spot');
    const xsgd = await XSGD.attach(
        '0x16e28369bc318636abbf6cb1035da77ffbf4a3bc',
    ).connect(deployerSigner); // XSGD deployed on mumbai

    await addressList.addMerchantAddresses([]);

}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
