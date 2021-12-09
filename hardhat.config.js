const networks = require('./hardhat.networks')

require('hardhat-deploy');
require('hardhat-deploy-ethers');
require('hardhat-abi-exporter');


module.exports = {
  solidity: "0.8.0",
  networks,
  namedAccounts: {
    deployer: {
      default: 0
    }
  },
  abiExporter: {
    path: './abis',
    clear: true,
    flat: true
  }
};
