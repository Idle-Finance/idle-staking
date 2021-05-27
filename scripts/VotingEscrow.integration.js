const { sudo, getLockDuration } = require('./helpers')
const { idle, personWithIdle } = require('./addresses.integration')
const { ethers, network } = require('hardhat')

const toWei = ethers.utils.parseEther;

BLOCK_GAS_LIMIT = 12450000

async function main() {
  if (network.name != 'local') {
    console.error('Integration test can only run on local network')
    return
  }

  let idleContract = await ethers.getContractAt('ERC20', idle)
  let stakedIdle = await (await ethers.getContractFactory('VotingEscrow')).deploy(
    idleContract.address, // Staking Token
    'StakedIDLE', // Token Name
    'stkIDLE', // Token Symbol
    '1.0', // Token Version
    (await ethers.getSigners())[0].address
  )
  console.log("Deployed staked Idle")

  let [idleContractAsStaker, staker] = await sudo(personWithIdle, idleContract)
  await idleContractAsStaker.approve(stakedIdle.address, toWei('1000'))
  console.log("Approved idle for staking")

  let lockEnd = await getLockDuration(1)
  
  // hardhat estimates a higher gas limit than what is required
  await stakedIdle.connect(staker).create_lock(toWei('1000'), lockEnd, {gasLimit: BLOCK_GAS_LIMIT})
  console.log("Created lock")
}

// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });