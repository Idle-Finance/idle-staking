const { getNetworkSigner } = require("../lib/util")
const idleABI = require('../abi/idle.json')

module.exports = async ({getNamedAccounts, ethers, network}) => {
  const { personWithIdle, idle } = await getNamedAccounts()

  let deployer = await getNetworkSigner()
  let deployerAddress = await deployer.getAddress()

  console.log(`Delegating idle votes from ${personWithIdle} to deployer (${deployerAddress})`)

  console.log(`Funding ${personWithIdle} 1 ETH`)
  await deployer.sendTransaction({to: personWithIdle, value: ethers.utils.parseEther("1.0")});

  await network.provider.request({method: "hardhat_impersonateAccount", params: [personWithIdle]});
  const personWithIdleSigner = await ethers.provider.getSigner(personWithIdle);

  let idleContract = await ethers.getContractAt(idleABI, idle)
  
  let tx = await idleContract.connect(personWithIdleSigner).delegate(deployerAddress)
  let receipt = await tx.wait()

  console.log(`Delegated idle in tx ${receipt.transactionHash}`)

  console.log()
}

module.exports.skip = async({ network, ethers }) => {
  let networkChainId = (await ethers.provider.getNetwork()).chainId
  console.log(`-------------------- Executing setup 00 on network ${network.name} ---------------------\n`)

  if (networkChainId == 1) {
    console.log('This is a mainnet deployment. Skipping this step\n')
    return true
  }
  else {
    return false
  }
}
