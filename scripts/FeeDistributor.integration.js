const { ethers, network } = require('hardhat')
const { idle, weth, personWithIdle, personWithWETH } = require('./addresses.integration')
const idleABI = require('../abi/idle.json')
const { time } = require('@openzeppelin/test-helpers')
const { sudo, getLockDuration, checkAproximate } = require('./helpers')

const toWei = ethers.utils.parseEther
const toEtherBN = (x) => ethers.BigNumber.from(x.toString())
const toWeek = (x) => toEtherBN(x).div(WEEK).mul(WEEK)

BLOCK_GAS_LIMIT = 12450000
WEEK = 7 * 86400

async function main() {
  if (network.name != 'local') {
    console.error('Integration test can only run on local network')
    return
  }

  let deployer = (await ethers.getSigners())[0]
  let idleContract = await ethers.getContractAt(idleABI, idle)
  let wethContract = await ethers.getContractAt('ERC20', weth)
  let stakedIdle = await (await ethers.getContractFactory('VotingEscrow')).deploy(
    idleContract.address, // Staking Token
    'StakedIDLE', // Token Name
    'stkIDLE', // Token Symbol
    '1.0', // Token Version
    deployer.address
  )
  console.log("Deployed staked Idle")

  startTime = toEtherBN(await time.latest())
  let feeDistributor = await (await ethers.getContractFactory('FeeDistributor')).deploy(
    stakedIdle.address,
    startTime,
    wethContract.address,
    deployer.address,
    deployer.address
  )
  console.log(`Deployed feeDistributor contract to ${feeDistributor.address}`)
  await feeDistributor.toggle_allow_checkpoint_token()
  await feeDistributor.checkpoint_token()

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
  await wethContractAsOwner.transfer(feeDistributor.address, toWei('100'))
  await feeDistributor.checkpoint_token()

  await time.increase(time.duration.weeks(2)) // advance by 1 week 
  // await feeDistributor.checkpoint_token()
  console.log("Distributed fees to feeDistributor")

  console.log((await wethContract.balanceOf(stakerAddress)).toString())
  await feeDistributor.connect(staker)['claim()']()
  console.log((await wethContract.balanceOf(stakerAddress)).toString())

}

// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });