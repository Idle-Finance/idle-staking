const idleABI = require('../abi/idle.json')
WEEK = 7 * 86400

module.exports = task("topup", "Adds IDLE to fee distributor and increases time to next week")
  .addOptionalParam("amount", "Amount of idle to add", "100")
  .addOptionalParam("feedistributor", "FeeDistributor Address", "")
  .setAction(async(args, hre) => {
    const {ethers, getNamedAccounts} = hre
    const {amount, feedistributor} = args

    const {idle, personWithIdle} = await getNamedAccounts()

    const [deployer] = await ethers.getSigners()

    let FeeDistributor
    if (feedistributor=="") {
      FeeDistributor = await ethers.getContract('FeeDistributor')
    } else {
      FeeDistributor = await ethers.getContractAt('FeeDistributor', feedistributor)
    }

    let idleContract = await ethers.getContractAt(idleABI, idle)
    await deployer.sendTransaction({to: personWithIdle, value: ethers.utils.parseEther("0.1")})
    await network.provider.request({method: "hardhat_impersonateAccount", params: [personWithIdle]});
    const personWithIdleSigner = await ethers.provider.getSigner(personWithIdle);



    const { time } = require('@openzeppelin/test-helpers')
    const toWei = ethers.utils.parseEther
    const toEtherBN = (x) => ethers.BigNumber.from(x.toString())
    const toWeek = (x) => toEtherBN(x).div(WEEK).mul(WEEK)

    await time.increase(time.duration.days(1))
    await FeeDistributor.checkpoint_token()

    let currentTime = await time.latest()
    let currentWeek = await toWeek(currentTime)
    let nextWeek = currentWeek.add(WEEK)
    await time.increaseTo(nextWeek.toString()) // advance to next week

    await FeeDistributor.checkpoint_token()
    await idleContract.connect(personWithIdleSigner).transfer(FeeDistributor.address, toWei(amount))
    await time.increase(time.duration.days(2))
    await FeeDistributor.checkpoint_token()
    
    await time.increase(time.duration.weeks(1)) // advance by 1 week 
    console.log(`Added ${amount} $IDLE to FeeDistributor, and updated checkpoint`)
  })
