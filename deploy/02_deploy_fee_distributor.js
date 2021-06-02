const { deployAndSave, getNetworkSigner } = require("../lib/util")
const { time } = require('@openzeppelin/test-helpers')

module.exports = async ({getNamedAccounts, ethers, network}) => {
  const { weth, feeTreasury, idleTimeLock } = await getNamedAccounts()
  const toEtherBN = (x) => ethers.BigNumber.from(x.toString())

  console.log(`------------------ Executing deployment 02 on network ${network.name} ------------------\n`)
 
  // get deployer address
  let deployer = await getNetworkSigner()
  let deployerAddress = await deployer.getAddress()

  // deploy FeeDistributor contract
  let stakedIdle = await ethers.getContract('StakedIdle')
  let startTime = toEtherBN(await time.latest())
  let feeDistributor = await deployAndSave('FeeDistributor', 'FeeDistributor', [
    stakedIdle.address, // Staking Token
    startTime, // Start Time
    weth, // Reward Token
    deployerAddress, // Admin. Set to deployer, but will be transfered to timelock
    feeTreasury // Emergency withdrawal address
  ])

  // by default `can_checkpoint_token` is set to false.
  // toggling this flag enables any account to call `checkpoint_token()`
  console.log()
  let canCheckpoint = await feeDistributor.callStatic.can_checkpoint_token({gasLimit: 500000}) // 
  console.log(`FeeDistributor 'can_checkpoint_token' flag = '${canCheckpoint}'`)
  if (canCheckpoint) { // flag is already set to true
    console.log('...Flag status unchanged')
  }
  else { // toggle flag
    console.log('Toggling \'can_checkpoint_token\' flag...')
    let tx = await feeDistributor.connect(deployer).toggle_allow_checkpoint_token()
    let receipt = await tx.wait()
    let canCheckpoint = await feeDistributor.callStatic.can_checkpoint_token({gasLimit: 500000})
    console.log(`FeeDistributor 'can_checkpoint_token' flag now = '${canCheckpoint}' @ ${receipt.transactionHash}`)
  }

  console.log()
  return true // flag to only run this migration once
}

module.exports.id = '2'
