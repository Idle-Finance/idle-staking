const { expect } = require('chai')
const { ethers, waffle, upgrades } = require('hardhat')
const {loadFixture} = waffle;
const { disableFork } = require('../lib/util'); disableFork() // disable forking for unit testing

const toWei = ethers.utils.parseEther

describe("FeeExchanger.sol", async() => {
  async function fixture() {
    let signers = await ethers.getSigners()
    const deployer = signers[0]
    const outputAccount = signers[1]
    const randomAccount1 = signers[2]
    const randomAccount2 = signers[3]

    const mockInputToken = await (await ethers.getContractFactory("ERC20Mock")).deploy("InputToken", "IT", toWei("1000000")) // 1,000,000
    const mockOutputToken = await (await ethers.getContractFactory("ERC20Mock")).deploy("OuptutToken", "OT", toWei("1000000")) // 1,000,000

    const feeExchangerFactory = await ethers.getContractFactory("MockFeeExchanger")
    const feeExchanger = await upgrades.deployProxy(
      feeExchangerFactory,
      [mockInputToken.address, mockOutputToken.address, outputAccount.address])

    return {feeExchanger, mockInputToken, mockOutputToken, outputAccount, deployer, randomAccount1, randomAccount2}
  }

  let fixtureData;

  beforeEach(async() => {
    fixtureData = await loadFixture(fixture)
  })

  describe("Ownership", async() => {
    it("Sets contract owner upon deployment", async() => {
      const {feeExchanger, deployer} = fixtureData

      expect(await feeExchanger.owner()).to.equal(deployer.address)
    })
  })

  describe("#addExchanger", async() => {
    it("Can adds exchanger", async() => {
      const { feeExchanger, deployer, randomAccount1 } = fixtureData

      expect(await feeExchanger.canExchange(randomAccount1.address)).to.be.false
      await feeExchanger.connect(deployer).addExchanger(randomAccount1.address)
      expect(await feeExchanger.canExchange(randomAccount1.address)).to.be.true
    })
    it("Cannot add exchanger twice", async() => {
      const { feeExchanger, deployer, randomAccount1 } = fixtureData

      expect(await feeExchanger.canExchange(randomAccount1.address)).to.be.false
      await feeExchanger.connect(deployer).addExchanger(randomAccount1.address)
      expect(feeExchanger.connect(deployer).addExchanger(randomAccount1.address))
        .to.be.revertedWith("FE: NOT EXCHANGER")
    })

    it("Cannot be called by EOA that is not admin", async() => {
      const { feeExchanger, randomAccount1, randomAccount2 } = fixtureData;

      expect(feeExchanger.connect(randomAccount2).addExchanger(randomAccount1.address))
        .to.be.revertedWith("Ownable: caller is not the owner")
    })
  })

  describe("#removeExchanger", async() => {
    beforeEach(async() => {
      const { feeExchanger, deployer, randomAccount1 } = fixtureData

      await feeExchanger.connect(deployer).addExchanger(randomAccount1.address)
    })

    it("Can removed exchanger", async() => {
      const { feeExchanger, deployer, randomAccount1 } = fixtureData

      expect(await feeExchanger.canExchange(randomAccount1.address)).to.be.true
      await feeExchanger.connect(deployer).removeExchanger(randomAccount1.address)
      expect(await feeExchanger.canExchange(randomAccount1.address)).to.be.false
    })

    it("Cannot remove exchanger which is not already an exchanger", async() => {
      const { feeExchanger, deployer, randomAccount2 } = fixtureData

      expect(await feeExchanger.canExchange(randomAccount2.address)).to.be.false
      expect(feeExchanger.connect(deployer).removeExchanger(randomAccount2.address))
        .to.be.revertedWith("FE: NOT EXCHANGER")
    })

    it("Cannot be called by EOA that is not admin", async() => {
      const { feeExchanger, randomAccount1, randomAccount2 } = fixtureData;

      expect(feeExchanger.connect(randomAccount2).removeExchanger(randomAccount1.address))
        .to.be.revertedWith("Ownable: caller is not the owner")
    })
  })

  describe("#canExchange", async() => {
    beforeEach(async() => {
      const { feeExchanger, deployer, randomAccount1 } = fixtureData

      await feeExchanger.connect(deployer).addExchanger(randomAccount1.address)
    })

    it("Returns true when querying address which has exchanger role", async() => {
      const { feeExchanger, randomAccount1 } = fixtureData

      expect(await feeExchanger.canExchange(randomAccount1.address)).to.be.true
    })
    
    it("Returns false when querying address which does not have exchanger role", async() => {
      const { feeExchanger, randomAccount2 } = fixtureData

      expect(await feeExchanger.canExchange(randomAccount2.address)).to.be.false
    })

    it("Can be called by EOA", async() => {
      const { feeExchanger, randomAccount2, randomAccount1 } = fixtureData

      expect(await feeExchanger.connect(randomAccount2).canExchange(randomAccount1.address)).to.be.true
    })
  })

  describe("#inputToken", async() => {
    it("Returns the input token address", async() => {
      const { feeExchanger, mockInputToken } = fixtureData

      expect(await feeExchanger.inputToken()).to.equal(mockInputToken.address)
    })
  })

  describe("#outputToken", async() => {
    it("Returns the output token address", async() => {
      const { feeExchanger, mockOutputToken } = fixtureData

      expect(await feeExchanger.outputToken()).to.equal(mockOutputToken.address)
    })
  })

  describe("#outputAddress", async() => {
    it("Returns the output account address", async() => {
      const { feeExchanger, outputAccount } = fixtureData

      expect(await feeExchanger.outputAddress()).to.equal(outputAccount.address)
    })
  })
})
