const { ethers, network, upgrades } = require('hardhat')
const { idle, weth, sushiswapRouter02, personWithIdle, personWithWETH } = require('./addresses.integration')
const idleABI = require('../abi/idle.json')
const { time } = require('@openzeppelin/test-helpers')
const { sudo, getLockDuration, checkAproximate, check } = require('./helpers')

const toWei = ethers.utils.parseEther
const toEtherBN = (x) => ethers.BigNumber.from(x.toString())
const toWeek = (x) => toEtherBN(x).div(WEEK).mul(WEEK)

BLOCK_GAS_LIMIT = 12450000
WEEK = 7 * 86400


async function main() {
  if (network.name != 'hardhat') {
    console.error('Integration test can only run on hardhat network')
    return
  }

  const deployer = (await ethers.getSigners())[0]
  const idleContract = await ethers.getContractAt(idleABI, idle)
  const wethContract = await ethers.getContractAt('ERC20', weth)
  const stakedIdle = await (await ethers.getContractFactory('VotingEscrow')).deploy(
    idleContract.address, // Staking Token
    'StakedIDLE', // Token Name
    'stkIDLE', // Token Symbol
    '1.0', // Token Version
    deployer.address
  )
  console.log(`Deployed staked Idle to ${stakedIdle.address}`)

  let startTime = toEtherBN(await time.latest())
  const feeDistributor = await (await ethers.getContractFactory('FeeDistributor')).deploy(
    stakedIdle.address,
    startTime,
    idleContract.address,
    deployer.address,
    deployer.address
  )
  console.log(`Deployed feeDistributor contract to ${feeDistributor.address}`)
  await feeDistributor.toggle_allow_checkpoint_token()

  const SushiswapExchanger = await ethers.getContractFactory("SushiswapExchanger")
  const sushiswapExchanger = await upgrades.deployProxy(
    SushiswapExchanger,
    [sushiswapRouter02, weth, idle, feeDistributor.address])
  console.log(`Deployed sushiswapExchanger contract to ${sushiswapExchanger.address}`)

  await sushiswapExchanger.connect(deployer).addExchanger(deployer.address)

  let [idleContractAsStaker, staker] = await sudo(personWithIdle, idleContract)
  let [wethContractAsOwner] = await sudo(personWithWETH, wethContract)
  await idleContractAsStaker.approve(stakedIdle.address, toWei('1000'))
  console.log("Approved idle for staking")
  await deployer.sendTransaction({to: personWithIdle, value: ethers.utils.parseEther("1.0")});
  
  // hardhat estimates a higher gas limit than what is required
  await stakedIdle.connect(staker).create_lock(toWei('1000'), await getLockDuration(1), {gasLimit: BLOCK_GAS_LIMIT})
  await feeDistributor.checkpoint_token()

  let stakerAddress = await staker.getAddress()
  stakedBalance = await stakedIdle['balanceOf(address)'](stakerAddress)
  checkAproximate(stakedBalance, toWei('250'), "stkIdle balance at lock start should be ~ 250")
  console.log("Created lock")

  let currentTime = await time.latest()
  let currentWeek = await toWeek(currentTime)
  let nextWeek = currentWeek.add(WEEK)
  await time.increaseTo(nextWeek.toString()) // advance to next week

  await feeDistributor.checkpoint_token()

  console.log("Transfering 10 WETH to feeExchanger")
  await wethContractAsOwner.transfer(sushiswapExchanger.address, toWei('10'))
  let idleOut = await sushiswapExchanger.callStatic.exchange(toWei('10'), toWei('1'))
  await sushiswapExchanger.exchange(toWei('10'), idleOut)
  console.log(`Executed exchange. For ${ethers.utils.formatUnits(idleOut)} IDLE`)
  
  // manually checkpoint token.
  // If this call was not made, rewards would be split between 2 weeks.
  // In production this wouldn't happen because 'checkpoint_token' is called within each week
  await feeDistributor.checkpoint_token()

  await time.increase(time.duration.weeks(1)) // advance by 1 week, in order to claim tokens
  await feeDistributor.checkpoint_token()
  console.log("Distributed fees to feeDistributor")

  let balance0 = await idleContract.balanceOf(stakerAddress)
  await feeDistributor.connect(staker)['claim()']()
  let balance1 = await idleContract.balanceOf(stakerAddress)

  check(balance1.sub(balance0), idleOut, "Change in stakers idle balance increased after claim")
}

// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
