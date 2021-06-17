const { expect } = require('chai')
const { ethers, waffle, upgrades } = require('hardhat')
const { loadFixture } = waffle;
const { disableFork } = require('../lib/util'); disableFork() // disable forking for unit testing

const toWei = ethers.utils.parseEther

describe("FeeExchanger.sol", async() => {
  async function fixture() {
    const [deployer, outputAccount, randomAccount1, randomAccount2] = await ethers.getSigners()

    const mockInputToken = await (await ethers.getContractFactory("ERC20Mock")).deploy("InputToken", "IT", toWei("1000000")) // 1,000,000
    const mockOutputToken = await (await ethers.getContractFactory("ERC20Mock")).deploy("OuptutToken", "OT", toWei("1000000")) // 1,000,000

    const FeeExchanger = await ethers.getContractFactory("MockFeeExchanger")
    const feeExchanger = await upgrades.deployProxy(
      FeeExchanger,
      [mockInputToken.address, mockOutputToken.address, outputAccount.address])

    return {feeExchanger, mockInputToken, mockOutputToken, outputAccount, deployer, randomAccount1, randomAccount2}
  }

  let fixtureData;

  beforeEach(async() => {
    fixtureData = await loadFixture(fixture)
  })

  describe("#__FeeExchanger_init", async() => {
    it("Sets contract owner", async() => {
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
      await expect(feeExchanger.connect(deployer).addExchanger(randomAccount1.address))
        .to.be.revertedWith("FE: ALREADY EXCHANGER")
    })

    it("Cannot be called by address that is not admin", async() => {
      const { feeExchanger, randomAccount1, randomAccount2 } = fixtureData;

      await expect(feeExchanger.connect(randomAccount2).addExchanger(randomAccount1.address))
        .to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("Emits ExchangerUpdated event with canExchange=true", async() => {
      const { feeExchanger, deployer, randomAccount1 } = fixtureData

      await expect(feeExchanger.connect(deployer).addExchanger(randomAccount1.address))
        .to.emit(feeExchanger, "ExchangerUpdated")
        .withArgs(randomAccount1.address, true)
    })
  })

  describe("#removeExchanger", async() => {
    beforeEach(async () => {
      const { feeExchanger, deployer, randomAccount1 } = fixtureData

      await feeExchanger.connect(deployer).addExchanger(randomAccount1.address)
    })

    it("Can remove exchanger", async() => {
      const { feeExchanger, deployer, randomAccount1 } = fixtureData

      expect(await feeExchanger.canExchange(randomAccount1.address)).to.be.true
      await feeExchanger.connect(deployer).removeExchanger(randomAccount1.address)
      expect(await feeExchanger.canExchange(randomAccount1.address)).to.be.false
    })

    it("Cannot remove exchanger which is not already an exchanger", async() => {
      const { feeExchanger, deployer, randomAccount2 } = fixtureData

      expect(await feeExchanger.canExchange(randomAccount2.address)).to.be.false
      await expect(feeExchanger.connect(deployer).removeExchanger(randomAccount2.address))
        .to.be.revertedWith("FE: NOT EXCHANGER")
    })

    it("Cannot be called by address that is not admin", async() => {
      const { feeExchanger, randomAccount1, randomAccount2 } = fixtureData;

      await expect(feeExchanger.connect(randomAccount2).removeExchanger(randomAccount1.address))
        .to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("Emits ExchangerUpdated event with canExchange=false", async() => {
      const { feeExchanger, deployer, randomAccount1 } = fixtureData

      await expect(feeExchanger.connect(deployer).removeExchanger(randomAccount1.address))
        .to.emit(feeExchanger, "ExchangerUpdated")
        .withArgs(randomAccount1.address, false)
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

    it("Can be called by random address", async() => {
      const { feeExchanger, randomAccount2, randomAccount1 } = fixtureData

      expect(await feeExchanger.connect(randomAccount2).canExchange(randomAccount1.address)).to.be.true
    })
  })

  describe("#updateOutputAddress", async() => {
    it("Changes output address", async() => {
      const { feeExchanger, deployer, outputAccount, randomAccount1 } = fixtureData

      expect(await feeExchanger.outputAddress()).to.equal(outputAccount.address)
      await feeExchanger.connect(deployer).updateOutputAddress(randomAccount1.address)
      expect(await feeExchanger.outputAddress()).to.equal(randomAccount1.address)
    })

    it("Reverts when called by address which is not admin", async() => {
      const { feeExchanger, randomAccount1, randomAccount2 } = fixtureData

      await expect(feeExchanger.connect(randomAccount1).updateOutputAddress(randomAccount2.address))
        .to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("Emits an OutputAddressUpdated event", async() => {
      const { feeExchanger, deployer, outputAccount, randomAccount1 } = fixtureData

      await expect(feeExchanger.connect(deployer).updateOutputAddress(randomAccount1.address))
        .to.emit(feeExchanger, "OutputAddressUpdated")
        .withArgs(outputAccount.address, randomAccount1.address)
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
