module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying PBMMerchantAddressList Contract...");
  const pbmMerchantAddressListDeployment = await deploy("PBMMerchantAddressList", {
    from: deployer,
    log: true,
  });
  console.log(`PBMMerchantAddressList deployed at ${pbmMerchantAddressListDeployment.address}`);
};

module.exports.tags = ["PBMMerchantAddressList"];
