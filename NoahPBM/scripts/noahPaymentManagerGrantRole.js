const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const noahPaymentManagerAddr = "0x49aD808009a42CEFaAeCCfB3BB680ADa33698219";
  const noahPaymentManager = (await ethers.getContractFactory("NoahPaymentManager"))
    .attach(noahPaymentManagerAddr)
    .connect(deployerSigner);

  const grantRoleTo = "";
  await noahPaymentManager.grantRole(noahPaymentManager.NOAH_CRAWLER_ROLE(), grantRoleTo);

  console.log("Granted role to", grantRoleTo);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
