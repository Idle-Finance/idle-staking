const { sudo, check } = require('./helpers')
const { ethers, deployments } = require('hardhat');
const idleABI = require('../abi/idle.json')
const { idle, personWithWETH } = require('./addresses.integration')
const { time } = require('@openzeppelin/test-helpers')
const feeCollectorABI = require('../abi/feeCollector.json')

const toWei = ethers.utils.parseEther

async function main() {
  await deployments.fixture()
  let feeCollectorContract = await ethers.getContractAt(feeCollectorABI, '0xBecC659Bfc6EDcA552fa1A67451cC6b38a0108E4')
  let sushiswapExchangerContract = await ethers.getContract('SushiswapExchanger')
  let feeDistributorContract = await ethers.getContract('FeeDistributor')
  let idleContract = await ethers.getContractAt(idleABI, idle)

  // Verify Beneficiaries
  let beneficiaries = await feeCollectorContract.getBeneficiaries()
  let weights = await feeCollectorContract.getSplitAllocation()

  beneficiaries.map((beneficiary, i) => {
    console.log(`${beneficiary} = ${weights[i].toString()}`)
  })
  
  // Verify can deposit
  swapper = '0xb3c8e5534f0063545cbbb7ce86854bf42db8872b'
  let [feeCollectorAsSwapper] = await sudo(swapper, feeCollectorContract)
  let [WETHContractAsRich] = await sudo(personWithWETH, (await ethers.getContractAt('ERC20Mock', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')))
  let [sushiswapExchangerAsExchanger] = await sudo(swapper, sushiswapExchangerContract)

  console.log('transfering 1 ETH to feeCollector')
  await WETHContractAsRich.transfer(feeCollectorContract.address, toWei('1'))

  let enabledTokens = [false, false, false, false, false, false, false, false]

  await feeCollectorAsSwapper.deposit(enabledTokens, enabledTokens.map(x=>'0'), '0')
  let sushiswapBalance = await WETHContractAsRich.balanceOf(sushiswapExchangerContract.address)
  
  check(sushiswapBalance, toWei('0.5'), 'Balance of feeDistributor should be 0.5')

  await sushiswapExchangerAsExchanger.exchange(toWei('0.5'), toWei('1')) // exchange funds
  let feeDistributorBalance = await idleContract.balanceOf(feeDistributorContract.address)
  console.log(`Fee Distributor balance = ${feeDistributorBalance}`)

  console.log("Test checkpoint_token is functional")
  await time.increase(time.duration.days(2))
  await feeDistributorContract.checkpoint_token()

  let feeDistributorInternalBalance = await feeDistributorContract.token_last_balance()
  check(feeDistributorInternalBalance, feeDistributorBalance, 'Internal balance of feeDistributor should be updated after calling checkpoint')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });