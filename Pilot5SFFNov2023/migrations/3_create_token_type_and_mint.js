module.exports = async ({ getNamedAccounts, deployments, ethers }) => {
  const { deployer } = await getNamedAccounts();
  const deployerSigner = ethers.provider.getSigner(deployer);

  const pbmDeployment = await deployments.get('PBM');
  const pbm = (await ethers.getContractFactory('PBM'))
    .attach(pbmDeployment.address)
    .connect(deployerSigner);

  // const currentDate = new Date();
  // const currentEpoch = Math.floor(currentDate / 1000);
  const expiryDate = 1716343200; // Friday, May 22, 2024 10:00:00 AM GMT+08:00 2024-05-22T10:00:00+08:00

  // token id 0
  await pbm.createPBMTokenType(
    'GrabEnvelope',
    5,
    expiryDate,
    deployer,
    'https://gateway.pinata.cloud/ipfs/Qmboa1KFcP8jJaLTYXbnKvyQXATXVirXM8SnLQV978VQFK',
    'https://gateway.pinata.cloud/ipfs/QmejyLNiB2RLPq4x8acRd1L85uBcq71izB9iuy5TbZfXnC',
  );
  console.log('PBM token type 0 created');

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
