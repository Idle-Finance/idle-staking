const { int } = require('hardhat/internal/core/params/argumentTypes')
const idleABI = require('../abi/idle.json')
BLOCK_GAS_LIMIT = 12450000

const { types } = require("hardhat/config")

module.exports = task("stake", "Stake IDLE in stkIDLE contract")
.addOptionalParam("amount", "Amount of idle to add", "100")
.addOptionalParam("signernum", "Signer index to use for staking", 0, types.int)
.setAction(async(args, hre) => {
  const { time } = require('@openzeppelin/test-helpers')
  const {ethers, getNamedAccounts} = hre
  const {amount, signernum} = args

  const toWei = ethers.utils.parseEther
  const toEtherBN = (x) => ethers.BigNumber.from(x.toString());

  const {idle, personWithIdle} = await getNamedAccounts()

    const account = (await ethers.getSigners())[signernum]

    const idleContract = await ethers.getContractAt(idleABI, idle)
    const stakedIdle = await ethers.getContract('stkIDLE')

    await account.sendTransaction({to: personWithIdle, value: ethers.utils.parseEther("0.1")})
    await network.provider.request({method: "hardhat_impersonateAccount", params: [personWithIdle]});
    const personWithIdleSigner = await ethers.provider.getSigner(personWithIdle);

    await idleContract.connect(personWithIdleSigner).transfer(account.address, toWei(amount))
    await idleContract.connect(account).approve(stakedIdle.address, toWei(amount))

    let currentTime = await time.latest()
    let unlockTimestamp = toEtherBN(currentTime.add(time.duration.years(4)))
    await stakedIdle.connect(account).create_lock(toWei(amount), unlockTimestamp, {gasLimit: BLOCK_GAS_LIMIT})
    console.log(`Staked ${amount} $IDLE for 4 years for ${account.address}`)
})