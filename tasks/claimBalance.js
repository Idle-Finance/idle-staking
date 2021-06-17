const { types } = require("hardhat/config")

module.exports = task("claimbalance", "Check claim amount on fee distributor")
.addOptionalParam("signernum", "Signer num to check", 0, types.int)
  .setAction(async(args, hre) => {
    const {ethers} = hre
    let {signernum, feedistributor} = args

    const account = (await ethers.getSigners())[signernum].address

    const feeDistributor = await ethers.getContract('FeeDistributor')

    let claimBalance = await feeDistributor.connect(account).callStatic['claim()']()
    console.log(`Claim balance: ${ethers.utils.formatEther(claimBalance.toString())} IDLE`)
})