const { expect } = require('chai')
const { ethers, waffle, upgrades } = require('hardhat')
const { loadFixture } = waffle;
const { time } = require('@openzeppelin/test-helpers')
const { disableFork } = require('../lib/util'); disableFork() // disable forking for unit testing

const toWei = ethers.utils.parseEther
const toEthersBN = (x) => ethers.BigNumber.from(x.toString());

describe("SushiswapExchanger.sol", async() => {
  async function fixture() {
    const [deployer, outputAccount, randomAccount1, randomAccount2] = await ethers.getSigners()
   
    // deploy uniswap ( Sushiswap contracts will be the same as this )
    const UniswapV2FactoryBytecode = require('@uniswap/v2-core/build/UniswapV2Factory.json').bytecode
    const UniswapV2Router02Build = require('@uniswap/v2-periphery/build/UniswapV2Router02.json')

    const UniswapV2Library = await ethers.getContractFactory(
      [
        "constructor(address _feeToSetter)",
        "function createPair(address tokenA, address tokenB) external returns (address pair)",
      ],
      UniswapV2FactoryBytecode
    )
    const UniswapV2Router02 = await ethers.getContractFactory(
      UniswapV2Router02Build.abi,
      UniswapV2Router02Build.bytecode
    )

    const uniswapV2Library = await UniswapV2Library.deploy(deployer.address)
    const uniswapV2Router02 = await UniswapV2Router02.deploy(uniswapV2Library.address, "0x0000000000000000000000000000000000000000")

    // deploy ERC20 tokens
    const mockInputToken = await (await ethers.getContractFactory("ERC20Mock")).deploy("InputToken", "IT", toWei("10000000")) // 10,000,000
    const mockOutputToken = await (await ethers.getContractFactory("ERC20Mock")).deploy("OuptutToken", "OT", toWei("10000000")) // 10,000,000

    // approve ERC20 to uniswap
    await mockInputToken.approve(uniswapV2Router02.address, toWei("500000"))
    await mockOutputToken.approve(uniswapV2Router02.address, toWei("500000"))

    // deploy feeExchanger
    const SushiswapExchanger = await ethers.getContractFactory("SushiswapExchanger")
    const sushiswapExchanger = await upgrades.deployProxy(
      SushiswapExchanger,
      [uniswapV2Router02.address, mockInputToken.address, mockOutputToken.address, outputAccount.address])

    // create pair
    await uniswapV2Router02.addLiquidity(
      mockInputToken.address,
      mockOutputToken.address,
      toWei("500000"), // 500,000
      toWei("500000"), // 500,000
      toWei('0'), toWei('0'),
      deployer.address, // deployer receives LP tokens
      toEthersBN(await time.latest()).add("1800")
    )

    return {
      uniswapV2Library, uniswapV2Router02, // uniswap
      sushiswapExchanger, mockInputToken, mockOutputToken, outputAccount, // sushiswapExchanger
      deployer, randomAccount1, randomAccount2 } // accounts
  }

  let fixtureData

  beforeEach(async() => {
    fixtureData = await loadFixture(fixture)
  })

  describe("#exchange", async() => {
    beforeEach(async() => {
      // transfer funds to exchanger
      const { deployer, sushiswapExchanger, mockInputToken } = fixtureData
      await mockInputToken.connect(deployer).transfer(sushiswapExchanger.address, toWei('5000')) // 5,000

      // deployer can exchange funds
      await sushiswapExchanger.connect(deployer).addExchanger(deployer.address)
    })
    it("Sends output token to output account", async() => {
      const { deployer, sushiswapExchanger, mockOutputToken, outputAccount } = fixtureData

      await sushiswapExchanger.connect(deployer).exchange(toWei('5000'), toWei('1'))

      expect(await mockOutputToken.balanceOf(outputAccount.address))
      .to.be.closeTo(toWei('5000'), toWei('100')).and
    })

    it("Emits TokenExchanged event", async() => {
      const { deployer, sushiswapExchanger } = fixtureData

      expect(sushiswapExchanger.connect(deployer).exchange(toWei('5000'), toWei('1')))
        .to.emit(sushiswapExchanger, "TokenExchanged")
    })

    it("Reverts when 'minAmountOut < amountOut'", async() => {
      const { deployer, sushiswapExchanger } = fixtureData

      expect(sushiswapExchanger.connect(deployer).exchange(toWei('5000'), toWei('5001')))
        .to.be.revertedWith("UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT")
    })

    it("Reverts when amountIn > balance of input token", async() => {
      const { deployer, sushiswapExchanger } = fixtureData

      expect(sushiswapExchanger.connect(deployer).exchange(toWei('5001'), toWei('1')))
        .to.be.revertedWith("FE: AMOUNT IN")
    })

    it("Reverts when not called by exchanger", async() => {
      const { deployer, sushiswapExchanger, randomAccount1 } = fixtureData

      expect(sushiswapExchanger.connect(randomAccount1).exchange(toWei('5000'), toWei('1')))
        .to.be.revertedWith("FE: NOT EXCHANGER")
    })
  })
})