module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying Mock Contract...");
  const mockNoahPaymentManagerDeployment = await deploy(
    "MockNoahPaymentManager",
    {
      from: deployer,
      log: true,
    }
  );
  console.log(
    `MockNoahPaymentManager deployed at ${mockNoahPaymentManagerDeployment.address}`
  );
};

module.exports.tags = ["MockNoahPaymentManager"];
