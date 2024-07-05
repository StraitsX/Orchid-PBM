module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying PBMPayment Contract...");
  const pbmPaymentDeployment = await deploy("PBMPayment", {
    from: deployer,
    log: true,
  });
  console.log(`PBMPayment deployed at ${pbmPaymentDeployment.address}`);
};

module.exports.tags = ["PBMPayment"];
