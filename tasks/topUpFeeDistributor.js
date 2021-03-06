const idleABI = require('../abi/idle.json')
WEEK = 7 * 86400

function timeConverter(timestamp){
  var a = new Date(parseInt(timestamp.toString()) * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return "Current Time: " + time;
} 

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

    console.log(timeConverter(await time.latest()))
    await time.increase(time.duration.days(1))
    await FeeDistributor.checkpoint_token()

    let currentTime = await time.latest()
    let currentWeek = await toWeek(currentTime)
    let nextWeek = currentWeek.add(WEEK)
    await time.increaseTo(nextWeek.toString()) // advance to next week
    console.log(timeConverter(await time.latest()))

    await FeeDistributor.checkpoint_token()
    await idleContract.connect(personWithIdleSigner).transfer(FeeDistributor.address, toWei(amount))
    await time.increase(time.duration.days(1))
    await FeeDistributor.checkpoint_token()
    
    await time.increase(time.duration.weeks(1)) // advance by 1 week 
    console.log(`Added ${amount} $IDLE to FeeDistributor, and updated checkpoint`)
    console.log(timeConverter(await time.latest()))
  })
