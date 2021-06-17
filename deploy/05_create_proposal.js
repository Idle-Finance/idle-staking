const governorAlphaABI = require('../abi/governorAlpha.json')
const feeCollectorABI = require('../abi/feeCollector.json')

module.exports = async ({getNamedAccounts, ethers, network}) => {
  console.log(`------------------ Executing deployment 05 on network ${network.name} ------------------\n`)
  const { governorAlpha, feeCollector } = await getNamedAccounts()

  // get deployed contracts
  let feeCollectorContract = await ethers.getContractAt(feeCollectorABI, feeCollector)
  let sushiswapExchanger = await ethers.getContract('SushiswapExchanger')

  // encode calldata
  let allocation = [
    '10000', // Allocation slot 0 = Smart Treasury
    '10000', // Allocation slot 1 = Fee Treasury
    '30000', // Allocation slot 2 = Rebalabcer
    '50000'  // Allocation slot 3 [NEW] = sushiswapExchanger
  ]
  let calldata = ethers.
    utils.
    defaultAbiCoder.
    encode(
      feeCollectorContract
      .interface.functions['addBeneficiaryAddress(address,uint256[])'].inputs,
      [sushiswapExchanger.address, allocation]
    )

  // build proposal for IIP 9

  let _contracts = [feeCollectorContract] // used for decoding data

  let targets = _contracts.map(c => c.address)
  let values = [0]
  let signatures = ['addBeneficiaryAddress(address,uint256[])']
  let calldatas = [calldata]
  
  let _title = 'IIP-9 Enable Single Token Staking for $IDLE'
  let _info = 'Add the Sushiswap Fee Exchanger as a beneficiary to the Fee Collector enabling staking. For more info: <link>'

  let description = `${_title}\n${_info}`

  // decode ABI calldata for validation before submitting tx
  let decodedCalldata = signatures.map((_, i) => {
    return ethers
      .utils.
      defaultAbiCoder.
      decode(
        _contracts[i]
        .interface.functions[signatures[i]].inputs,
        calldatas[i]
      ).toString()
  })

  // Get GovernorAlpha
  let governorAlphaContract = await ethers.getContractAt(governorAlphaABI, governorAlpha)
  let proposalCount = await governorAlphaContract.proposalCount()

  // log arguments for proposal
  console.log(`Creating proposal ${proposalCount.add('1').toString()} with args:`)
  console.log(`..targets            = ${targets}`)
  console.log(`..values             = ${values}`)
  console.log(`..signatures         = ${signatures}`)
  console.log(`..calldata           = ${calldatas}`)
  console.log(`..calldata[decoded]  = ${decodedCalldata}`)
  console.log(`...description       = ${description.replace('\n', '\\n')}`)
  console.log()

  // create proposal
  let tx = await governorAlphaContract.propose(
    targets,
    values,
    signatures,
    calldatas,
    description
  )

  let receipt = await tx.wait()
  let newProposalCount = await governorAlphaContract.proposalCount()

  console.log(`Created proposal ${newProposalCount.toString()} @ ${receipt.transactionHash}\n`)
  return true
}

module.exports.id = '5' // flag to only run this migration once