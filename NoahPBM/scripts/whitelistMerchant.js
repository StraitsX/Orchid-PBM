const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const merchantAddressListAddr = "0x3376F9a146bE74E5f1540A200911a7767913Fbf1";
  const merchantAddressList = (await ethers.getContractFactory("PBMMerchantAddressList"))
    .attach(merchantAddressListAddr)
    .connect(deployerSigner);

  const merchants = [
    "0x28D752C81Af8c304c98be481e1aA5B2A11c6cf58",
    "0x392c10E022d136067a74f4322CfA5ec1CD377a82",
    "0x42E022Ba851fC7476e6261eb600349f008c7195a",
    "0x5ED08CDC3F97246416683fC5B55B64C7fb0601e2",
    "0x2337ce9889777400EAa8a221cf202fF0498e3383",
    "0xEEAbf97d75ed40e79d2637E571E00771d8FEbCC8",
    "0xF7a43B2ae1E8539317Ce917bEA74e10896841DA2",
    "0x431Ab4786bF779F51F8bbFD2Ac33dbf945d33005",
    "0x7f7dEee23c9Cd515fdceB6daff40bbcF0C0caC83",
  ];
  console.log("Adding merchants", merchants);
  await merchantAddressList.addMerchantAddresses(merchants, "noah-testing");
  console.log("Added merchants");
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
