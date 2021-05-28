const { deployAndSave, getNetworkSigner } = require("../lib/util")
const { time } = require('@openzeppelin/test-helpers')

module.exports = async ({getNamedAccounts, ethers, network}) => {
  const { weth, feeTreasury, idleTimeLock } = await getNamedAccounts()
  const toEtherBN = (x) => ethers.BigNumber.from(x.toString())

  console.log(`------------------ Executing deployment 01 on network ${network.name} ------------------\n`)
 
  let deployer = await getNetworkSigner()
  let deployerAddress = await deployer.getAddress()

  let stakedIdle = await ethers.getContract('StakedIdle')
  let startTime = toEtherBN(await time.latest())
  let feeDistributor = await deployAndSave('FeeDistributor', 'FeeDistributor', [
    stakedIdle.address, // Staking Token
    startTime, // Start Time
    weth, // Reward Token
    deployerAddress, // Admin, will be transfered to timelock
    feeTreasury // Emergency withdrawal address
  ])

  // set can_checkpoint_token flag to true
  console.log()
  let canCheckpoint = await feeDistributor.can_checkpoint_token({gasLimit: 500000})
  console.log(`FeeDistributor can_checkpoint_token flag = '${canCheckpoint}'`)
  if (canCheckpoint) {
    console.log('...Flag status unchanged')
  }
  else {
    console.log('Toggling can_checkpoint_token flag...')
    let tx = await feeDistributor.connect(deployer).toggle_allow_checkpoint_token()
    let receipt = await tx.wait()
    let canCheckpoint = await feeDistributor.can_checkpoint_token({gasLimit: 500000})
    console.log(`FeeDistributor can_checkpoint_token flag now = '${canCheckpoint}' @ ${receipt.transactionHash}`)
  }

  console.log()
  return true
}

module.exports.id = '1'
