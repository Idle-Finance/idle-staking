const { getNetworkSigner } = require("../lib/util")

module.exports = async ({getNamedAccounts, ethers, network, upgrades}) => {
  console.log(`------------------ Executing deployment 04 on network ${network.name} ------------------\n`)
  const { idleTimeLock, devMultisig } = await getNamedAccounts()

  // get deployer address
  let deployer = await getNetworkSigner()
  let deployerAddress = await deployer.getAddress()

  // get deployed contracts
  let stakedIdle = await ethers.getContract('StakedIdle')
  let feeDistributor = await ethers.getContract('FeeDistributor')
  let proxyAdmin = await upgrades.admin.getInstance()
  let sushiswapExchanger = await ethers.getContract('SushiswapExchanger')

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

  // Transfer admin for feeDistributor to dev multisig
  let feeDistributorAdmin = await feeDistributor.callStatic.admin({gasLimit: 500000})
  if (feeDistributorAdmin != devMultisig) { // if admin is already set, skip
    if (feeDistributorAdmin != deployerAddress) { // if the admin is not deployer, cannot transfer ownership
      console.error(`Current admin for FeeDistributor does not match deployer. ${feeDistributorAdmin} != ${deployerAddress}`)
      return false
    }
    // transfer ownership
    console.log(`Tranfering admin for FeeDistributor from ${feeDistributorAdmin} -> ${devMultisig}.`)
    let tx1 = await feeDistributor.connect(deployer).commit_admin(devMultisig)
    let receipt1 = await tx1.wait()
    console.log(`1/2 Commited new admin @ ${receipt1.transactionHash}`)

    let tx2 = await feeDistributor.connect(deployer).apply_admin()
    let receipt2 = await tx2.wait()
    console.log(`2/2 Applied new admin @ ${receipt2.transactionHash}`)
  }
  else {
    console.log(`FeeDistributor admin is already transfered to dev multisig: ${devMultisig}`)
  }
  console.log()

  // Transfer ownership of proxy admin and contract admin to dev league
  let proxyAdminOwner = await proxyAdmin.owner()
  if (proxyAdminOwner != devMultisig) {
    if (proxyAdminOwner != deployerAddress) {
      console.error(`Current owner for proxyAdmin does not match deployer. ${proxyAdminOwner} != ${deployerAddress}`)
      return false
    }
    console.log(`Tranfering owner for proxyAdmin from ${proxyAdminOwner} -> ${devMultisig}.`)
    let tx = await proxyAdmin.connect(deployer).transferOwnership(devMultisig)
    let receipt = await tx.wait()

    console.log(`ProxyAdmin owner updated @ ${receipt.transactionHash}`)
  }
  else {
    console.log(`ProxyAdmin is already transfered to dev multisig: ${devMultisig}`)
  }
  console.log()

  // Transfer ownership of sushiswap exchanger
  let sushiswapExchangerOwner = await sushiswapExchanger.owner()
  if (sushiswapExchangerOwner != devMultisig) {
    if (sushiswapExchangerOwner != deployerAddress) {
      console.error(`Current owner for sushiswapExchanger does not match deployer. ${sushiswapExchangerOwner} != ${deployerAddress}`)
      return false
    }
    console.log(`Tranfering owner for sushiswapExchanger from ${sushiswapExchangerOwner} -> ${devMultisig}.`)
    let tx = await sushiswapExchanger.connect(deployer).transferOwnership(devMultisig)
    let receipt = await tx.wait()

    console.log(`Sushiswap owner updated @ ${receipt.transactionHash}`)
  }
  else {
    console.log(`Sushiswap is already transfered to dev multisig: ${devMultisig}`)
  }

  console.log()
  return true // flag to only run this migration once
}

module.exports.id = '4'
