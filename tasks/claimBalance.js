const { types } = require("hardhat/config")

module.exports = task("claimbalance", "Check claim amount on fee distributor")
  .addOptionalParam("signernum", "Signer num to check", 0, types.int)
  .addOptionalParam("feedistributor", "FeeDistributor Address", "")
  .setAction(async(args, hre) => {
    const {ethers} = hre
    let {signernum, feedistributor} = args

    const account = (await ethers.getSigners())[signernum].address

    let FeeDistributor
    if (feedistributor=="") {
      FeeDistributor = await ethers.getContract('FeeDistributor')
    } else {
      FeeDistributor = await ethers.getContractAt('FeeDistributor', feedistributor)
    }

    let claimBalance = await FeeDistributor.connect(account).callStatic['claim()']()
    console.log(`Claim balance: ${ethers.utils.formatEther(claimBalance.toString())} IDLE`)
})