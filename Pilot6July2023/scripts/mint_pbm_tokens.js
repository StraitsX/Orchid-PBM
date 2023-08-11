const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');

  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);

  // xsgd on mumbai: 0x16e28369bc318636abbf6cb1035da77ffbf4a3bc
  // fake stablecoin addresses on mainnet
  // const xsgdAddress = '0x787bD10Bb65AE206f70759D88a2ffc0F2653C0F6';
  // const dsgdAddress = '0xd769410dc8772695A7f55a304d2125320A65c2a5';

  // mumbai xsgd and 2 decimals dsgd addresses
  const xsgdAddress = '0x16e28369bc318636abbf6cb1035da77ffbf4a3bc';
  const dsgdAddress = '0xD2a6a1F2954a04EF90152da0fC9E15b5c68E7A69';

  const XSGD = await ethers.getContractFactory('Spot');
  const xsgd = await XSGD.attach(xsgdAddress).connect(deployerSigner); // XSGD deployed on mumbai

  // increase allowance for PBM
  await xsgd.increaseAllowance(pbm.address, 10000000000000);

  const DSGD = await ethers.getContractFactory('Spot');
  const dsgd = await DSGD.attach(dsgdAddress).connect(deployerSigner);
  // increase allowance for PBM
  await dsgd.increaseAllowance(pbm.address, 10000000000000);

  const swapDeployment = await deployments.get('Swap');
  const swap = (await ethers.getContractFactory('Swap'))
    .attach(swapDeployment.address)
    .connect(deployerSigner);

  // mint PBM token 0 -> 1 xsgd, 1 -> 2 xsgd, 2 -> 5 xsgd, 3 -> 0.1 xsgd, 4 -> 1 dsgd
  const tjAddr = '0x56285Cbc175a9c7eB347d95a15633D95f894ba7b';
  const victorAddr = '0x4Ef6462589a2D509fc05dA74511FFB4275D36615';
  const grabAddr = [
    '0xf64b2f9577b09e83e23543208eaa8b1ec919458e',
    '0xb1fee2dbecd97132c401b0c068a69bb249423fb9',
  ];

  // mint dummy XSGD
  // await xsgd.mint(swap.address, ethers.utils.parseUnits('1000000', 6))
  // await xsgd.mint(victorAddr, ethers.utils.parseUnits('1000000', 6))

  const mintTo = [victorAddr];
  for (let i = 0; i < mintTo.length; i++) {
    await pbm.batchMint([0, 1, 2, 3, 4], [5000, 5000, 5000, 5000, 5000], mintTo[i]);
    console.log(`minted PBM token 0, 1, 2, 3, 4 to address ${mintTo[i]}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
