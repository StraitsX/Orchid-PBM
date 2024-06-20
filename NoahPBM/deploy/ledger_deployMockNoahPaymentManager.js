module.exports = async ({ getNamedAccounts, deployments}) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying Mock Contract with ledger nano...");

  // Check public key of signer matches ledger nano public key.
  console.log(await ethers.getSigners());

  const mockNoahPaymentManagerDeployment = await deploy("MockNoahPaymentManager", {
    // can be filled with getSigners() or just manually type in the public wallet address
    from: "0x992b27192082aa84334904c337309B9D219777CA", 
    log: true,
  });


  console.log(`MockNoahPaymentManager deployed at ${mockNoahPaymentManagerDeployment.address}`);
};

module.exports.tags = ["LedgerDeployMockContract"];
