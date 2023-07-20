const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);

  const dsgdDeployment = await deployments.get('Spot');
  const swapDeployment = await deployments.get('Swap');

  const expiryDate = 1716469200; // Tue May 23 2024 21:00:00 GMT+0800 (Taipei Standard Time) 2024-05-23T21:00:00+08:00

  // mint 1000000 $SGD worth of DSGD to deployer
  const dsgdAmount = ethers.utils.parseUnits('1000000', 6);
  const dsgd = (await ethers.getContractFactory('Spot'))
    .attach(dsgdDeployment.address)
    .connect(deployerSigner);
  await dsgd.mint(deployer, dsgdAmount);

  // creating token id 0: XSGD pbm - 1 XSGD
  await pbm.createPBMTokenType(
    'Grab1XSGD',
    ethers.utils.parseUnits('1', 6),
    'XSGD',
    expiryDate,
    deployer,
    'https://raw.githubusercontent.com/StraitsX/NFT/main/pilot6July2023/1XSGD.json',
    'https://raw.githubusercontent.com/StraitsX/NFT/main/pilot6July2023/expired1XSGD.json',
  );
  console.log('PBM Token type 0 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

  // creating token id 1: XSGD pbm - 2 XSGD
  await pbm.createPBMTokenType(
    'Grab2XSGD',
    ethers.utils.parseUnits('2', 6),
    'XSGD',
    expiryDate,
    deployer,
    'https://raw.githubusercontent.com/StraitsX/NFT/main/pilot6July2023/2XSGD.json',
    'https://raw.githubusercontent.com/StraitsX/NFT/main/pilot6July2023/expired2XSGD.json',
  );
  console.log('PBM Token type 1 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

  // creating token id 2: XSGD pbm - 5 XSGD
  await pbm.createPBMTokenType(
    'Grab5XSGD',
    ethers.utils.parseUnits('5', 6),
    'XSGD',
    expiryDate,
    deployer,
    'https://raw.githubusercontent.com/StraitsX/NFT/main/pilot6July2023/5XSGD.json',
    'https://raw.githubusercontent.com/StraitsX/NFT/main/pilot6July2023/expired5XSGD.json',
  );
  console.log('PBM Token type 2 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
