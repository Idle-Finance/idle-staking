const idleABI = require('../abi/idle.json')
BLOCK_GAS_LIMIT = 12450000

const { types } = require("hardhat/config")

module.exports = task("stakebalance", "Stake IDLE in stkIDLE contract")
.addOptionalParam("signernum", "Signer num to check", 0, types.int)
.addOptionalParam('stkidle', "stkIDLE address", "")
.setAction(async(args, hre) => {
  const {ethers} = hre
  let {signernum, stkidle} = args

  const account = (await ethers.getSigners())[signernum].address

  let stakedIdle
  if (stkidle == "") {
    stakedIdle = await ethers.getContract('stkIDLE')
  } else {
    stakedIdle = await ethers.getContractAt('VotingEscrow', stkidle)
  }

  let lockInfo = await stakedIdle.locked(account, {gasLimit: BLOCK_GAS_LIMIT})
  let stakedBalance = await stakedIdle['balanceOf(address)'](account)
  console.log(`Stake info for ${account}`)
  console.log(`locked amount: ${ethers.utils.formatEther(lockInfo.amount.toString())} IDLE`)
  console.log(`unlock timestamp: ${lockInfo.end.toString()}`)
  console.log()
  console.log(`stkIDLE balance: ${ethers.utils.formatEther(stakedBalance.toString())} stkIDLE`)
})