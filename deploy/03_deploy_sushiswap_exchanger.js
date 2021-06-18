const { deployAndSave, getNetworkSigner } = require("../lib/util")

module.exports = async ({getNamedAccounts, network}) => {
  const { idle, weth, sushiswapRouter02, idleExchanger } = await getNamedAccounts()

  console.log(`------------------ Executing deployment 03 on network ${network.name} ------------------\n`)

  let deployer = await getNetworkSigner()

  let feeDistributor = await ethers.getContract('FeeDistributor')

  // deploy StakedIdle contract using the Voting Escrow code
  let sushiswapExchanger = await deployAndSave('SushiswapExchanger', 'SushiswapExchanger', 
    [sushiswapRouter02, weth, idle, feeDistributor.address],
    usingUpgrades=true
  )

  let isExchanger = await sushiswapExchanger.canExchange(idleExchanger)
  if (isExchanger) {
    console.log(`Exchanger ${idleExchanger} is already configured`)
  } else {
    console.log(`Configuring exchanger ${idleExchanger} with sushiswapExchanger`)
    let tx = await sushiswapExchanger.connect(deployer).addExchanger(idleExchanger)
    let receipt = await tx.wait()

    console.log(`Exchanger ${idleExchanger} is now configured @ ${receipt.transactionHash}`)
  }

  console.log()
  return true // flag to only run this migration once
}

module.exports.id = '3'
