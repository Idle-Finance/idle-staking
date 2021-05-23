const { deployAndSave } = require("../lib/util")

module.exports = async ({getNamedAccounts, network, ethers}) => {
  const { idle } = await getNamedAccounts()
  
  console.log(`------------------ Executing deployment 00 on network ${network.name} ------------------`)
  console.log()

  let idleContract
  if (idle==null) {
    console.info("Idle contract not set, deploying mock idle")
    idleContract = await deployAndSave('MockIDLE', 'ERC20Mock', ['IDLE', 'IDLE', ethers.utils.parseEther('1000')])
  }
  else {
    idleContract = await ethers.getContractAt("ERC20", idle)
  }

  await deployAndSave('StakedIdle', 'VotingEscrow', [idleContract.address, 'Staked IDLE', 'stkIDLE', '1.0'])

  console.log()
}
