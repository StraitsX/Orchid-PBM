const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const noahPaymentManagerAddr = "0x6ff41690ceEeA9e9780A1CC30172d450cddD4028";
  const noahPaymentManager = (await ethers.getContractFactory("NoahPaymentManager"))
    .attach(noahPaymentManagerAddr)
    .connect(deployerSigner);

  console.log("NoahPaymentManager address", noahPaymentManagerAddr);

  await noahPaymentManager.initialise();
  console.log("NoahPaymentManager initialised");

  const currencyPBMAddr = "0x8e63Fc22edF4b77e607B779E642bFd5ceF67c278";
  const currencyPBM = (await ethers.getContractFactory("CurrencyPBM")).attach(currencyPBMAddr).connect(deployerSigner);

  console.log("currencyPBM address", currencyPBMAddr);

  const addressListAddr = "0xc863d9c8e9e05118c08278160a90E047c1E91A11";
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
