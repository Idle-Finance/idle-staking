const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time } = require('@openzeppelin/test-helpers')

const WEEK = 7 * 86400

const toWei = ethers.utils.parseEther
const toEtherBN = (x) => ethers.BigNumber.from(x.toString())
const toWeek = (x) => toEtherBN(x).div(WEEK).mul(WEEK)

async function getLockDuration(durationInYears) {
  let currentTime = await time.latest()
  return toEtherBN(currentTime.add(time.duration.years(durationInYears)))
}

const distributeTokenToStaker = async (erc20, staker, amount='1000') => {
  erc20.transfer(staker.address, toWei(amount))
  return staker
}

const lockTokenForDuration = async(erc20, veTok, staker, amount='1000', duration=1) => {
  await distributeTokenToStaker(erc20, staker, amount)

  await erc20.connect(staker).approve(veTok.address, toWei(amount))
  let lockEnd = await getLockDuration(duration)

  await veTok.connect(staker).create_lock(toWei(amount), lockEnd)
}

describe("FeeDistributor.vy", async () => {
  let deployer
  let stakers

  let erc20
  let erc20Reward
  let veTok
  let feeDistributor

  let startTime
  let startWeek

  beforeEach(async () => {
    [deployer, ...stakers] = await ethers.getSigners()
    erc20 = await (await ethers.getContractFactory("ERC20MockWithDelegate")).deploy("Token", "TOK", toWei("20000"))
    erc20Reward = await (await ethers.getContractFactory("ERC20Mock")).deploy("Reward", "REW", toWei("20000"))

    veTok = await (await ethers.getContractFactory("VotingEscrow")).deploy(
      erc20.address,
      "Staked Token",
      "stkTOK",
      "1.0",
      deployer.address
    )

    startTime = toEtherBN(await time.latest())
    feeDistributor = await (await ethers.getContractFactory("FeeDistributor")).deploy(
      veTok.address,
      startTime,
      erc20Reward.address,
      deployer.address,
      deployer.address
    )

    startWeek = await feeDistributor.start_time() // cache the contract start week value
  })

  describe('#__init__', async () => {
    it("Should configure all time parameters", async () => {
      expect(await feeDistributor.start_time()).to.closeTo(startTime, WEEK)
      expect(await feeDistributor.last_token_time()).to.closeTo(startTime, WEEK)
      expect(await feeDistributor.time_cursor()).to.closeTo(startTime, WEEK)
    })
    it("Should set veToken", async () => {
      expect(await feeDistributor.voting_escrow()).to.equal(veTok.address)
    })
    it("Should set reward token", async () => {
      expect(await feeDistributor.token()).to.equal(erc20Reward.address)
    })
    it("Should set admin addresses", async () => {
      expect(await feeDistributor.admin()).to.equal(deployer.address)
      expect(await feeDistributor.emergency_return()).to.equal(deployer.address)
    })

    it("Should have can_checkpoint_token as false", async() => {
      expect(await feeDistributor.can_checkpoint_token()).to.be.false
    })
})
  describe("#checkpoint_token", async () => {
    describe("When balance of reward token == 0", async () => {
      it("Emits a CheckpointToken log", async () => {
        await expect(feeDistributor.checkpoint_token())
          .to.emit(feeDistributor, "CheckpointToken")
      })
    })
    describe("When balance of reward token > 0", async () => {
      let toDistribute = toWei('1000')
      beforeEach(async () => {
        await erc20Reward.transfer(feeDistributor.address, toDistribute)
        await feeDistributor.checkpoint_token()
      })
      it("Updates Tokens per week array", async () => {
        expect(await feeDistributor.tokens_per_week(startWeek))
          .to.equal(toDistribute)
      })
    })
  })
  describe("#claim", async () => {
    let toDistribute = toWei('1000')
    let distributeFees = async() => {
      /*
      Fees are distributed weekly based on the users proportion of stkIDLE to the total supply.
      Total supply is calculated at the start of each week.

      Fees can be claimed at the end of the week.

      Fees are checkpointed using the `checkpoint_token` function daily.

      Fees received between the last checkpoint of the previous week, and the first checkpoint of the next week are split evently.
      */

      // First checkpoint - incase no checkpoint was made since the previous week
      await feeDistributor.checkpoint_token()

      let currentTime = await time.latest()
      let currentWeek = await toWeek(currentTime)
      let nextWeek = currentWeek.add(WEEK)
      await time.increaseTo(nextWeek.toString()) // advance to next week

      await feeDistributor.checkpoint_token() // first checkpoint of the new week
      await erc20Reward.transfer(feeDistributor.address, toDistribute) // distribute fee
      await feeDistributor.checkpoint_token() // checkpoint

      await time.increase(time.duration.weeks(1)) // advance by 1 week 
      await feeDistributor.checkpoint_token() // checkpoint new week.

      // at this point fee's can be claimed by stakers
    }
    describe("When #stakers = 0", async () => {
      beforeEach(() => {
        distributeFees()
      })
      it('Fails to claim', async() => {
        expect(feeDistributor.connect(stakers[0])['claim()']()).to.be.reverted
      })
    })
    describe("When #stakers = 1", async () => {
      let staker

      beforeEach(async() => {
        staker = stakers[0]
        await lockTokenForDuration(erc20, veTok, staker)
        await distributeFees()
      })
      it('Claims full token balance', async() => {
        await expect(() => feeDistributor.connect(staker)['claim()']())
          .to.changeTokenBalances(erc20Reward, [staker, feeDistributor], [toWei('1000'), toWei('-1000')])
      })
    })
    describe("When #stakers > 1", async () => {
      let staker1
      let staker2

      beforeEach(async() => {
        staker1 = stakers[0]
        staker2 = stakers[1]
      })
      it("Distributes rewards when to staked evenly", async() => {
        await lockTokenForDuration(erc20, veTok, staker1)
        await lockTokenForDuration(erc20, veTok, staker2)
        await distributeFees()

        await expect(() => feeDistributor.connect(staker1)['claim()']())
          .to.changeTokenBalances(erc20Reward, [staker1, feeDistributor], [toWei('500'), toWei('-500')])
        await expect(() => feeDistributor.connect(staker2)['claim()']())
          .to.changeTokenBalances(erc20Reward, [staker2, feeDistributor], [toWei('500'), toWei('-500')])
      })
      it("Distributed rewards when staked unevenly", async() => {
        await lockTokenForDuration(erc20, veTok, staker1,amount='3000')
        await lockTokenForDuration(erc20, veTok, staker2)
        await distributeFees()

        await expect(() => feeDistributor.connect(staker1)['claim()']())
          .to.changeTokenBalances(erc20Reward, [staker1, feeDistributor], [toWei('750'), toWei('-750')])
        await expect(() => feeDistributor.connect(staker2)['claim()']())
          .to.changeTokenBalances(erc20Reward, [staker2, feeDistributor], [toWei('250'), toWei('-250')])
      })
      it("Handles distribution when extending lock during week", async() => {
        await lockTokenForDuration(erc20, veTok, staker1)
        await lockTokenForDuration(erc20, veTok, staker2)

        await feeDistributor.checkpoint_token()

        let nextWeek = toWeek(await time.latest()).add(WEEK)
        await time.increaseTo(nextWeek.toString())

        await feeDistributor.checkpoint_token()
        await erc20Reward.transfer(feeDistributor.address, toDistribute)
        await feeDistributor.checkpoint_token()

        // Increase lock time of a user during the week
        time.increase(time.duration.days(1))
        await veTok.connect(staker1).increase_unlock_time(await getLockDuration(4))

        await time.increase(time.duration.days(6)) // advance to next week
        await feeDistributor.checkpoint_token()

        // claim amounts should be the same
        await expect(() => feeDistributor.connect(staker1)['claim()']())
          .to.changeTokenBalances(erc20Reward, [staker1, feeDistributor], [toWei('500'), toWei('-500')])
        await expect(() => feeDistributor.connect(staker2)['claim()']())
          .to.changeTokenBalances(erc20Reward, [staker2, feeDistributor], [toWei('500'), toWei('-500')])
      })
    })
  })
})