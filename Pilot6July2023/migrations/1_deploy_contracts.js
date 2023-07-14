module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    await deploy('PBMAddressList', {
        from: deployer,
        args: [],
        log: true,
    });
    await deploy('PBM', {
        from: deployer,
        args: [],
        log: true,
    });
};