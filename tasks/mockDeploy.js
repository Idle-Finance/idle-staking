
module.exports = task("mockdeploy", "Deploy contracts for testing")
.setAction(async(args, hre) => {
  const { deployAndSave } = require("../lib/util")

  const toEtherBN = (x) => ethers.BigNumber.from(x.toString())

  const {ethers, getNamedAccounts} = hre
  const { time } = require('@openzeppelin/test-helpers')
  const {idle, weth, sushiswapRouter02} = await getNamedAccounts()

  const [deployer] = await ethers.getSigners()

  console.log('🚀 Deploying stkIDLE contract...')
  const stakedIdle = await deployAndSave('stkIDLE', 'VotingEscrow', [
    idle, // Staking Token
    'StakedIDLE', // Token Name
    'stkIDLE', // Token Symbol
    '1.0', // Token Version
    deployer.address
  ], false, true)

  console.log(`✨ stkIDLE contract deployed to ${stakedIdle.address}\n`)



  console.log('🚀 Deploying FeeDistributor contract...')
  let startTime = toEtherBN(await time.latest())
  const feeDistributor = await deployAndSave('FeeDistributor', 'FeeDistributor', [
    stakedIdle.address, // staking contract
    startTime, // start time for rewards
    idle, // reward token
    deployer.address, // admin
    deployer.address // emergency return
  ], false, true)
  await feeDistributor.connect(deployer).toggle_allow_checkpoint_token()

  console.log(`💰 FeeDistributor contract deployed to ${feeDistributor.address}\n`)



  console.log('🚀 Deploying SushiswapExchanger contract...')
  const sushiswapExchanger = await deployAndSave(
    'SushiswapExchanger', 'SushiswapExchanger',
    [sushiswapRouter02, weth, idle, feeDistributor.address], true, true)
  await sushiswapExchanger.connect(deployer).addExchanger(deployer.address)

  console.log(`🍣 SushiswapExchanger contract deployed to ${sushiswapExchanger.address}`)
})