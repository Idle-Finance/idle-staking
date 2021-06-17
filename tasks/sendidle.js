const idleABI = require('../abi/idle.json')

const { types } = require("hardhat/config")

module.exports = task("sendidle", "Sends IDLE to signer")
  .addOptionalParam("amount", "Amount of idle to add", "100")
  .addOptionalParam("signernum", "Signer num to check", 0, types.int)
  .setAction(async(args, hre) => {
    const {ethers, getNamedAccounts} = hre
    const {amount, signernum} = args

    const toWei = ethers.utils.parseEther

    const {idle, personWithIdle} = await getNamedAccounts()

    const [deployer] = await ethers.getSigners()
    const account = (await ethers.getSigners())[signernum].address

    let idleContract = await ethers.getContractAt(idleABI, idle)
    await deployer.sendTransaction({to: personWithIdle, value: ethers.utils.parseEther("0.1")})
    await network.provider.request({method: "hardhat_impersonateAccount", params: [personWithIdle]});
    
    const personWithIdleSigner = await ethers.provider.getSigner(personWithIdle);
    await idleContract.connect(personWithIdleSigner).transfer(account, toWei(amount))

    console.log(`Transfered ${amount} $IDLE to ${account}`)
})
