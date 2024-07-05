const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
    const { deployer } = await getNamedAccounts();
    const deployerSigner = ethers.provider.getSigner(deployer);

    const pbmPaymentAddr = "0x8969Ef503B7570cF6A60CDb7C866f7341DE9F574";
    const pbmPayment = (await ethers.getContractFactory("PBMPayment")).attach(pbmPaymentAddr).connect(deployerSigner);

    // fuji testnet XSGD please change as needed
    const spotAddress = "0xd769410dc8772695A7f55a304d2125320A65c2a5"
    const XSGD = await ethers.getContractFactory('Spot');
    const xsgd = await XSGD.attach(spotAddress).connect(deployerSigner);

    // increase allowance for PBM
    await xsgd.increaseAllowance(pbmPayment.address, ethers.utils.parseUnits('1', await xsgd.decimals()));

    const tokenID = 0;
    // PBM token id 0 -> 0.01 xsgd
    const amount = 100;

    const receiver = deployer;

    // approve PBM
    await pbmPayment.mint(tokenID, amount, receiver);
    console.log(`minted PBM token ${tokenID} to address ${receiver}`);
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
