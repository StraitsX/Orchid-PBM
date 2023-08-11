const { ethers, getNamedAccounts, deployments } = require('hardhat');
async function main() {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);

  // polygon mainnet fake stable coins addresses
  // const xsgdAddress = '0x787bD10Bb65AE206f70759D88a2ffc0F2653C0F6';
  // const dsgdAddress = '0xd769410dc8772695A7f55a304d2125320A65c2a5';


  // mumbai xsgd and 2 decimals dsgd addresses
  const xsgdAddress = '0x16e28369bc318636abbf6cb1035da77ffbf4a3bc';
  const dsgdAddress = '0xD2a6a1F2954a04EF90152da0fC9E15b5c68E7A69';

  const expiryDate = 1716469200; // Tue May 23 2024 21:00:00 GMT+0800 (Taipei Standard Time) 2024-05-23T21:00:00+08:00

  // mint 1000000 $SGD worth of DSGD to deployer
  const dsgd = (await ethers.getContractFactory('Spot'))
    .attach(dsgdAddress)
    .connect(deployerSigner);
  const dsgdAmount = ethers.utils.parseUnits('1000000', await dsgd.decimals());

  await dsgd.mint(deployer, dsgdAmount);

  // mint 1000000 $SGD worth of XSGD to deployer
  const xsgd = (await ethers.getContractFactory('Spot'))
    .attach(xsgdAddress)
    .connect(deployerSigner);
  const xsgdAmount = ethers.utils.parseUnits('1000000', await xsgd.decimals());

  await xsgd.mint(deployer, xsgdAmount);

  // creating token id 0: XSGD pbm - 1 XSGD
  await pbm.createPBMTokenType(
    'Grab1XSGD',
    ethers.utils.parseUnits('1', await xsgd.decimals()),
    'XSGD',
    expiryDate,
    deployer,
    'https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/1XSGD.json',
    'https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/expired1XSGD.json',
  );
  console.log('PBM Token type 0 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

  // creating token id 1: XSGD pbm - 2 XSGD
  await pbm.createPBMTokenType(
    'Grab2XSGD',
    ethers.utils.parseUnits('2', await xsgd.decimals()),
    'XSGD',
    expiryDate,
    deployer,
    'https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/2XSGD.json',
    'https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/expired2XSGD.json',
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
    'https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/5XSGD.json',
    'https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/expired5XSGD.json',
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
      'https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/0.1XSGD.json',
      'https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/expired0.1XSGD.json',
  );
  console.log('PBM Token type 3 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version


  // creating token id 4: DSGD pbm - 1 DSGD
  await pbm.createPBMTokenType(
    'Grab1DSGD',
    ethers.utils.parseUnits('1', await dsgd.decimals()),
    'DSGD',
    expiryDate,
    deployer,
    'https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/1DSGD.json',
    'https://raw.githubusercontent.com/StraitsX/NFT-Metadata/main/pilot6July2023/expired1DSGD.json',
  );
  console.log('PBM Token type 4 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

  // test expired token needs to change the expire time on the fly and remember to update metadata as well
  // const expire721 = 1689907800; // 2023-07-21T10:50:00+08:00
  // // creating token id 4: XSGD pbm - 1 XSGD expiring at
  // await pbm.createPBMTokenType(
  //   'Grab1XSGD',
  //   ethers.utils.parseUnits('1', 6),
  //   'XSGD',
  //   expire721,
  //   deployer,
  //   'https://raw.githubusercontent.com/StraitsX/NFT/main/pilot6July2023/1XSGD-ExpireSoon.json',
  //   'https://raw.githubusercontent.com/StraitsX/NFT/main/pilot6July2023/expired1XSGD-7-21.json',
  // );
  // console.log('PBM Token type 4 created');
  // await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
