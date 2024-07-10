const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const noahPaymentManagerAddr = "0x5201D8EF22bA3090eA3329d57F082801783A8558"
  const noahPaymentManager = (await ethers.getContractFactory("NoahPaymentManager")).attach(noahPaymentManagerAddr).connect(deployerSigner);

  console.log("NoahPaymentManager address", noahPaymentManagerAddr);

  await noahPaymentManager.initialise();
  console.log("NoahPaymentManager initialised");

  const pbmPaymentAddr = "0xba17a9f3C074d381D53D605590Eb13dde2d176a9";
  const pbmPayment = (await ethers.getContractFactory("PBMPayment")).attach(pbmPaymentAddr).connect(deployerSigner);

  console.log("PBMPayment address", pbmPaymentAddr);

  const addressListAddr = "0x642Fa8F823FF2A6982048F1A4dD0e80DB01E3B78";
  console.log("PBMMerchantAddressList address", addressListAddr);

  const expiryDate = 2713795200; // December 31, 2055 12:00:00 AM GMT+08:00

  await pbmPayment.initialise(expiryDate, addressListAddr, noahPaymentManagerAddr);
  console.log("PBMPayment initialised");
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
