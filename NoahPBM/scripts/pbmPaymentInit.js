const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmPaymentAddr = "0x8bce8B6BAC1639f2AdB4496389FA2EfBf61BC454";
  const pbmPayment = (await ethers.getContractFactory("PBMPayment")).attach(pbmPaymentAddr).connect(deployerSigner);

  console.log("PBMPayment address", pbmPaymentAddr);

  const addressListAddr = "0x3376F9a146bE74E5f1540A200911a7767913Fbf1";
  console.log("PBMMerchantAddressList address", addressListAddr);

  const noahPaymentManagerAddr = "0xEF19e8D2FDcD42a043807027f609d8EE105817eA";

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
