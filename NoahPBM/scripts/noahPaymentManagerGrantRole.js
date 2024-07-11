const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  // noah PBM payment manager on c-chain 0xEF19e8D2FDcD42a043807027f609d8EE105817eA
  // noah PBM payment manager on straitsx subnet 0x5201D8EF22bA3090eA3329d57F082801783A8558
  // change as needed

  const noahPaymentManagerAddr = "0x5201D8EF22bA3090eA3329d57F082801783A8558";
  const noahPaymentManager = (await ethers.getContractFactory("NoahPaymentManager"))
    .attach(noahPaymentManagerAddr)
    .connect(deployerSigner);

  const grantRoleTo = "0xf563f50Af3F1D105829f484064B6Ec3d094bF0f7";
  await noahPaymentManager.grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), grantRoleTo);

  console.log("Granted role to", grantRoleTo);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
