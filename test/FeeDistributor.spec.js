const { expect } = require('chai')
const { ethers } = require('hardhat')
const { time } = require('@openzeppelin/test-helpers')

const toWei = ethers.utils.parseEther;
const toEtherBN = (x) => ethers.BigNumber.from(x.toString());

describe("FeeDistributor.vy", async () => {
  let deployer
  let stakers

  let erc20
  let erc20Reward
  let veTok
  let feeDistributor

  let startTime

  let WEEK = 7 * 86400

  beforeEach(async () => {
    [deployer, ...stakers] = await ethers.getSigners()
    erc20 = await (await ethers.getContractFactory("ERC20Mock")).deploy("Token", "TOK", toWei("20000"))
    erc20Reward = await (await ethers.getContractFactory("ERC20Mock")).deploy("Reward", "REW", toWei("20000"))

    veTok = await (await ethers.getContractFactory("VotingEscrow")).deploy(
      erc20.address,
      "Staked Token",
      "stkTOK",
      "1.0"
    )

    startTime = toEtherBN(await time.latest())
    feeDistributor = await (await ethers.getContractFactory("FeeDistributor")).deploy(
      veTok.address,
      startTime,
      erc20Reward.address,
      deployer.address,
      deployer.address
    )
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
})
describe("#checkpoint_token", async () => {
    describe("When can_checkpoint_token == false", async () => {
      it("Emits a CheckpointToken log", async () => {
        let currentTimestamp = toEtherBN(await time.latest())
        expect(feeDistributor.checkpoint_token())
          .to.emit(feeDistributor, "CheckpointToken")
          .withArgs(currentTimestamp, 0)
      })
    })
  })
})