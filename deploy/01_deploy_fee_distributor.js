

module.exports = async ({getNamedAccounts, deployments}) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts();
}
