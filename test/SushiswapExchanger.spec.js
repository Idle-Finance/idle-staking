const { expect } = require('chai')
const { ethers, waffle, upgrades } = require('hardhat')
const { loadFixture } = waffle;
const { time } = require('@openzeppelin/test-helpers')
const { disableFork } = require('../lib/util'); disableFork() // disable forking for unit testing

const WEEK = 7 * 86400
const toWei = ethers.utils.parseEther
const toEthersBN = (x) => ethers.BigNumber.from(x.toString());
const toWeek = (x) => toEthersBN(x).div(WEEK).mul(WEEK)

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
        "function getPair(address tokenA, address tokenB) external view returns (address pair)"
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
    const mockInputToken = await (await ethers.getContractFactory("ERC20MockWithDelegate")).deploy("InputToken", "IT", toWei("10000000")) // 10,000,000
    const mockOutputToken = await (await ethers.getContractFactory("ERC20Mock")).deploy("OuptutToken", "OT", toWei("10000000")) // 10,000,000

    // approve ERC20 to uniswap
    await mockInputToken.approve(uniswapV2Router02.address, toWei("500000"))
    await mockOutputToken.approve(uniswapV2Router02.address, toWei("500000"))

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

    // deploy feeDistributor
    const veTok = await (await ethers.getContractFactory("VotingEscrow")).deploy(
      mockInputToken.address,
      "Staked Token",
      "stkTOK",
      "1.0",
      deployer.address
    )

    const feeDistributor = await (await ethers.getContractFactory("FeeDistributor")).deploy(
      veTok.address,
      toEthersBN(await time.latest()),
      mockOutputToken.address,
      deployer.address,
      deployer.address
    )

    // deploy feeExchanger
    const SushiswapExchanger = await ethers.getContractFactory("SushiswapExchanger")
    const sushiswapExchanger = await upgrades.deployProxy(
      SushiswapExchanger,
      [uniswapV2Router02.address, mockInputToken.address, mockOutputToken.address, feeDistributor.address])

    return {
      uniswapV2Library, uniswapV2Router02, // uniswap
      sushiswapExchanger, mockInputToken, mockOutputToken, outputAccount, // sushiswapExchanger
      feeDistributor, veTok, // staking
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

    describe("When can_checkpoint_token = true", async() => {
      beforeEach(async()=>{
        const { deployer, feeDistributor } = fixtureData
        await feeDistributor.connect(deployer).toggle_allow_checkpoint_token()

        let currentTime = await time.latest()
        let currentWeek = await toWeek(currentTime)
        let nextWeek = currentWeek.add(WEEK)

        await time.increaseTo(nextWeek.toString()) // advance to next week
      })

      it("Updates feeDistributor internal balance", async() => {
        const { deployer, sushiswapExchanger, feeDistributor, mockOutputToken } = fixtureData
  
        expect(await feeDistributor.token_last_balance()).to.equal(toWei('0'))
        await sushiswapExchanger.connect(deployer).exchange(toWei('5000'), toWei('1'))
        expect(await feeDistributor.token_last_balance()).to.equal(await mockOutputToken.balanceOf(feeDistributor.address))
      })
  
      it("Emits CheckpointToken event", async() => {
        const { deployer, sushiswapExchanger, feeDistributor } = fixtureData
  
        await expect(sushiswapExchanger.connect(deployer).exchange(toWei('5000'), toWei('1')))
          .to.emit(feeDistributor, "CheckpointToken")
      })
    })

    // These tests are included to test for an quirk case in the `burn` function which deposits the entire balance 
    // of the caller, which would be the feeExchanger
    describe("When FeeExchanger already has output token balance", async() => {
      beforeEach(async() => {
        const { deployer, sushiswapExchanger, mockOutputToken } = fixtureData

        await mockOutputToken.connect(deployer).transfer(sushiswapExchanger.address, toWei('5000'))
      })
      it("Sends output token and token balance to output address", async() => {
        const { deployer, sushiswapExchanger, mockOutputToken, feeDistributor } = fixtureData

        await sushiswapExchanger.connect(deployer).exchange(toWei('5000'), toWei('1'))
  
        expect(await mockOutputToken.balanceOf(feeDistributor.address))
        .to.be.closeTo(toWei('10000'), toWei('100'))
      })
    })

    it("Sends output token to output account", async() => {
      const { deployer, sushiswapExchanger, mockOutputToken, feeDistributor } = fixtureData

      await sushiswapExchanger.connect(deployer).exchange(toWei('5000'), toWei('1'))

      expect(await mockOutputToken.balanceOf(feeDistributor.address))
      .to.be.closeTo(toWei('5000'), toWei('100'))
    })

    it("Emits TokenExchanged event", async() => {
      const { deployer, sushiswapExchanger } = fixtureData

      await expect(sushiswapExchanger.connect(deployer).exchange(toWei('5000'), toWei('1')))
        .to.emit(sushiswapExchanger, "TokenExchanged")
    })

    it("Reverts when 'minAmountOut < amountOut'", async() => {
      const { deployer, sushiswapExchanger } = fixtureData

      await expect(sushiswapExchanger.connect(deployer).exchange(toWei('5000'), toWei('5001')))
        .to.be.revertedWith("UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT")
    })

    it("Reverts when amountIn > balance of input token", async() => {
      const { deployer, sushiswapExchanger } = fixtureData

      await expect(sushiswapExchanger.connect(deployer).exchange(toWei('5001'), toWei('1')))
        .to.be.revertedWith("FE: AMOUNT IN")
    })

    it("Reverts when called by account which is not exchanger", async() => {
      const { sushiswapExchanger, randomAccount1 } = fixtureData

      await expect(sushiswapExchanger.connect(randomAccount1).exchange(toWei('5000'), toWei('1')))
        .to.be.revertedWith("FE: NOT EXCHANGER")
    })
  })

  describe("#updatePath", async() => {
    // Deploy a new pair such that
    // InputToken ---> NewToken ---> OutputToken
    // is a valid route
    async function prepareUpdatePathTest() {
      const { deployer, mockInputToken, mockOutputToken, uniswapV2Router02, uniswapV2Library } = fixtureData

      const mockNewToken = await (await ethers.getContractFactory("ERC20Mock")).deploy("NewToken", "NT", toWei("10000000")) // 10,000,000
      await mockInputToken.approve(uniswapV2Router02.address, toWei("100000"))
      await mockOutputToken.approve(uniswapV2Router02.address, toWei("100000"))
      await mockNewToken.approve(uniswapV2Router02.address, toWei("200000"))

      // Create InputToken ---> NewToken pair
      await uniswapV2Router02.addLiquidity(
        mockInputToken.address,
        mockNewToken.address,
        toWei("100000"), // 100,000
        toWei("100000"), // 100,000
        toWei('1'), toWei('1'),
        deployer.address, // deployer receives LP tokens
        toEthersBN(await time.latest()).add("1800")
      )

      // Create NewToken ---> OutputToken pair
      await uniswapV2Router02.addLiquidity(
        mockNewToken.address,
        mockOutputToken.address,
        toWei("100000"), // 100,000
        toWei("100000"), // 100,000
        toWei('1'), toWei('1'),
        deployer.address, // deployer receives LP tokens
        toEthersBN(await time.latest()).add("1800")
      )

      const pair0 = await uniswapV2Library.getPair(mockInputToken.address, mockNewToken.address)
      const pair1 = await uniswapV2Library.getPair(mockNewToken.address, mockOutputToken.address)

      return { mockNewToken, pair0, pair1 }
    }  

    let updatePathFixtureData;

    beforeEach(async() => {
      updatePathFixtureData = await prepareUpdatePathTest()
      const { sushiswapExchanger, deployer } = fixtureData

      // deployer can exchange funds
      await sushiswapExchanger.connect(deployer).addExchanger(deployer.address)
    })
    it("Updates the router path", async() => {
      const { mockNewToken } = updatePathFixtureData
      const { sushiswapExchanger, deployer, mockInputToken, mockOutputToken } = fixtureData
      let path = [mockInputToken, mockOutputToken].map(x=>x.address)

      expect(await sushiswapExchanger.getPath()).to.eql(path)
      
      // new path mockInputToken ---> mockNewToken ---> mockOutputToken
      path.splice(1, 0, mockNewToken.address)
      await sushiswapExchanger.connect(deployer).updatePath(path)
      
      expect(await sushiswapExchanger.getPath()).to.eql(path)
    })

    it("Exchanges using the new path", async() => {
      const { mockNewToken, pair0, pair1 } = updatePathFixtureData
      const { sushiswapExchanger, deployer, mockInputToken, mockOutputToken, uniswapV2Library } = fixtureData
      let path = [mockInputToken, mockNewToken, mockOutputToken].map(x=>x.address)

      await mockInputToken.connect(deployer).transfer(sushiswapExchanger.address, toWei('5000')) // 5,000

      let = pair0NewTokenBalance0 = await mockNewToken.balanceOf(pair0)
      let = pair1NewTokenBalance0 = await mockNewToken.balanceOf(pair1)

      await sushiswapExchanger.connect(deployer).updatePath(path)
      await sushiswapExchanger.connect(deployer).exchange(toWei('5000'), toWei('1'))

      let = pair0NewTokenBalance1 = await mockNewToken.balanceOf(pair0)
      let = pair1NewTokenBalance1 = await mockNewToken.balanceOf(pair1)

      expect(pair0NewTokenBalance1.sub(pair0NewTokenBalance0))
        .to.be.closeTo(toWei('-5000'), toWei('500'))
      
      expect(pair1NewTokenBalance1.sub(pair1NewTokenBalance0))
      .to.be.closeTo(toWei('5000'), toWei('500'))
    })

    it("Reverts when first address of path is not output token", async() => {
      const { mockNewToken } = updatePathFixtureData
      const { sushiswapExchanger, deployer, mockInputToken } = fixtureData
      let path = [mockNewToken, mockInputToken].map(x=>x.address)

      await expect(sushiswapExchanger.connect(deployer).updatePath(path))
        .to.be.revertedWith("FE: PATH INPUT")
    })

    it("Reverts when last address of path is not output token", async() => {
      const { mockNewToken } = updatePathFixtureData
      const { sushiswapExchanger, deployer, mockInputToken } = fixtureData
      let path = [mockInputToken, mockNewToken].map(x=>x.address)

      await expect(sushiswapExchanger.connect(deployer).updatePath(path))
        .to.be.revertedWith("FE: PATH OUTPUT")
    })

    it("Reverts when called by account which is not exchanger", async() => {
      const { mockNewToken } = updatePathFixtureData
      const { sushiswapExchanger, randomAccount1, mockInputToken, mockOutputToken } = fixtureData

      let path = [mockInputToken, mockNewToken, mockOutputToken].map(x=>x.address)
      await expect(sushiswapExchanger.connect(randomAccount1).updatePath(path))
        .to.be.revertedWith("FE: NOT EXCHANGER")
    })
  })

  describe("#getPath", async() => {
    it("Returns the router path", async() => {
      const { sushiswapExchanger, mockInputToken, mockOutputToken } = fixtureData
      let path = [mockInputToken, mockOutputToken].map(x=>x.address)

      expect(await sushiswapExchanger.getPath()).to.eql(path)
    })
  })
})
