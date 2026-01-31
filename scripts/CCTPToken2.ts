// scripts/arc-maximum-interactions.ts
// Maximum contract interactions with ALL functions

import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const RPC_URLS = [
  "https://rpc.testnet.arc.network",
  "https://arc-testnet.rpc.thirdweb.com",
  "https://rpc.drpc.testnet.arc.network",
];

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY არ არის .env ფაილში!");

// Arc Testnet Gas Policy - USDC pays for gas
const MIN_GAS_GWEI = 160;
const MAX_GAS_GWEI = 250;

// Random TX count per session: 30-65
const MIN_TX_COUNT = 30;
const MAX_TX_COUNT = 65;

// Timing
const DELAY_MIN_SEC = 8;
const DELAY_MAX_SEC = 25;

// Tokens
const TOKENS = {
  USDC: { address: "0x3600000000000000000000000000000000000000", decimals: 6, name: "USDC" },
  EURC: { address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", decimals: 6, name: "EURC" }
};

// Contracts with their functions
const CONTRACTS = {
  // CCTP - Crosschain message passing and stablecoin transfers
  TokenMessengerV2: { address: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA", category: "CCTP" },
  MessageTransmitterV2: { address: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275", category: "CCTP" },
  TokenMinterV2: { address: "0xb43db544E2c27092c107639Ad201b3dEfAbcF192", category: "CCTP" },
  MessageV2: { address: "0xbaC0179bB358A8936169a63408C8481D582390C4", category: "CCTP" },
  
  // Gateway - Chain-abstracted USDC balances
  GatewayWallet: { address: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9", category: "Gateway" },
  GatewayMinter: { address: "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B", category: "Gateway" },
  
  // Payments - FX execution and escrow settlement
  FxEscrow: { address: "0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1", category: "Payments" },
  
  // Common Ethereum contracts
  CREATE2Factory: { address: "0x4e59b44847b379578588920cA78FbF26c0B4956C", category: "Common" },
  Multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11", category: "Common" },
  Permit2: { address: "0x000000000022D473030F116dDEE9F6B43aC78BA3", category: "Common" },
};

// ABIs for different contract types
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const GATEWAY_WALLET_ABI = [
  "function deposit(address token, uint256 amount) external",
  "function balanceOf(address depositor, address token) view returns (uint256)",
];

const MULTICALL3_ABI = [
  "function aggregate(tuple(address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)",
];

// Helper functions
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function randAmount(decimals: number, min: number = 0.2, max: number = 2.5): bigint {
  const useRound = Math.random() < 0.25;
  let value: number;
  
  if (useRound) {
    const options = [0.5, 1.0, 1.5, 2.0];
    value = options[randInt(0, options.length - 1)];
  } else {
    value = rand(min, max);
  }
  
  return ethers.parseUnits(value.toFixed(6), decimals);
}

function randGasPrice(): bigint {
  const useRound = Math.random() < 0.35;
  let gwei: number;
  
  if (useRound) {
    const roundOptions = [160, 170, 180, 190, 200, 220, 250];
    gwei = roundOptions[randInt(0, roundOptions.length - 1)];
  } else {
    gwei = rand(MIN_GAS_GWEI, MAX_GAS_GWEI);
  }
  
  return ethers.parseUnits(gwei.toFixed(2), "gwei");
}

function randGasLimit(base: number = 250000): number {
  const limit = randInt(base, base + 200000);
  return Math.random() < 0.15 ? Math.round(limit / 21000) * 21000 : limit;
}

function randDelay(): number {
  const burst = Math.random() < 0.12;
  const longPause = Math.random() < 0.15;
  
  if (burst) return randInt(3000, 7000);
  if (longPause) return randInt(30000, 50000);
  return Math.floor(rand(DELAY_MIN_SEC, DELAY_MAX_SEC) * 1000);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// RPC connection
async function getProvider() {
  for (const url of shuffle([...RPC_URLS])) {
    try {
      const provider = new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true, batchMaxCount: 1 });
      await Promise.race([provider.getNetwork(), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000))]);
      console.log(`✓ RPC: ${url.split("//")[1].split("/")[0]}`);
      return provider;
    } catch {}
  }
  throw new Error("All RPCs failed");
}

interface Stats {
  total: number;
  success: number;
  failed: number;
  byType: { [key: string]: number };
  byContract: { [key: string]: number };
}

function initStats(): Stats {
  return { total: 0, success: 0, failed: 0, byType: {}, byContract: {} };
}

// Interaction types - each returns Promise<boolean>
type InteractionFn = (wallet: ethers.Wallet, target: string, stats: Stats) => Promise<boolean>;

// 1. Simple Transfer (USDC/EURC to any contract)
async function simpleTransfer(wallet: ethers.Wallet, target: string, stats: Stats): Promise<boolean> {
  const token = Math.random() < 0.75 ? TOKENS.USDC : TOKENS.EURC; // 75% USDC
  const amount = randAmount(token.decimals);
  
  console.log(`  💸 Transfer ${ethers.formatUnits(amount, token.decimals)} ${token.name} → ${target.slice(0, 8)}...`);
  
  try {
    const contract = new ethers.Contract(token.address, ERC20_ABI, wallet);
    const tx = await contract.transfer(target, amount, {
      maxFeePerGas: randGasPrice(),
      maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
      gasLimit: randGasLimit(150000),
    });
    
    console.log(`     📤 ${tx.hash.slice(0, 10)}...`);
    
    const receipt = await Promise.race([
      tx.wait(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000))
    ]) as ethers.TransactionReceipt | null;
    
    if (receipt?.status === 1) {
      console.log(`     ✅ Confirmed`);
      return true;
    }
  } catch (err: any) {
    if (err.message === "timeout") {
      console.log(`     ⏱️  Pending`);
      return true;
    }
    console.error(`     ❌ ${(err.shortMessage || err.message).slice(0, 60)}`);
  }
  
  return false;
}

// 2. Approve (to any contract)
async function approveToken(wallet: ethers.Wallet, target: string, stats: Stats): Promise<boolean> {
  const token = Math.random() < 0.75 ? TOKENS.USDC : TOKENS.EURC;
  const amount = randAmount(token.decimals, 1, 10);
  
  console.log(`  🔐 Approve ${ethers.formatUnits(amount, token.decimals)} ${token.name} → ${target.slice(0, 8)}...`);
  
  try {
    const contract = new ethers.Contract(token.address, ERC20_ABI, wallet);
    const tx = await contract.approve(target, amount, {
      maxFeePerGas: randGasPrice(),
      maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
      gasLimit: randGasLimit(80000),
    });
    
    console.log(`     📝 ${tx.hash.slice(0, 10)}...`);
    const receipt = await tx.wait(1).catch(() => null);
    
    if (receipt?.status === 1) {
      console.log(`     ✅ Approved`);
      return true;
    }
  } catch (err: any) {
    if (err.message?.includes("timeout")) {
      console.log(`     ⏱️  Pending`);
      return true;
    }
    console.error(`     ❌ ${(err.shortMessage || err.message).slice(0, 60)}`);
  }
  
  return false;
}

// 3. Gateway Deposit (USDC only - creates crosschain balance)
async function gatewayDeposit(wallet: ethers.Wallet, target: string, stats: Stats): Promise<boolean> {
  if (target !== CONTRACTS.GatewayWallet.address) return false;
  
  const token = TOKENS.USDC; // Gateway only supports USDC
  const amount = randAmount(token.decimals, 0.5, 3);
  
  console.log(`  🌐 Gateway Deposit ${ethers.formatUnits(amount, token.decimals)} USDC (crosschain)`);
  
  try {
    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, wallet);
    const allowance = await tokenContract.allowance(wallet.address, target);
    
    if (allowance < amount) {
      console.log(`     🔓 Approving...`);
      const approveTx = await tokenContract.approve(target, amount * 2n, {
        maxFeePerGas: randGasPrice(),
        maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
        gasLimit: 80000,
      });
      await approveTx.wait(1).catch(() => {});
      await new Promise(r => setTimeout(r, randInt(1500, 3000)));
    }
    
    const gatewayContract = new ethers.Contract(target, GATEWAY_WALLET_ABI, wallet);
    const tx = await gatewayContract.deposit(token.address, amount, {
      maxFeePerGas: randGasPrice(),
      maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
      gasLimit: randGasLimit(300000),
    });
    
    console.log(`     📤 ${tx.hash.slice(0, 10)}...`);
    const receipt = await Promise.race([
      tx.wait(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000))
    ]) as ethers.TransactionReceipt | null;
    
    if (receipt?.status === 1) {
      console.log(`     ✅ Crosschain balance created`);
      return true;
    }
  } catch (err: any) {
    if (err.message === "timeout") {
      console.log(`     ⏱️  Pending`);
      return true;
    }
    console.error(`     ❌ ${(err.shortMessage || err.message).slice(0, 60)}`);
  }
  
  return false;
}

// 4. Approve + Transfer combo
async function approveAndTransfer(wallet: ethers.Wallet, target: string, stats: Stats): Promise<boolean> {
  const token = Math.random() < 0.75 ? TOKENS.USDC : TOKENS.EURC;
  const amount = randAmount(token.decimals);
  
  console.log(`  🔐💸 Approve + Transfer ${ethers.formatUnits(amount, token.decimals)} ${token.name}`);
  
  try {
    const contract = new ethers.Contract(token.address, ERC20_ABI, wallet);
    
    // Approve
    const approveTx = await contract.approve(target, amount, {
      maxFeePerGas: randGasPrice(),
      maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
      gasLimit: 80000,
    });
    console.log(`     📝 Approve: ${approveTx.hash.slice(0, 10)}...`);
    await approveTx.wait(1).catch(() => {});
    
    await new Promise(r => setTimeout(r, randInt(1500, 4000)));
    
    // Transfer
    const transferTx = await contract.transfer(target, amount, {
      maxFeePerGas: randGasPrice(),
      maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
      gasLimit: randGasLimit(150000),
    });
    console.log(`     📤 Transfer: ${transferTx.hash.slice(0, 10)}...`);
    const receipt = await transferTx.wait(1).catch(() => null);
    
    if (receipt?.status === 1) {
      console.log(`     ✅ Complete`);
      return true;
    }
  } catch (err: any) {
    console.error(`     ❌ ${(err.shortMessage || err.message).slice(0, 60)}`);
  }
  
  return false;
}

// 5. Multicall3 aggregate (batch read)
async function multicallAggregate(wallet: ethers.Wallet, target: string, stats: Stats): Promise<boolean> {
  if (target !== CONTRACTS.Multicall3.address) return false;
  
  console.log(`  📊 Multicall3 batch read (USDC + EURC balances)`);
  
  try {
    const multicall = new ethers.Contract(target, MULTICALL3_ABI, wallet);
    
    const calls = [
      {
        target: TOKENS.USDC.address,
        callData: new ethers.Interface(ERC20_ABI).encodeFunctionData("balanceOf", [wallet.address])
      },
      {
        target: TOKENS.EURC.address,
        callData: new ethers.Interface(ERC20_ABI).encodeFunctionData("balanceOf", [wallet.address])
      }
    ];
    
    const tx = await multicall.aggregate(calls, {
      maxFeePerGas: randGasPrice(),
      maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
      gasLimit: randGasLimit(200000),
    });
    
    console.log(`     📤 ${tx.hash.slice(0, 10)}...`);
    const receipt = await tx.wait(1).catch(() => null);
    
    if (receipt?.status === 1) {
      console.log(`     ✅ Batch read complete`);
      return true;
    }
  } catch (err: any) {
    console.error(`     ❌ ${(err.shortMessage || err.message).slice(0, 60)}`);
  }
  
  return false;
}

// Generate random interaction plan
function generateInteractionPlan(totalTx: number): Array<{ type: string; fn: InteractionFn; weight: number }> {
  const interactions = [
    { type: "Transfer", fn: simpleTransfer, weight: 30 },
    { type: "Approve", fn: approveToken, weight: 20 },
    { type: "Gateway-Deposit", fn: gatewayDeposit, weight: 15 },
    { type: "Approve+Transfer", fn: approveAndTransfer, weight: 20 },
    { type: "Multicall", fn: multicallAggregate, weight: 15 },
  ];
  
  const plan: Array<{ type: string; fn: InteractionFn }> = [];
  
  for (let i = 0; i < totalTx; i++) {
    const totalWeight = interactions.reduce((sum, int) => sum + int.weight, 0);
    let roll = Math.random() * totalWeight;
    
    for (const interaction of interactions) {
      roll -= interaction.weight;
      if (roll <= 0) {
        plan.push({ type: interaction.type, fn: interaction.fn });
        break;
      }
    }
  }
  
  return shuffle(plan);
}

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("🚀 Arc Testnet - Maximum Contract Interactions");
  console.log("═".repeat(70));

  const provider = await getProvider();
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const ethBal = await provider.getBalance(wallet.address);
  console.log(`\n📍 Wallet: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`);
  console.log(`💰 ETH: ${parseFloat(ethers.formatEther(ethBal)).toFixed(6)}`);

  if (ethBal < ethers.parseEther("0.015")) {
    throw new Error("❌ Need at least 0.015 ETH for gas");
  }

  // Check token balances
  console.log(`\n💵 Token Balances:`);
  for (const [name, token] of Object.entries(TOKENS)) {
    const contract = new ethers.Contract(token.address, ERC20_ABI, wallet);
    const bal = await contract.balanceOf(wallet.address);
    console.log(`   ${name}: ${parseFloat(ethers.formatUnits(bal, token.decimals)).toFixed(2)}`);
    
    if (bal < ethers.parseUnits("10", token.decimals)) {
      console.warn(`   ⚠️  Low ${name} balance - recommend 50+`);
    }
  }

  // Random transaction count
  const totalTxCount = randInt(MIN_TX_COUNT, MAX_TX_COUNT);
  
  console.log("\n" + "═".repeat(70));
  console.log(`🎯 Session Plan: ${totalTxCount} transactions`);
  console.log("   30% - Simple Transfer (USDC/EURC)");
  console.log("   20% - Approve (any contract)");
  console.log("   20% - Approve + Transfer");
  console.log("   15% - Gateway Deposit (crosschain USDC)");
  console.log("   15% - Multicall3 (batch reads)");
  console.log("\n💡 All functions across 10 contracts");
  console.log("⛽ Gas paid in USDC (Arc policy)");
  console.log("═".repeat(70));

  const stats = initStats();
  const contractList = Object.values(CONTRACTS).map(c => c.address);
  const interactionPlan = generateInteractionPlan(totalTxCount);

  for (let i = 0; i < totalTxCount; i++) {
    const target = contractList[randInt(0, contractList.length - 1)];
    const contractName = Object.entries(CONTRACTS).find(([_, c]) => c.address === target)?.[0] || "Unknown";
    const category = Object.values(CONTRACTS).find(c => c.address === target)?.category || "Unknown";
    
    console.log(`\n${"─".repeat(70)}`);
    console.log(`📦 [${i + 1}/${totalTxCount}] ${contractName} (${category})`);
    console.log(`   ${target.slice(0, 10)}...${target.slice(-8)}`);
    
    const { type, fn } = interactionPlan[i];
    stats.total++;
    
    const success = await fn(wallet, target, stats);
    
    if (success) {
      stats.success++;
    } else {
      stats.failed++;
    }
    
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    stats.byContract[contractName] = (stats.byContract[contractName] || 0) + 1;

    // Random delay
    if (i < totalTxCount - 1) {
      const delay = randDelay();
      const emoji = delay < 10000 ? "⚡" : delay > 30000 ? "⏸️" : "⏱️";
      console.log(`  ${emoji} ${Math.round(delay / 1000)}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  // Final report
  console.log("\n" + "═".repeat(70));
  console.log("🎉 Session Complete!");
  console.log("═".repeat(70));
  
  console.log(`\n📊 Statistics:`);
  console.log(`   Total: ${stats.total}`);
  console.log(`   ✅ Success: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  
  console.log(`\n🎯 By Type:`);
  const sortedTypes = Object.entries(stats.byType).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    const pct = ((count / stats.total) * 100).toFixed(1);
    console.log(`   ${type}: ${count} (${pct}%)`);
  }
  
  console.log(`\n📦 By Contract:`);
  const sortedContracts = Object.entries(stats.byContract).sort((a, b) => b[1] - a[1]);
  for (const [contract, count] of sortedContracts) {
    console.log(`   ${contract}: ${count}`);
  }

  console.log(`\n🔗 Explorer: https://testnet.arcscan.app/address/${wallet.address}`);
  console.log("═".repeat(70) + "\n");
}

main().catch(err => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});