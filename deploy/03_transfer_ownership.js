const { getNetworkSigner } = require("../lib/util")

module.exports = async ({getNamedAccounts, ethers, network}) => {
  console.log(`------------------ Executing deployment 03 on network ${network.name} ------------------\n`)
  const { idleTimeLock } = await getNamedAccounts()

  // get deployer address
  let deployer = await getNetworkSigner()
  let deployerAddress = await deployer.getAddress()

  // get deployed contracts
  let stakedIdle = await ethers.getContract('StakedIdle')
  let feeDistributor = await ethers.getContract('FeeDistributor')

  /*
  Transfering ownership is a two step process
  1. Commit a new admin to the contract
  2. Apply the new admin
  
  This process must initiated by the current admin of each contract
  */

  // Transfer admin for stakedIdle to timelock
  let stakedIdleAdmin = await stakedIdle.callStatic.admin({gasLimit: 500000})
  if (stakedIdleAdmin != idleTimeLock) { // if admin is already set, skip
    if (stakedIdleAdmin != deployerAddress) { // if the admin is not deployer, cannot transfer ownership
      console.error(`Current admin for StakedIdle does not match deployer. ${stakedIdleAdmin} != ${deployerAddress}`)
      return false
    }

    // transfer ownership
    console.log(`Tranfering admin for StakedIdle from ${stakedIdleAdmin} -> ${idleTimeLock}.`)
    let tx1 = await stakedIdle.connect(deployer).commit_transfer_ownership(idleTimeLock)
    let receipt1 = await tx1.wait()
    console.log(`1/2 Commited new admin @ ${receipt1.transactionHash}`)

    let tx2 = await stakedIdle.connect(deployer).apply_transfer_ownership()
    let receipt2 = await tx2.wait()
    console.log(`2/2 Applied new admin @ ${receipt2.transactionHash}`)
  }
  else {
    console.log(`StakedIdle admin is already transfered to timelock: ${idleTimeLock}`)
  }
  console.log()

  // Transfer admin for feeDistributor to timelock
  let feeDistributorAdmin = await feeDistributor.callStatic.admin({gasLimit: 500000})
  if (feeDistributorAdmin != idleTimeLock) { // if admin is already set, skip
    if (feeDistributorAdmin != deployerAddress) { // if the admin is not deployer, cannot transfer ownership
      console.error(`Current admin for FeeDistributor does not match deployer. ${feeDistributorAdmin} != ${deployerAddress}`)
      return false
    }
    // transfer ownership
    console.log(`Tranfering admin for FeeDistributor from ${feeDistributorAdmin} -> ${idleTimeLock}.`)
    let tx1 = await feeDistributor.connect(deployer).commit_admin(idleTimeLock)
    let receipt1 = await tx1.wait()
    console.log(`1/2 Commited new admin @ ${receipt1.transactionHash}`)

    let tx2 = await feeDistributor.connect(deployer).apply_admin()
    let receipt2 = await tx2.wait()
    console.log(`2/2 Applied new admin @ ${receipt2.transactionHash}`)
  }
  else {
    console.log(`FeeDistributor admin is already transfered to timelock: ${idleTimeLock}`)
  }

  console.log()
  return true // flag to only run this migration once
}

module.exports.id = '3'
