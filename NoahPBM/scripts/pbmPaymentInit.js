const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmPaymentAddr = "0x8969Ef503B7570cF6A60CDb7C866f7341DE9F574";
  const pbmPayment = (await ethers.getContractFactory("PBMPayment")).attach(pbmPaymentAddr).connect(deployerSigner);

  console.log("PBMPayment address", pbmPaymentAddr);

  const addressListAddr = "0xD0569E9fdD9AD6D81fb7712aC065b466D7c61128";
  console.log("PBMMerchantAddressList address", addressListAddr);

  const noahPaymentManagerAddr = "0x49aD808009a42CEFaAeCCfB3BB680ADa33698219";

  const expiryDate = 1767110400; // December 31, 2025 12:00:00 AM GMT+08:00

  await pbmPayment.initialise(expiryDate, addressListAddr, noahPaymentManagerAddr);
  console.log("PBMPayment initialised");
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
