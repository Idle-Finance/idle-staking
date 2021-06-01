const { sudo, check } = require('./helpers')
const { ethers, deployments } = require('hardhat');
const feeCollectorABI = require('../abi/feeCollector.json')

const toWei = ethers.utils.parseEther

async function main() {
  await deployments.fixture()
  let feeCollectorContract = await ethers.getContractAt(feeCollectorABI, '0xBecC659Bfc6EDcA552fa1A67451cC6b38a0108E4')
  let feeDistributorContract = await ethers.getContract('FeeDistributor')

  // Verify Beneficiaries
  let beneficiaries = await feeCollectorContract.getBeneficiaries()
  let weights = await feeCollectorContract.getSplitAllocation()

  beneficiaries.map((beneficiary, i) => {
    console.log(`${beneficiary} = ${weights[i].toString()}`)
  })
  
  // Verify can deposit
  swapper = '0xb3c8e5534f0063545cbbb7ce86854bf42db8872b'
  let [feeCollectorAsSwapper] = await sudo(swapper, feeCollectorContract)
  let [WETHAsSwapper] = await sudo(swapper, (await ethers.getContractAt('ERC20Mock', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')))
  let [feeDistributorAsSwapper] = await sudo(swapper, feeDistributorContract)

  console.log('transfering 1 ETH to feeCollector')
  await WETHAsSwapper.transfer(feeCollectorContract.address, toWei('1'))

  let enabledTokens = [false, false, false, false, false, false, false, false]

  await feeCollectorAsSwapper.deposit(enabledTokens, enabledTokens.map(x=>'0'), '0')
  let feeDistributorBalance = await WETHAsSwapper.balanceOf(feeDistributorContract.address)
  
  check(feeDistributorBalance, toWei('0.5'), 'Balance of feeDistributor should be 0.5')

  console.log("Test checkpoint_token is functional")
  await feeDistributorAsSwapper.checkpoint_token()

  let feeDistributorInternalBalance = await feeDistributorAsSwapper.token_last_balance()
  check(feeDistributorInternalBalance, toWei('0.5'), 'Internal balance of feeDistributor should be 0.5 after calling checkpoint')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });