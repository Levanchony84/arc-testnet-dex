// hardhat.config.ts

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // ⭐ Stack Too Deep ერორის გამოსასწორებლად
    },
  },

  networks: {
    arcTestnet: {
      url: "https://rpc.testnet.arc.network",
      accounts: [process.env.PRIVATE_KEY!],
    },

    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc2.sepolia.org", // უფრო სტაბილური
      // fallback RPC-ები თუ ჩავარდა:
      // url: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY" ან "https://sepolia.g.alchemy.com/v2/YOUR_KEY"
      accounts: [process.env.PRIVATE_KEY!],
    },

    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [process.env.PRIVATE_KEY!],
    },
  },

  etherscan: {
    apiKey: {
      arcTestnet: "abc123", // ნებისმიერი ტექსტი ArcScan-სთვის (Blockscout)
      sepolia: process.env.ETHERSCAN_API_KEY || "WABDNXB5ZRH7Y5QB9VWR3F57USF6D9PD54", // აუცილებელია რეალური Etherscan Key
      baseSepolia: "abc123", // ნებისმიერი ტექსტი Basescan-სთვის
    },

    customChains: [
      {
        network: "arcTestnet",
        chainId: 5042002,
        urls: {
          apiURL: "https://testnet.arcscan.app/api",
          browserURL: "https://testnet.arcscan.app/",
        },
      },

      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io",
        },
      },

      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};

export default config;