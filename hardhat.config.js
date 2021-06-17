require("@nomiclabs/hardhat-ethers")
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-vyper");
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');
require("hardhat-gas-reporter");
require("hardhat-deploy");
require("hardhat-deploy-ethers")

require('dotenv').config()

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

require("./tasks/mockDeploy")

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  gasReporter: {
    currency: 'USD',
    excludeContracts: ['contracts/mock/'],
    coinmarketcap: process.env.COIN_MARKET_CAP_API_KEY
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
        enabled: true
      }
    },
    local: {
      url: "http://127.0.0.1:8545",
      timeout: 2000000
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`
    }
  },
  namedAccounts: {
    idle: {
      1: '0x875773784af8135ea0ef43b5a374aad105c5d39e',
      31337: '0x875773784af8135ea0ef43b5a374aad105c5d39e'
    },
    weth: {
      1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      31337: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    },
    feeTreasury: {
      1: '0x69a62C24F16d4914a48919613e8eE330641Bcb94',
      31337: 0
    },
    idleTimeLock: {
      1: '0xD6dABBc2b275114a2366555d6C481EF08FDC2556',
      31337: '0xD6dABBc2b275114a2366555d6C481EF08FDC2556'
    },
    voteDelegate: {
      1: '0xb08696Efcf019A6128ED96067b55dD7D0aB23CE4', // Staking Multisig
      31337: 0
    },
    feeCollector: {
      1: '0xBecC659Bfc6EDcA552fa1A67451cC6b38a0108E4',
      31337: '0xBecC659Bfc6EDcA552fa1A67451cC6b38a0108E4'
    },
    governorAlpha: {
      1: '0x2256b25CFC8E35c3135664FD03E77595042fe31B',
      31337: '0x2256b25CFC8E35c3135664FD03E77595042fe31B'
    },
    timelock: { // only used in local deployments
      31337: '0xD6dABBc2b275114a2366555d6C481EF08FDC2556'
    },
    personWithIdle: {
      31337: '0x107a369bc066c77ff061c7d2420618a6ce31b925'
    },
    sushiswapRouter02: {
      1: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      31337: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'
    },
    idleExchanger: {
      1: '0xb3c8e5534f0063545cbbb7ce86854bf42db8872b',
      31337: '0xb3c8e5534f0063545cbbb7ce86854bf42db8872b'
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  solidity: "0.8.4",
  vyper: {
    version: "0.2.7"
  },
};

