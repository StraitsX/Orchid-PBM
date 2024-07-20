const { ethers, getNamedAccounts } = require("hardhat");
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmPaymentAddr = "0x5D95B020AA8DA9315C9D59593c83A762C9A5A402";
  const pbmPayment = (await ethers.getContractFactory("PBMPayment")).attach(pbmPaymentAddr).connect(deployerSigner);

  const companyName = "StraitsX";
  // fuji testnet XSGD 0xd769410dc8772695A7f55a304d2125320A65c2a5
  // c chain XSGD 0xb2F85b7AB3c2b6f62DF06dE6aE7D09c010a5096E
  // stx subnet XSGD 0x49aB91610BfDA3493e7549176247060643A9108b
  // please change as needed
  const spotAddress = "0x4B68D02791986Ce280072C558dc56a25b8A1E079";
  const spotAmount = 10000; // 0.01 XSGD
  const spotType = "XSGD";
  const tokenExpiry = 2713708800; // December 30, 2055 12:00:00 AM GMT+08:00
  const creator = deployer;
  const tokenURI = "https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/noahPBM/metadata/0.json";
  const postExpiryURI = "https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/noahPBM/metadata/0.json";
  await pbmPayment.createPBMTokenType(
    companyName,
    spotAddress,
    spotAmount,
    spotType,
    tokenExpiry,
    creator,
    tokenURI,
    postExpiryURI
  );
  console.log("PBMPayment type created");
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
