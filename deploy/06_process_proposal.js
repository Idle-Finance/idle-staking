const governorAlphaABI = require('../abi/governorAlpha.json')
const { advanceBlocks, getNetworkSigner } = require("../lib/util")

const { time } = require('@openzeppelin/test-helpers')

module.exports = async ({getNamedAccounts, ethers, network}) => {
  const { governorAlpha } = await getNamedAccounts()

  // get deployer address
  let deployer = await getNetworkSigner()
  let deployerAddress = await deployer.getAddress()

  let governorAlphaContract = await ethers.getContractAt(governorAlphaABI, governorAlpha)
  let proposal = await governorAlphaContract.proposalCount()

  console.log('Advancing one block')
  await advanceBlocks(1)

  console.log(`Voting on proposal ${proposal.toString()} as ${deployerAddress}`)
  await governorAlphaContract.connect(deployer).castVote(proposal, true) // not required to connect to contract, but added for completion

  await advanceBlocks(17281)

  await governorAlphaContract.queue(proposal);
  console.log('Queued');

  await time.increase('172900')
  console.log("Time increased")
  await advanceBlocks(1)
  console.log("Advanced 1")

  console.log("Executing Proposal");
  let tx = await governorAlphaContract.execute(proposal)
  let receipt = await tx.wait()

  console.log(`Executed proposal ${proposal.toString()} @ ${receipt.transactionHash}`)
  console.log(`Gas spend on executing proposal = ${receipt.gasUsed.toString()}\n`)
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