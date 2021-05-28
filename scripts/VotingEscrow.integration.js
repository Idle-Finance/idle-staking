const { sudo, getLockDuration, check, checkAproximate } = require('./helpers')
const { idle, personWithIdle } = require('./addresses.integration')
const idleABI = require('../abi/idle.json')
const { ethers, network } = require('hardhat');
const { time } = require('@openzeppelin/test-helpers');

const toWei = ethers.utils.parseEther;

BLOCK_GAS_LIMIT = 12450000

async function main() {
  if (network.name != 'local') {
    console.error('Integration test can only run on local network')
    return
  }

  let deployer = (await ethers.getSigners())[0]
  let idleContract = await ethers.getContractAt(idleABI, idle)
  let stakedIdle = await (await ethers.getContractFactory('VotingEscrow')).deploy(
    idleContract.address, // Staking Token
    'StakedIDLE', // Token Name
    'stkIDLE', // Token Symbol
    '1.0', // Token Version
    deployer.address
  )
  console.log("Deployed staked Idle")
  await deployer.sendTransaction({
    to: personWithIdle,
    value: ethers.utils.parseEther("1.0")
  });

  let idleDelegate = await idleContract.delegates(stakedIdle.address)
  check(idleDelegate, deployer.address, 'Contract sets delegate')
  
  let [idleContractAsStaker, staker] = await sudo(personWithIdle, idleContract)
  await idleContractAsStaker.approve(stakedIdle.address, toWei('1000'))
  console.log("Approved idle for staking")

  let lockEnd = await getLockDuration(1)
  
  // hardhat estimates a higher gas limit than what is required
  await stakedIdle.connect(staker).create_lock(toWei('1000'), lockEnd, {gasLimit: BLOCK_GAS_LIMIT})
  console.log("Created lock")

  let stakedBalance
  let stakerAddress = await staker.getAddress()
  stakedBalance = await stakedIdle['balanceOf(address)'](stakerAddress)
  checkAproximate(stakedBalance, toWei('250'), "stkIdle balance at lock start should be ~ 250")

  time.increase(time.duration.years(1))
  stakedBalance = await stakedIdle['balanceOf(address)'](stakerAddress)
  check(stakedBalance, toWei('0'), "stkIdle balance at lock end should be ~ 0")

  await stakedIdle.connect(staker).withdraw({gasLimit: 12450000})
}

// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });