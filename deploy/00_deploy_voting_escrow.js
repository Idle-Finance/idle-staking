const { deployAndSave, getNetworkSigner } = require("../lib/util")

module.exports = async ({getNamedAccounts, network}) => {
  const { idle, voteDelegate } = await getNamedAccounts()

  console.log(`------------------ Executing deployment 00 on network ${network.name} ------------------\n`)

  await deployAndSave('StakedIdle', 'VotingEscrow', [idle, 'Staked IDLE', 'stkIDLE', '1.0', voteDelegate])
  
  console.log()
  return true
}

module.exports.id = '0'
