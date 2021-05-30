const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time } = require('@openzeppelin/test-helpers')
const { disableFork } = require('../lib/util'); disableFork() // disable forking for unit testing

const toWei = ethers.utils.parseEther;
const toEtherBN = (x) => ethers.BigNumber.from(x.toString());

// distribute `amount` of `erc20` token to the first `staker`
const distributeTokenToFirstStaker = async (erc20, stakers, amount='1000') => {
  erc20.transfer(stakers[0].address, toWei(amount))
  return stakers[0]
}

async function getLockDuration(durationInYears) {
  let currentTime = await time.latest()
  return toEtherBN(currentTime.add(time.duration.years(durationInYears)))
}

describe("VotingEscrow.vy", () => {
  let deployer
  let stakers

  let erc20
  let mockIdle
  let veTok

  let WEEK = 7 * 86400 // 1 week in seconds
  let MAX_LOCKTIME = 4 * 365 * 86400 // 4 years in seconds

  beforeEach(async () => {
    [deployer, ...stakers] = await ethers.getSigners()
    erc20 = await (await ethers.getContractFactory("ERC20MockWithDelegate")).deploy("Token", "TOK", toWei("20000"))

    veTok = await (await ethers.getContractFactory("VotingEscrow")).deploy(
      erc20.address,
      "Staked Token",
      "stkTOK",
      "1.0",
      deployer.address
    )
  })
  describe("#__init__", async () => {
    it("Should set controller as deployer", async  () => {
      expect(await veTok.controller()).to.equal(deployer.address)
    })
    it("Should set admin as deployer", async () => {
      expect(await veTok.admin()).to.equal(deployer.address)
    })
    it("Should set staking token correctly", async () => {
      expect(await veTok.token()).to.equal(erc20.address)
    })
    it("Should set token name correctly", async () => {
      expect(await veTok.name()).to.equal("Staked Token")
    })
    it("Should set token symbol correctly", async () => {
      expect(await veTok.symbol()).to.equal("stkTOK")
    })
    it('Should set vote delegatee', async() => {
      expect(await veTok.vote_delegatee()).to.equal(deployer.address)
    })
    it('Should set vote delegate on token', async() => {
      expect(await erc20.delegates(veTok.address)).to.equal(deployer.address)
    })
  })

  describe('#create_lock()', async () => {
    let amount
    let staker
    
    beforeEach(async () => {
      amount = toWei('1000')
      staker = await distributeTokenToFirstStaker(erc20, stakers)
      
      await erc20.connect(staker).approve(veTok.address, amount);
    })
    
    it('Transfers token to contract', async () => {
      // Verify staker balance REDUCES, and contract balance INCREASES 
      await expect(() => veTok.connect(staker).create_lock(amount, getLockDuration(1)))
        .to.changeTokenBalances(erc20, [staker, veTok], [toWei('-1000'), toWei('1000')])
    })

    describe('When locking for 4 years', async () => {
      let lockEnd

      beforeEach(async () => {
        lockEnd = await getLockDuration(4)
        await veTok.connect(staker).create_lock(amount, lockEnd)
      })

      it("Increases supply", async () => {
        expect(await veTok.supply()).to.equal(amount)
      })
      it("Creates a LockedBalance", async() => {
        let [stakedAmount, end] = await veTok.locked(staker.address)
        
        expect(stakedAmount).to.equal(amount)
        expect(end).to.be.closeTo(lockEnd, WEEK) // the contract rounds down to the closest week
      })
      it("Updates staked balance", async () => {
        let stakedBalance = await veTok['balanceOf(address)'](staker.address)
        expect(stakedBalance).to.be.closeTo(amount, toWei('10'))
      })
      it("Cannot create a new lock before expiry", async () => {
        expect(veTok.connect(staker).create_lock(amount, getLockDuration(1)))
          .to.be.revertedWith('Withdraw old tokens first')
      })
    })
  })

  describe('#withdraw()', async () => {
    describe("When supply > 0", async () => {
      let amount
      let staker

      beforeEach(async () => {
        amount = toWei('1000')

        staker = await distributeTokenToFirstStaker(erc20, stakers)
        await erc20.connect(staker).approve(veTok.address, amount);
        await veTok.connect(staker).create_lock(amount, getLockDuration(1))
      })

      it("Reverts when withdrawing before lock expires", async () => {
        expect(veTok.connect(staker).withdraw()).to.be.revertedWith("The lock didn't expire")
      })
      it("Can withdraw after lock expires", async () => {
        // Need to call checkpoint atleast once a year otherwise the contract becomes locked
        await time.increase(time.duration.years(1))

        // token is transfered from contract to staker
        await expect(() => veTok.connect(staker).withdraw()).
          to.changeTokenBalances(erc20, [staker, veTok], [toWei('1000'), toWei('-1000')])
      })
    })
  })
  describe('#update_delegate', async() => {
    let account1
    let account2

    beforeEach(async() => {
      account1 = stakers[0]
      account2 = stakers[1]
    })
    it('Reverts when called by non-admin EOA', async() => {
      expect(veTok.connect(account1).update_delegate(account2.address)).to.be.reverted
      expect(await veTok.vote_delegatee()).to.equal(deployer.address)
    })
    it('To execute when called by owner', async() => {
      await veTok.connect(deployer).update_delegate(account1.address)
      expect(await veTok.vote_delegatee()).to.equal(account1.address)
    })
  })
})