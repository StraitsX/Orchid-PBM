const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
    const { deployer } = await getNamedAccounts();
    const deployerSigner = ethers.provider.getSigner(deployer);

    const pbmPaymentAddr = "0x8969Ef503B7570cF6A60CDb7C866f7341DE9F574";
    const pbmPayment = (await ethers.getContractFactory("PBMPayment")).attach(pbmPaymentAddr).connect(deployerSigner);


    const companyName = "StraitsX"
    // fuji testnet XSGD please change as needed
    const spotAddress = "0xd769410dc8772695A7f55a304d2125320A65c2a5"
    const spotAmount = 10000 // 0.01 XSGD
    const spotType = "XSGD"
    const tokenExpiry = 1767024000; // December 30, 2025 12:00:00 AM GMT+08:00
    const creator = deployer
    const tokenURI = "https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/noahPBM/metadata/0.json"
    const postExpiryURI = "https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/noahPBM/metadata/0.json"
    await pbmPayment.createPBMTokenType(companyName, spotAddress, spotAmount, spotType, tokenExpiry, creator, tokenURI, postExpiryURI);
    console.log("PBMPayment type created");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
