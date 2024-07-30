const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const noahPaymentManagerAddr = "0x5201D8EF22bA3090eA3329d57F082801783A8558";
  const noahPaymentManager = (await ethers.getContractFactory("NoahPaymentManager"))
    .attach(noahPaymentManagerAddr)
    .connect(deployerSigner);

  console.log("NoahPaymentManager address", noahPaymentManagerAddr);

  await noahPaymentManager.initialise();
  console.log("NoahPaymentManager initialised");

  const currencyPBMAddr = "";
  const currencyPBM = (await ethers.getContractFactory("CurrencyPBM")).attach(currencyPBMAddr).connect(deployerSigner);

  console.log("currencyPBM address", currencyPBMAddr);

  const addressListAddr = "0x642Fa8F823FF2A6982048F1A4dD0e80DB01E3B78";
  console.log("PBMMerchantAddressList address", addressListAddr);

  const expiryDate = 2713795200; // December 31, 2055 12:00:00 AM GMT+08:00

  await currencyPBM.initialise(expiryDate, addressListAddr, noahPaymentManagerAddr);
  console.log("currencyPBM initialised");
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
