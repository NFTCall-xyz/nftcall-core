require('@typechain/hardhat')
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');
const path = require('path');

const SKIP_LOAD = process.env.SKIP_LOAD === "true";

if ( !SKIP_LOAD ) {
    const tasksPath = path.join(__dirname, "tasks");
    if( fs.existsSync(tasksPath) ){
        fs.readdirSync(tasksPath)
        .filter((pth) => pth.includes(".js"))
        .forEach((task) => {
            require(`${tasksPath}/${task}`);
        }
    );
  }
};

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
const INFURA_KEY = process.env.INFURA_KEY || '';

module.exports = {
  typechain: {
    outDir: 'types',
    target: 'ethers-v5',
  },
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  mocha: {
    timeout: 20000,
  },
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      accounts: 'remote',
      url: 'http://127.0.0.1:8545'
    },
    mainnet: {
      chainId: 1,
      url: INFURA_KEY ? `https://mainnet.infura.io/v3/${INFURA_KEY}` : `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [process.env.MAINNET_PRIVATE_KEY]
    },
    goerli: {
      chainId: 5,
      url: INFURA_KEY ? `https://goerli.infura.io/v3/${INFURA_KEY}` : `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [process.env.GOERLI_PRIVATE_KEY]
    },
  },
  gasReporter: {
    ethPrice: 1000,
    gasPrice: 21,
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_KEY,
      goerli: process.env.ETHERSCAN_KEY,
    }
  }
};
