const { deployAndSave, getNetworkSigner } = require("../lib/util")

module.exports = async ({getNamedAccounts, network}) => {
  const { idle, voteDelegate } = await getNamedAccounts()

  console.log(`------------------ Executing deployment 01 on network ${network.name} ------------------\n`)

  // deploy StakedIdle contract using the Voting Escrow code
  await deployAndSave('StakedIdle', 'VotingEscrow', [idle, 'Staked IDLE', 'stkIDLE', '1.0', voteDelegate])
  
  console.log()
  return true // flag to only run this migration once
}

module.exports.id = '1'
