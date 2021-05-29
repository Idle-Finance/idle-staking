const governorAlphaABI = require('../abi/governorAlpha.json')
const feeCollectorABI = require('../abi/feeCollector.json')

module.exports = async ({getNamedAccounts, ethers, network}) => {
  console.log(`------------------ Executing deployment 04 on network ${network.name} ------------------\n`)
  const { governorAlpha, feeCollector } = await getNamedAccounts()

  let feeCollectorContract = await ethers.getContractAt(feeCollectorABI, feeCollector)
  let feeDistributor = await ethers.getContract('FeeDistributor')

  let allocation = [
    '10000', // Allocation slot 0 = Smart Treasury
    '10000', // Allocation slot 1 = Fee Treasury
    '35000', // Allocation slot 2 = Rebalabcer
    '45000'   // Allocation slot 3 [NEW] = feeDistributor
  ]
  let calldata = feeCollectorContract
    .interface
    .encodeFunctionData(
      'addBeneficiaryAddress(address,uint256[])' ,
      [feeDistributor.address, allocation]
    )

  // build proposal for IIP 9

  let contracts = [feeCollectorContract]

  let targets = contracts.map(c => c.address)
  let values = [0]
  let signatures = ['addBeneficiaryAddress(address,uint256[])']
  let calldatas = [calldata]
  
  let title = 'IIP-9 Add FeeDistributor as beneficiary to FeeCollector'
  let info = 'Add the feeDistributor as a beneficiary to the feeCollector enabling staking. For more info: <link>'

  let description = `${title}\n${info}`

  let decodedCalldata = signatures.map((_, i) => {
    return contracts[i]
      .interface
      .decodeFunctionData(signatures[i], calldatas[i])
      .toString()
  })

  // Get GovernorAlpha
  let governorAlphaContract = await ethers.getContractAt(governorAlphaABI, governorAlpha)
  let proposalCount = await governorAlphaContract.proposalCount()

  console.log(`Creating proposal ${proposalCount.add('1').toString()} with args`)
  console.log(`..targets            = ${targets}`)
  console.log(`..values             = ${values}`)
  console.log(`..signatures         = ${signatures}`)
  console.log(`..calldatas[decoded] = ${decodedCalldata}`)
  console.log(`..description        = ${description.replace('\n', '\\n')}`)

  let tx = await governorAlphaContract.propose(
    targets,
    values,
    signatures,
    calldatas,
    description
  )

  let receipt = await tx.wait()
  let newProposalCount = await governorAlphaContract.proposalCount()

  console.log(`Created proposal ${newProposalCount.toString()} @ ${receipt.transactionHash}`)
  console.log()
  return true
}

module.exports.id = '4'
