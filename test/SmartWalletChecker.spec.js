const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time } = require('@openzeppelin/test-helpers')
const { disableFork } = require('../lib/util'); disableFork() // disable forking for unit testing

const WEEK = 7 * 86400

const toWei = ethers.utils.parseEther
const toEtherBN = (x) => ethers.BigNumber.from(x.toString())

describe("SmartWalletChecker.sol", async () => {
  let deployer, randomAccount
  let votingEscrow
  let smartWalletChecker

  let mockContract1
  let mockContract2

  beforeEach(async () => {
    [deployer, randomAccount] = await ethers.getSigners()

    erc20 = await (await ethers.getContractFactory("ERC20MockWithDelegate")).deploy("Token", "TOK", toWei("20000"))

    votingEscrow = await (await ethers.getContractFactory("VotingEscrow")).deploy(
      erc20.address,
      "Staked Token",
      "stkTOK",
      "1.0",
      deployer.address
    )

    smartWalletChecker = await (await ethers.getContractFactory("SmartWalletChecker")).deploy()

    mockContract1 = await (await ethers.getContractFactory("MockStakerContract")).deploy(erc20.address, votingEscrow.address)
    mockContract2 = await (await ethers.getContractFactory("MockStakerContract")).deploy(erc20.address, votingEscrow.address)

    await votingEscrow.commit_smart_wallet_checker(smartWalletChecker.address)
    await votingEscrow.apply_smart_wallet_checker()
  })

  describe("#enableAddress", async() => {
    it("Enables an address when owner", async() => {
      expect(await smartWalletChecker.check(mockContract1.address)).to.be.false

      await smartWalletChecker.connect(deployer).enableAddress(mockContract1.address)

      expect(await smartWalletChecker.check(mockContract1.address)).to.be.true
    })

    it("Reverts when called by non owner", async() => {
      expect(await smartWalletChecker.check(mockContract1.address)).to.be.false

      expect(smartWalletChecker.connect(randomAccount).enableAddress(mockContract1.address))
        .to.be.revertedWith("Ownable: caller is not the owner")
    })
  })

  describe("#disableAddress", async() => {
    beforeEach(async() => {
      await smartWalletChecker.connect(deployer).enableAddress(mockContract1.address)
    })

    it("Disables an address when owner", async() => {
      expect(await smartWalletChecker.check(mockContract1.address)).to.be.true

      await smartWalletChecker.connect(deployer).disableAddress(mockContract1.address)

      expect(await smartWalletChecker.check(mockContract1.address)).to.be.false
    })
  })

  describe("#check", async() => {
    beforeEach(async() => {
      await smartWalletChecker.connect(deployer).enableAddress(mockContract1.address)
    })
    it("Returns correct value", async() => {
      expect(await smartWalletChecker.check(mockContract1.address)).to.be.true
      expect(await smartWalletChecker.check(mockContract2.address)).to.be.false
    })
    it("Can be called by any address", async() => {
      expect(await smartWalletChecker.connect(randomAccount).check(mockContract1.address)).to.be.true
      expect(await smartWalletChecker.connect(randomAccount).check(mockContract2.address)).to.be.false
    })
  })

  describe("Integrates with voting escrow contract", async() => {
    let amount
    let unlockTime

    beforeEach(async() => {
      await smartWalletChecker.connect(deployer).enableAddress(mockContract1.address)

      amount = toWei("100")
      await erc20.transfer(mockContract1.address, amount)
      await erc20.transfer(mockContract2.address, amount)

      let currentTime = await time.latest()
      unlockTime = toEtherBN(currentTime.add(time.duration.years(1)))

    })
    it("Allows a contract to stake when contract enabled", async() => {
      await mockContract1.create_lock(amount, unlockTime)

      let lockInfo = await votingEscrow.locked(mockContract1.address)
      expect(lockInfo.amount).to.be.equal(amount)
    })
    it("Blocks a contract from staking when disabled", async() => {
      expect(mockContract2.create_lock(amount, unlockTime))
        .to.be.revertedWith("Smart contract depositors not allowed")
    })
  })
})