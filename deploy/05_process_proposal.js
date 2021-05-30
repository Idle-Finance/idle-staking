const governorAlphaABI = require('../abi/governorAlpha.json')

module.exports = async ({getNamedAccounts, ethers, network}) => {
  const { personWithIdle, governorAlpha, timelock } = await getNamedAccounts()

  await network.provider.request({method: "hardhat_impersonateAccount", params: [personWithIdle]});
  const personWithIdleSigner = await ethers.provider.getSigner(personWithIdle);

  let governorAlphaContract = await ethers.getContractAt(governorAlphaABI, governorAlpha)
  let proposal = await governorAlphaContract.proposalCount()

  console.log(`Voting on proposal ${proposal.toString()} as ${personWithIdle}`)
  await governorAlphaContract.connect(personWithIdleSigner).castVote(proposal, true)

}

module.exports.skip = async({ network, ethers }) => {
  let networkChainId = (await ethers.provider.getNetwork()).chainId
  console.log(`-------------------- Executing setup 06 on network ${network.name} ---------------------\n`)

  if (networkChainId == 1) {
    console.log('This is a mainnet deployment. Skipping this step\n')
    return true
  }
  else {
    return false
  }
}