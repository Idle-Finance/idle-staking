const idleABI = require('../abi/idle.json')
WEEK = 7 * 86400

module.exports = task("topup", "Adds IDLE to fee distributor and increases time to next week")
  .addOptionalParam("amount", "Amount of idle to add", "100")
  .setAction(async(args, hre) => {
    const {ethers, getNamedAccounts} = hre
    const {amount} = args

    const {idle, personWithIdle} = await getNamedAccounts()

    const [deployer] = await ethers.getSigners()

    let idleContract = await ethers.getContractAt(idleABI, idle)
    await deployer.sendTransaction({to: personWithIdle, value: ethers.utils.parseEther("0.1")})
    await network.provider.request({method: "hardhat_impersonateAccount", params: [personWithIdle]});
    const personWithIdleSigner = await ethers.provider.getSigner(personWithIdle);



    const { time } = require('@openzeppelin/test-helpers')
    const toWei = ethers.utils.parseEther
    const toEtherBN = (x) => ethers.BigNumber.from(x.toString())
    const toWeek = (x) => toEtherBN(x).div(WEEK).mul(WEEK)

    let feeDistributor = await ethers.getContract('FeeDistributor')
    await time.increase(time.duration.days(1))
    await feeDistributor.checkpoint_token()

    let currentTime = await time.latest()
    let currentWeek = await toWeek(currentTime)
    let nextWeek = currentWeek.add(WEEK)
    await time.increaseTo(nextWeek.toString()) // advance to next week

    await feeDistributor.checkpoint_token()
    await idleContract.connect(personWithIdleSigner).transfer(feeDistributor.address, toWei(amount))
    await time.increase(time.duration.days(2))
    await feeDistributor.checkpoint_token()
    
    await time.increase(time.duration.weeks(1)) // advance by 1 week 
    console.log(`Added ${amount} $IDLE to feeDistributor, and updated checkpoint`)
  })
