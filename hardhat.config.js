require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      // red local en memoria — la que usa fullCycle.test.js por defecto
    },
    // Completar cuando tengas el RPC real del testnet EVM del hackathon.
    // Ejemplo genérico — reemplazar TESTNET_RPC_URL y PRIVATE_KEY en .env
    testnet: {
      url: process.env.TESTNET_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};
