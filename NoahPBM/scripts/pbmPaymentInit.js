const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const noahPaymentManagerAddr = "0xD6A39Ea66EEC7dff0F95B6415fE7B9b5Dcd13609"
  const noahPaymentManager = (await ethers.getContractFactory("NoahPaymentManager")).attach(noahPaymentManagerAddr).connect(deployerSigner);

  console.log("NoahPaymentManager address", noahPaymentManagerAddr);

  await noahPaymentManager.initialise();
  console.log("NoahPaymentManager initialised");

  const pbmPaymentAddr = "0x5D95B020AA8DA9315C9D59593c83A762C9A5A402";
  const pbmPayment = (await ethers.getContractFactory("PBMPayment")).attach(pbmPaymentAddr).connect(deployerSigner);

  console.log("PBMPayment address", pbmPaymentAddr);

  const addressListAddr = "0xc863d9c8e9e05118c08278160a90E047c1E91A11";
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
