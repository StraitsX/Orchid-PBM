const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);
  const addressListDeployment = await deployments.get('PBMAddressList');

  // Polygon XSGD address = "0xDC3326e71D45186F113a2F448984CA0e8D201995"
  // Mumbai XSGD address = "0x16e28369bc318636abbf6cb1035da77ffbf4a3bc"
  // mainnet fake stable coins address
  // const xsgdAddress = '0x787bD10Bb65AE206f70759D88a2ffc0F2653C0F6';
  // const dsgdAddress = '0xd769410dc8772695A7f55a304d2125320A65c2a5';

  // mumbai 2 decimals DSGD
  const xsgdAddress = '0x288a9587d97bdC0946449d78AC23cf805c14400d';
  const dsgdAddress = '0xA15157eE77650367CC4e44A5Bd52c0c8fb025E5f';

  // const dummyDSGD = (await ethers.getContractFactory('Spot')).attach(xsgdAddress).connect(deployerSigner);
  // const dummyXSGD = (await ethers.getContractFactory('Spot')).attach(dsgdAddress).connect(deployerSigner);
  const swapDeployment = await deployments.get('Swap');

  const expiryDate = 1704038400; // 2024-01-01T00:00:00+08:00

  // Mumbai heroNFT address = "0x773135F3B394F6334b35CD84003267F48eDB6547"
  // Mainnet heroNFT address = "0xb3795e87a3ca2a1f9fd00362ea7c5c08884f7bbe"
  const heroNFTAddresss = '0x42e2a9716F63684B9DCe70Bbe4e493437f6a7Bc9';

  await pbm.initialise(
    xsgdAddress,
    dsgdAddress,
    swapDeployment.address,
    expiryDate,
    addressListDeployment.address,
    heroNFTAddresss,
  );
  console.log('PBM initialised');
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
