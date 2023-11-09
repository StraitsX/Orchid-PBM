const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbmAddr = '0xF28A99687a5d40Cb18c1d555f5e2d4b17a7ACFD4';
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmAddr)
    .connect(deployerSigner);

  // mainnet xsgd and dsgd
  const xsgdAddress = '0xa05245Ade25cC1063EE50Cf7c083B4524c1C4302';
  const dsgdAddress = '0xcFf17e464626aDEF615FFC1Ecdb1661f1Ed1ca16';

  const expiryDate = 1762693200; // Sunday, November 9, 2025 9:00:00 PM GMT+08:00

  // mint 1000000 $SGD worth of DSGD to deployer
  const dsgd = (await ethers.getContractFactory('Spot'))
    .attach(dsgdAddress)
    .connect(deployerSigner);
  // const dsgdAmount = ethers.utils.parseUnits('1000000', await dsgd.decimals());

  // await dsgd.mint(deployer, dsgdAmount);

  // mint 1000000 $SGD worth of XSGD to deployer
  const xsgd = (await ethers.getContractFactory('Spot'))
    .attach(xsgdAddress)
    .connect(deployerSigner);
  // const xsgdAmount = ethers.utils.parseUnits('1000000', await xsgd.decimals());

  // await xsgd.mint(deployer, xsgdAmount);

  // creating token id 0: XSGD pbm - 1 XSGD
  // await pbm.createPBMTokenType(
  //   'Grab1XSGD',
  //   ethers.utils.parseUnits('1', await xsgd.decimals()),
  //   'XSGD',
  //   expiryDate,
  //   deployer,
  //   'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/1XSGD.json',
  //   'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/expired1XSGD.json',
  // );
  // console.log('PBM Token type 0 created');
  // await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

  // creating token id 1: XSGD pbm - 2 XSGD
  // await pbm.createPBMTokenType(
  //   'Grab2DSGD',
  //   ethers.utils.parseUnits('2', await dsgd.decimals()),
  //   'DSGD',
  //   expiryDate,
  //   deployer,
  //   'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/2XSGD.json',
  //   'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/expired2XSGD.json',
  // );
  // console.log('PBM Token type 1 created');
  // await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

  // creating token id 2: XSGD pbm - 5 XSGD
  // await pbm.createPBMTokenType(
  //   'Grab5XSGD',
  //   ethers.utils.parseUnits('5', await xsgd.decimals()),
  //   'XSGD',
  //   expiryDate,
  //   deployer,
  //   'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/5XSGD.json',
  //   'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/expired5XSGD.json',
  // );
  // console.log('PBM Token type 2 created');
  // await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

  // https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/0.1XSGD.json

  // creating token id 3: XSGD pbm - 0.1 XSGD
  await pbm.createPBMTokenType(
    '0.1XSGD',
    ethers.utils.parseUnits('0.1', await xsgd.decimals()),
    'XSGD',
    expiryDate,
    deployer,
    'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/0.1XSGD.json',
    'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/expired0.1XSGD.json',
  );
  console.log('PBM Token type 3 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
