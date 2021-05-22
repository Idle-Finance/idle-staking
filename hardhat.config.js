require("@nomiclabs/hardhat-ethers")
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-vyper");
require("hardhat-gas-reporter");
require("hardhat-deploy");

require('dotenv').config()

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

function parseBoolean(str) {
  return /true/i.test(str);
}

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
        enabled: parseBoolean(process.env.ENABLE_FORKING)
      }
    },
    local: {
      url: "http://127.0.0.1:8545",
      timeout: 2000000
    }
  },
  namedAccounts: {
    idle: {
      1: '0x875773784af8135ea0ef43b5a374aad105c5d39e'
    }
  },
  solidity: "0.8.4",
  vyper: {
    version: "0.2.7"
  },
};

