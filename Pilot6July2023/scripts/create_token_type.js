const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);

  // mainnet xsgd and dsgd
  const xsgdAddress = '0xDC3326e71D45186F113a2F448984CA0e8D201995';
  const dsgdAddress = '0x057B501fD1daF8FB0E232C7003AaFe5500e4efc0';

  const expiryDate = 1704038400; // 2024-01-01T00:00:00+08:00

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
  await pbm.createPBMTokenType(
    'Grab1XSGD',
    ethers.utils.parseUnits('1', await xsgd.decimals()),
    'XSGD',
    expiryDate,
    deployer,
    'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/1XSGD.json',
    'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/expired1XSGD.json',
  );
  console.log('PBM Token type 0 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

  // creating token id 1: XSGD pbm - 2 XSGD
  await pbm.createPBMTokenType(
    'Grab2DSGD',
    ethers.utils.parseUnits('2', await dsgd.decimals()),
    'DSGD',
    expiryDate,
    deployer,
    'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/2XSGD.json',
    'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/expired2XSGD.json',
  );
  console.log('PBM Token type 1 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

  // creating token id 2: XSGD pbm - 5 XSGD
  await pbm.createPBMTokenType(
    'Grab5XSGD',
    ethers.utils.parseUnits('5', await xsgd.decimals()),
    'XSGD',
    expiryDate,
    deployer,
    'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/5XSGD.json',
    'https://gateway.pinata.cloud/ipfs/QmSkkqUnUKhqmiYi7ShFPRXasbcETKVpnvXaBANad5Hvrx/expired5XSGD.json',
  );
  console.log('PBM Token type 2 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version


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

  // creating token id 4: fomo XSGD pbm - 1 XSGD
  await pbm.createPBMTokenType(
      'FOMO1XSGD',
      ethers.utils.parseUnits('1', await xsgd.decimals()),
      'XSGD',
      expiryDate,
      deployer,
      'https://stxpilot6.mypinata.cloud/ipfs/QmTWJgz3sDB49xg3DFK7c7UN8giZqm8YiswJz1ZTPX2EwX/fomo1XSGD.json',
      'https://stxpilot6.mypinata.cloud/ipfs/QmTWJgz3sDB49xg3DFK7c7UN8giZqm8YiswJz1ZTPX2EwX/expiredFomo1XSGD.json',
  );
  console.log('PBM Token type 4 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
