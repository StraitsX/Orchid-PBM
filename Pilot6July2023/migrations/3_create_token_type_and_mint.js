module.exports = async ({ getNamedAccounts, deployments, ethers }) => {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);

  // const currentDate = new Date();
  // const currentEpoch = Math.floor(currentDate / 1000);
  const expiryDate = 1716469200; // Tue May 23 2024 21:00:00 GMT+0800 (Taipei Standard Time) 2024-05-23T21:00:00+08:00

  // creating new PBM token types with aligned metadata
  await pbm.createPBMTokenType(
    'Grab1-sample',
    1000000,
    expiryDate,
    deployer,
    'https://gateway.pinata.cloud/ipfs/QmSQedXTQeYskLthumBtD9vh4DFJyrWVfjQXBQTDB9tPCw',
    'https://gateway.pinata.cloud/ipfs/QmXCGMvSF5VuYmbJMJrngoPAr2pEeeBk7LivccsSxm9qKS',
  );
  console.log('PBM Token type 1 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

  await pbm.createPBMTokenType(
    'Grab2-sample',
    2000000,
    expiryDate,
    deployer,
    'https://gateway.pinata.cloud/ipfs/QmWMM6AfC25Cu2SVJwx8xMmkc9g6aWjoEw1G6u6jFzqd35',
    'https://gateway.pinata.cloud/ipfs/QmXKQWs6BoGfrooWZWmcF13gu38etP7pabU4x9DegdtNvj',
  );
  console.log('PBM Token type 2 created');
  await new Promise((r) => setTimeout(r, 5000)); // UNCOMMENT to prevent rpc rate limiting if you are on free version

  const Spot = await ethers.getContractFactory('Spot');
  const spot = await Spot.attach(
    '0x16e28369bc318636abbf6cb1035da77ffbf4a3bc',
  ).connect(deployerSigner); // XSGD deployed on mumbai
  await spot.increaseAllowance(pbm.address, 10000000000);

  const grabAddress1 = '0xd0b72a553d2c57f7997ba420a758c7a0fad92eef';
  const grabAddress2 = '0xa1404d9e7646b0112c49ae0296d6347c956d0867';
  const grabAddress3 = '0x281F397c5a5a6E9BE42255b01EfDf8b42F0Cd179';
  await pbm.mint(0, 20, grabAddress1);
  console.log('PBM token 0 minted to grabAddress1 address');
  await pbm.mint(0, 20, grabAddress2);
  console.log('PBM token 0 minted to grabAddress2 address');
  await pbm.mint(0, 20, grabAddress3);
  console.log('PBM token 0 minted to grabAddress3 address');
};
