import { ethers } from "hardhat";
import * as fs from "fs";

// ═══════════════════════════════════════════════════════════
// 🌐 MULTI-NETWORK CONFIGURATION
// ═══════════════════════════════════════════════════════════

const NETWORKS = {
    arcTestnet: {
        chainId: 1234,
        name: "Arc Testnet",
        usdc: "0x3600000000000000000000000000000000000000",
        eurc: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
        rpcUrl: "https://rpc.arc-testnet.io"
    },
    arbitrumSepolia: {
        chainId: 421614,
        name: "Arbitrum Sepolia",
        usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
        rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc"
    },
    baseSepolia: {
        chainId: 84532,
        name: "Base Sepolia",
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        rpcUrl: "https://sepolia.base.org"
    },
    unichainSepolia: {
        chainId: 1301,
        name: "Unichain Sepolia",
        usdc: "0x31d0220469e10c4E71834a79b1f276d740d3768F",
        rpcUrl: "https://sepolia.unichain.org"
    },
    opSepolia: {
        chainId: 11155420,
        name: "OP Sepolia",
        usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
        rpcUrl: "https://sepolia.optimism.io"
    }
};

// ═══════════════════════════════════════════════════════════
// 🎭 ქართული სახელები და ხასიათები
// ═══════════════════════════════════════════════════════════

const GEORGIAN_NAMES = [
    "გიორგი", "ნინო", "დავით", "მარიამ", "ნიკა", "ანა", "ლუკა", "თამარ",
    "გიგა", "ელენე", "საბა", "სალომე", "ლაშა", "ქეთევან", "გურამ", "თეა",
    "ბექა", "ნათია", "ალექსი", "მაკა", "გია", "ლია", "ზურა", "დიანა",
    "ლევან", "ნატო", "ირაკლი", "ქეთი", "ვახტანგ", "მარინე", "ნუგო", "სოფო",
    "თორნიკე", "ნიკოლოზ", "მარიკა", "კახა", "ტატო", "გვანცა", "ბაჩო", "მაია"
];

const TRADER_PERSONALITIES = [
    { type: "scalper", mood: "aggressive", desc: "სწრაფი სკალპერი - აგრესიული ტრეიდინგი" },
    { type: "swing", mood: "normal", desc: "სვინგ ტრეიდერი - საშუალოვადიანი პოზიციები" },
    { type: "hodler", mood: "casual", desc: "ჰოდლერი - გრძელვადიანი სტრატეგია" },
    { type: "arbitrageur", mood: "strategic", desc: "არბიტრაჟერი - სისტემური მიდგომა" },
    { type: "yieldFarmer", mood: "normal", desc: "იელდ ფერმერი - ლიკვიდობის მომწოდებელი" },
    { type: "degen", mood: "aggressive", desc: "დეგენი - მაღალი რისკის მოყვარული" },
    { type: "whale", mood: "strategic", desc: "ვეილი - დიდი მოთამაშე" },
    { type: "bot", mood: "aggressive", desc: "ბოტი - ავტომატიზირებული სტრატეგია" }
];

const ACTIVITY_MOODS = {
    aggressive: { 
        minDelay: 2000, 
        maxDelay: 6000, 
        txPerSession: [70, 130],
        swapSize: [1, 100],
        description: "⚡ აგრესიული - სწრაფი და ხშირი ტრანზაქციები"
    },
    normal: { 
        minDelay: 3000, 
        maxDelay: 10000, 
        txPerSession: [70, 130],
        swapSize: [5, 50],
        description: "⚖️ ნორმალური - დაბალანსებული აქტივობა"
    },
    casual: { 
        minDelay: 5000, 
        maxDelay: 15000, 
        txPerSession: [70, 130],
        swapSize: [10, 30],
        description: "🌙 მშვიდი - განზომილებული ტრანზაქციები"
    },
    strategic: { 
        minDelay: 4000, 
        maxDelay: 12000, 
        txPerSession: [70, 130],
        swapSize: [20, 80],
        description: "🎯 სტრატეგიული - გათვლილი მოძრაობები"
    }
};

// ═══════════════════════════════════════════════════════════
// 🧮 UTILITY ფუნქციები
// ═══════════════════════════════════════════════════════════

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
    return array[randomInt(0, array.length - 1)];
}

function randomFloat(min: number, max: number, decimals: number = 6): number {
    const value = Math.random() * (max - min) + min;
    return parseFloat(value.toFixed(decimals));
}

function gaussianRandom(mean: number = 0, stdDev: number = 1): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * stdDev + mean;
}

function gaussianAmount(min: number, max: number, decimals: number = 6): number {
    const mean = (min + max) / 2;
    const stdDev = (max - min) / 6;
    let value = gaussianRandom(mean, stdDev);
    value = Math.max(min, Math.min(max, value));
    return parseFloat(value.toFixed(decimals));
}

function toUSDC(amount: number): bigint {
    return BigInt(Math.floor(amount * 1e6));
}

function fromUSDC(amount: bigint): number {
    return Number(amount) / 1e6;
}

async function smartDelay(mood: keyof typeof ACTIVITY_MOODS = 'normal', forceShort: boolean = false) {
    const config = ACTIVITY_MOODS[mood];
    
    if (forceShort) {
        const delay = randomInt(1000, 3000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return;
    }
    
    let delay = randomInt(config.minDelay, config.maxDelay);
    
    const hour = new Date().getHours();
    const day = new Date().getDay();
    
    if (hour >= 7 && hour < 9) delay *= 0.6;
    else if (hour >= 9 && hour < 17) delay *= 0.9;
    else if (hour >= 17 && hour < 22) delay *= 0.7;
    else delay *= 1.4;
    
    if (day === 0 || day === 6) delay *= 1.2;
    
    if (Math.random() < 0.08) {
        delay *= randomFloat(2, 4);
        console.log(`   ☕ შემთხვევითი პაუზა: ${(delay / 1000).toFixed(1)}s`);
    }
    
    delay += randomInt(-delay * 0.15, delay * 0.15);
    
    const seconds = (delay / 1000).toFixed(1);
    console.log(`   ⏳ დაყოვნება: ${seconds}s`);
    
    return new Promise(resolve => setTimeout(resolve, delay));
}

function calculateGasPrice(): bigint {
    const baseGwei = gaussianRandom(30, 8);
    const hour = new Date().getHours();
    
    let multiplier = 1.0;
    if (hour >= 14 && hour <= 20) multiplier = 1.2;
    if (hour >= 2 && hour <= 6) multiplier = 0.7;
    
    if (Math.random() < 0.05) {
        multiplier *= randomFloat(1.5, 3);
        console.log(`   ⛽ Gas Spike! ${(baseGwei * multiplier).toFixed(2)} Gwei`);
    }
    
    const finalGwei = Math.max(1, baseGwei * multiplier);
    return ethers.parseUnits(finalGwei.toFixed(2), "gwei");
}

function progressBar(current: number, total: number, length: number = 50): string {
    const percentage = Math.floor((current / total) * 100);
    const filled = Math.floor((current / total) * length);
    const empty = length - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${percentage}% (${current}/${total})`;
}

// ═══════════════════════════════════════════════════════════
// 📊 SESSION STATISTICS
// ═══════════════════════════════════════════════════════════

interface SessionStats {
    startTime: number;
    endTime?: number;
    operatorName: string;
    personality: string;
    mood: string;
    network: string;
    totalAttempts: number;
    successful: number;
    failed: number;
    swaps: number;
    liquidityOps: number;
    limitOrders: number;
    positions: number;
    stakes: number;
    arbitrage: number;
    governance: number;
    totalVolume: number;
    totalFees: number;
    averageSlippage: number;
    largestSwap: number;
    profitLoss: number;
}

let sessionStats: SessionStats;

// ═══════════════════════════════════════════════════════════
// 🏗️ DEPLOYMENT
// ═══════════════════════════════════════════════════════════

async function deployContracts() {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║         🚀 SIMO DEX - Multi-Chain Deployment           ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    const network = await ethers.provider.getNetwork();
    
    console.log("📍 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
    console.log("🌐 Network:", network.name, `(Chain ID: ${network.chainId})\n`);
    
    console.log("🏗️  Deploying Simo DEX Contract...");
    const Simo = await ethers.getContractFactory("Simo");
    const simo = await Simo.deploy();
    await simo.waitForDeployment();
    const simoAddress = await simo.getAddress();
    console.log("✅ Simo DEX deployed:", simoAddress);
    
    let usdcAddress = NETWORKS.arcTestnet.usdc;
    let eurcAddress = NETWORKS.arcTestnet.eurc || NETWORKS.arcTestnet.usdc; // Fallback to USDC if no EURC
    let networkName = "Arc Testnet";
    
    const currentChainId = Number(network.chainId);
    for (const [key, netConfig] of Object.entries(NETWORKS)) {
        if (netConfig.chainId === currentChainId) {
            usdcAddress = netConfig.usdc;
            eurcAddress = netConfig.eurc || netConfig.usdc; // Use USDC if EURC doesn't exist
            networkName = netConfig.name;
            console.log(`\n✅ Detected ${netConfig.name}`);
            console.log(`   USDC: ${usdcAddress}`);
            if (netConfig.eurc) {
                console.log(`   EURC: ${eurcAddress}`);
            } else {
                console.log(`   Token: ${eurcAddress} (USDC only)`);
            }
            break;
        }
    }
    
    const deploymentData = {
        Simo: simoAddress,
        USDC: usdcAddress,
        EURC: eurcAddress,
        network: networkName,
        chainId: currentChainId.toString(),
        deployedAt: new Date().toISOString(),
        deployer: deployer.address
    };
    
    fs.writeFileSync("simo-deployed.json", JSON.stringify(deploymentData, null, 2));
    console.log("\n💾 Deployment data saved to simo-deployed.json\n");
    
    return { simo, usdcAddress, eurcAddress, deploymentData };
}

// ═══════════════════════════════════════════════════════════
// 🎮 MAIN INTERACTION LOGIC
// ═══════════════════════════════════════════════════════════

async function runInteractions() {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║       🎮 SIMO DEX - Smart Trading Interactions         ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    let deploymentData: any;
    try {
        deploymentData = JSON.parse(fs.readFileSync("simo-deployed.json", "utf8"));
        console.log("✅ Deployment config loaded\n");
    } catch {
        console.log("❌ simo-deployed.json not found! Run deployment first.");
        console.log("   Usage: DEPLOY_MODE=true npx hardhat run scripts/SimoMaster.ts --network arcTestnet\n");
        process.exit(1);
    }
    
    const [deployer] = await ethers.getSigners();
    
    const personality = randomChoice(TRADER_PERSONALITIES);
    const operatorName = randomChoice(GEORGIAN_NAMES);
    const mood = personality.mood as keyof typeof ACTIVITY_MOODS;
    
    const totalTrades = randomInt(...ACTIVITY_MOODS[mood].txPerSession);
    
    sessionStats = {
        startTime: Date.now(),
        operatorName,
        personality: personality.desc,
        mood: ACTIVITY_MOODS[mood].description,
        network: deploymentData.network,
        totalAttempts: totalTrades,
        successful: 0,
        failed: 0,
        swaps: 0,
        liquidityOps: 0,
        limitOrders: 0,
        positions: 0,
        stakes: 0,
        arbitrage: 0,
        governance: 0,
        totalVolume: 0,
        totalFees: 0,
        averageSlippage: 0,
        largestSwap: 0,
        profitLoss: 0
    };
    
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║                  👤 TRADER PROFILE                     ║");
    console.log("╚════════════════════════════════════════════════════════╝");
    console.log(`👤 სახელი: ${operatorName}`);
    console.log(`🎭 პერსონალობა: ${personality.desc}`);
    console.log(`📊 განწყობა: ${ACTIVITY_MOODS[mood].description}`);
    console.log(`🌐 ქსელი: ${deploymentData.network}`);
    console.log(`📍 მისამართი: ${deployer.address}`);
    console.log(`💰 ბალანსი: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
    console.log(`🎯 დაგეგმილი ტრანზაქციები: ${totalTrades}\n`);
    
    const simo = await ethers.getContractAt("Simo", deploymentData.Simo);
    const usdc = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", deploymentData.USDC);
    const eurc = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", deploymentData.EURC);
    
    console.log("🔗 Connected to Simo DEX:", deploymentData.Simo);
    console.log("💵 USDC Token:", deploymentData.USDC);
    console.log("💶 EURC Token:", deploymentData.EURC, "\n");
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 1: Setup
    // ═══════════════════════════════════════════════════════════
    
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║                   PHASE 1: Setup                       ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log("👤 Creating trader profile...");
    try {
        const tx = await simo.createProfile(operatorName, { gasPrice: calculateGasPrice() });
        await tx.wait();
        console.log("✅ Profile created:", operatorName);
    } catch (e: any) {
        if (e.message.includes("Profile exists")) {
            console.log("⚠️  Profile already exists");
        } else {
            console.log("⚠️  Profile creation skipped:", e.message.substring(0, 80));
        }
    }
    
    await smartDelay(mood, true);
    
    // Check balances and approve
    console.log("\n💎 Checking token balances...");
    try {
        const usdcBal = await usdc.balanceOf(deployer.address);
        const eurcBal = await eurc.balanceOf(deployer.address);
        
        console.log(`   USDC: ${fromUSDC(usdcBal).toFixed(2)}`);
        console.log(`   EURC: ${fromUSDC(eurcBal).toFixed(2)}`);
        
        if (usdcBal > 0 || eurcBal > 0) {
            console.log("\n🔐 Approving tokens...");
            
            let nonce = await deployer.getNonce();
            
            if (usdcBal > 0) {
                try {
                    const tx = await usdc.approve(deploymentData.Simo, ethers.MaxUint256, { 
                        nonce: nonce++, 
                        gasLimit: 100000 
                    });
                    await tx.wait();
                    console.log("   ✅ USDC approved");
                } catch (e: any) {
                    console.log("   ⚠️  USDC approval skipped");
                }
                
                await new Promise(r => setTimeout(r, 2000));
            }
            
            if (eurcBal > 0) {
                try {
                    const tx = await eurc.approve(deploymentData.Simo, ethers.MaxUint256, { 
                        nonce: nonce++, 
                        gasLimit: 100000 
                    });
                    await tx.wait();
                    console.log("   ✅ EURC approved");
                } catch (e: any) {
                    console.log("   ⚠️  EURC approval skipped");
                }
            }
        } else {
            console.log("\n⚠️  WARNING: No token balance found!");
            console.log("   You need USDC or EURC tokens to trade");
        }
    } catch (e: any) {
        console.log("⚠️  Balance check failed:", e.message.substring(0, 60));
    }
    
    console.log("\n🏊 Setting up liquidity pools...");
    
    const pools = [
        { 
            tokenA: deploymentData.USDC, 
            tokenB: deploymentData.EURC, 
            name: "USDC/EURC",
            feeRate: 5
        }
    ];
    
    for (const pool of pools) {
        try {
            console.log(`\n🔨 Creating pool: ${pool.name}`);
            console.log(`   Fee Rate: ${pool.feeRate / 100}%`);
            
            const tx = await simo.createPool(
                pool.tokenA, 
                pool.tokenB, 
                pool.feeRate,
                { gasPrice: calculateGasPrice() }
            );
            await tx.wait();
            
            console.log(`✅ Pool created: ${pool.name}`);
            await smartDelay('casual');
        } catch (e: any) {
            if (e.message.includes("Pool exists")) {
                console.log(`✅ Pool already exists: ${pool.name}`);
            } else {
                console.log(`⚠️  Pool creation issue: ${e.message.substring(0, 80)}`);
            }
        }
    }
    
    // Add initial liquidity if we have balance
    console.log("\n💧 Adding initial liquidity...");
    try {
        const usdcBal = await usdc.balanceOf(deployer.address);
        const eurcBal = await eurc.balanceOf(deployer.address);
        
        if (usdcBal > toUSDC(200) && eurcBal > toUSDC(200)) {
            const amountA = toUSDC(gaussianAmount(100, 500));
            const amountB = toUSDC(gaussianAmount(100, 500));
            
            const tx = await simo.addLiquidity(
                deploymentData.USDC,
                deploymentData.EURC,
                amountA,
                amountB,
                { gasPrice: calculateGasPrice(), gasLimit: 400000 }
            );
            await tx.wait();
            console.log(`✅ Added ${fromUSDC(amountA).toFixed(0)} USDC + ${fromUSDC(amountB).toFixed(0)} EURC`);
        } else {
            console.log("⚠️  Insufficient balance for liquidity (need 200+ each)");
        }
    } catch (e: any) {
        console.log("⚠️  Liquidity add skipped:", e.message.substring(0, 60));
    }
    
    await smartDelay(mood);
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 2: Trading
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║           PHASE 2: Trading & Interactions              ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log(`🎯 Starting ${totalTrades} transactions...\n`);
    
    for (let i = 0; i < totalTrades; i++) {
        console.log(`\n┌──────────────── Trade ${i + 1}/${totalTrades} ────────────────┐`);
        console.log(`│ 👤 Trader: ${operatorName}`);
        console.log(`│ 🎭 Type: ${personality.type}`);
        console.log(`│ 📊 Mood: ${mood}`);
        
        const actionWeights = getActionWeights(personality.type);
        const action = selectWeightedAction(actionWeights);
        
        try {
            let success = false;
            
            switch (action) {
                case 'swap':
                    success = await performSwap(simo, deploymentData, mood, usdc, eurc, deployer.address);
                    if (success) sessionStats.swaps++;
                    break;
                    
                case 'liquidity':
                    success = await manageLiquidity(simo, deploymentData, mood);
                    if (success) sessionStats.liquidityOps++;
                    break;
                    
                case 'limitOrder':
                    success = await placeLimitOrder(simo, deploymentData, mood);
                    if (success) sessionStats.limitOrders++;
                    break;
                    
                case 'position':
                    success = await createPosition(simo, deploymentData, mood);
                    if (success) sessionStats.positions++;
                    break;
                    
                case 'stake':
                    success = await stakeTokens(simo, deploymentData, mood);
                    if (success) sessionStats.stakes++;
                    break;
                    
                case 'arbitrage':
                    success = await detectArbitrage(simo, deploymentData);
                    if (success) sessionStats.arbitrage++;
                    break;
                    
                case 'governance':
                    success = await governanceAction(simo);
                    if (success) sessionStats.governance++;
                    break;
            }
            
            if (success) {
                sessionStats.successful++;
            } else {
                sessionStats.failed++;
            }
            
        } catch (e: any) {
            console.log(`│ ❌ Transaction failed: ${e.message.substring(0, 60)}`);
            sessionStats.failed++;
        }
        
        console.log(`└─────────────────────────────────────────────────────┘`);
        
        // Auto refill liquidity every 20 transactions
        if ((i + 1) % 20 === 0) {
            console.log(`\n💧 Auto-refilling liquidity...`);
            try {
                const usdcBal = await usdc.balanceOf(deployer.address);
                const eurcBal = await eurc.balanceOf(deployer.address);
                
                if (usdcBal > toUSDC(100) && eurcBal > toUSDC(100)) {
                    const amountA = toUSDC(gaussianAmount(50, 200));
                    const amountB = toUSDC(gaussianAmount(50, 200));
                    
                    const tx = await simo.addLiquidity(
                        deploymentData.USDC,
                        deploymentData.EURC,
                        amountA,
                        amountB,
                        { gasPrice: calculateGasPrice(), gasLimit: 400000 }
                    );
                    await tx.wait();
                    console.log(`✅ Added ${fromUSDC(amountA).toFixed(0)} USDC + ${fromUSDC(amountB).toFixed(0)} EURC`);
                    sessionStats.liquidityOps++;
                } else {
                    console.log(`⚠️  Insufficient balance for auto-refill`);
                }
            } catch (e: any) {
                console.log(`⚠️  Auto-refill skipped: ${e.message.substring(0, 40)}`);
            }
        }
        
        if ((i + 1) % 10 === 0) {
            console.log(`\n${progressBar(i + 1, totalTrades)}`);
            console.log(`✅ Success: ${sessionStats.successful} | ❌ Failed: ${sessionStats.failed}\n`);
        }
        
        if (i < totalTrades - 1) {
            await smartDelay(mood);
        }
    }
    
    sessionStats.endTime = Date.now();
    await displayFinalStats(simo, deployer.address);
}

// ═══════════════════════════════════════════════════════════
// 🎯 TRADING OPERATIONS
// ═══════════════════════════════════════════════════════════

function getActionWeights(personalityType: string): Record<string, number> {
    const weights: Record<string, Record<string, number>> = {
        scalper: { swap: 70, liquidity: 10, limitOrder: 10, position: 5, stake: 3, arbitrage: 2, governance: 0 },
        swing: { swap: 40, liquidity: 20, limitOrder: 20, position: 10, stake: 5, arbitrage: 3, governance: 2 },
        hodler: { swap: 10, liquidity: 30, limitOrder: 5, position: 20, stake: 30, arbitrage: 3, governance: 2 },
        arbitrageur: { swap: 20, liquidity: 10, limitOrder: 10, position: 5, stake: 5, arbitrage: 45, governance: 5 },
        yieldFarmer: { swap: 15, liquidity: 40, limitOrder: 5, position: 25, stake: 10, arbitrage: 3, governance: 2 },
        degen: { swap: 60, liquidity: 15, limitOrder: 15, position: 5, stake: 3, arbitrage: 2, governance: 0 },
        whale: { swap: 30, liquidity: 35, limitOrder: 15, position: 10, stake: 5, arbitrage: 3, governance: 2 },
        bot: { swap: 80, liquidity: 5, limitOrder: 10, position: 3, stake: 1, arbitrage: 1, governance: 0 }
    };
    
    return weights[personalityType] || weights.swing;
}

function selectWeightedAction(weights: Record<string, number>): string {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    
    for (const [action, weight] of Object.entries(weights)) {
        random -= weight;
        if (random <= 0) return action;
    }
    
    return 'swap';
}

async function performSwap(simo: any, deployment: any, mood: keyof typeof ACTIVITY_MOODS, usdc: any, eurc: any, userAddress: string): Promise<boolean> {
    const tokens = [deployment.USDC, deployment.EURC];
    const tokenIn = randomChoice(tokens);
    const tokenOut = tokens.find((t: any) => t !== tokenIn)!;
    
    // Check balance
    const tokenContract = tokenIn === deployment.USDC ? usdc : eurc;
    const balance = await tokenContract.balanceOf(userAddress);
    
    if (balance < toUSDC(1)) {
        console.log(`│ ⚠️  Swap skipped: Insufficient balance`);
        return false;
    }
    
    const [min, max] = ACTIVITY_MOODS[mood].swapSize;
    const maxSwap = Math.min(gaussianAmount(min, max), fromUSDC(balance) * 0.8);
    const amount = toUSDC(maxSwap);
    const minOut = amount * 99n / 100n;
    
    console.log(`│ 🔄 SWAP Operation`);
    console.log(`│    Amount: ${fromUSDC(amount)} tokens`);
    console.log(`│    Route: ${tokenIn === deployment.USDC ? 'USDC → EURC' : 'EURC → USDC'}`);
    console.log(`│    Min Output: ${fromUSDC(minOut)}`);
    
    try {
        const tx = await simo.swap(tokenIn, tokenOut, amount, minOut, {
            gasPrice: calculateGasPrice(),
            gasLimit: 300000
        });
        
        console.log(`│    ⏳ Waiting for confirmation...`);
        const receipt = await tx.wait();
        
        console.log(`│ ✅ Swap successful`);
        console.log(`│    Gas Used: ${receipt!.gasUsed.toString()}`);
        
        sessionStats.totalVolume += fromUSDC(amount);
        if (fromUSDC(amount) > sessionStats.largestSwap) {
            sessionStats.largestSwap = fromUSDC(amount);
        }
        
        return true;
    } catch (e: any) {
        console.log(`│ ⚠️  Swap failed: ${e.message.substring(0, 50)}`);
        return false;
    }
}

async function manageLiquidity(simo: any, deployment: any, mood: keyof typeof ACTIVITY_MOODS): Promise<boolean> {
    const isAdd = Math.random() < 0.7;
    
    const [min, max] = ACTIVITY_MOODS[mood].swapSize;
    const amountA = toUSDC(gaussianAmount(min * 2, max * 2));
    const amountB = toUSDC(gaussianAmount(min * 2, max * 2));
    
    if (isAdd) {
        console.log(`│ 💧 ADD LIQUIDITY`);
        console.log(`│    USDC: ${fromUSDC(amountA)}`);
        console.log(`│    EURC: ${fromUSDC(amountB)}`);
        
        try {
            const tx = await simo.addLiquidity(
                deployment.USDC,
                deployment.EURC,
                amountA,
                amountB,
                { gasPrice: calculateGasPrice(), gasLimit: 350000 }
            );
            await tx.wait();
            console.log(`│ ✅ Liquidity added`);
            return true;
        } catch (e: any) {
            console.log(`│ ⚠️  Add liquidity skipped: ${e.message.substring(0, 40)}`);
            return false;
        }
    } else {
        const liquidity = toUSDC(gaussianAmount(min, max));
        console.log(`│ 💧 REMOVE LIQUIDITY`);
        console.log(`│    Amount: ${fromUSDC(liquidity)}`);
        
        try {
            const tx = await simo.removeLiquidity(
                deployment.USDC,
                deployment.EURC,
                liquidity,
                { gasPrice: calculateGasPrice(), gasLimit: 350000 }
            );
            await tx.wait();
            console.log(`│ ✅ Liquidity removed`);
            return true;
        } catch (e: any) {
            console.log(`│ ⚠️  Remove liquidity skipped: ${e.message.substring(0, 40)}`);
            return false;
        }
    }
}

async function placeLimitOrder(simo: any, deployment: any, mood: keyof typeof ACTIVITY_MOODS): Promise<boolean> {
    const [min, max] = ACTIVITY_MOODS[mood].swapSize;
    const amount = toUSDC(gaussianAmount(min, max));
    const minOut = amount * 105n / 100n;
    const price = (minOut * 1000000n) / amount;
    const expiry = randomInt(3600, 86400);
    
    console.log(`│ 📋 LIMIT ORDER`);
    console.log(`│    Amount: ${fromUSDC(amount)} USDC`);
    console.log(`│    Target: ${fromUSDC(minOut)} EURC`);
    console.log(`│    Expiry: ${(expiry / 3600).toFixed(1)}h`);
    
    try {
        const tx = await simo.placeLimitOrder(
            deployment.USDC,
            deployment.EURC,
            amount,
            minOut,
            price,
            expiry,
            { gasPrice: calculateGasPrice(), gasLimit: 300000 }
        );
        await tx.wait();
        console.log(`│ ✅ Limit order placed`);
        return true;
    } catch (e: any) {
        console.log(`│ ⚠️  Limit order skipped: ${e.message.substring(0, 40)}`);
        return false;
    }
}

async function createPosition(simo: any, deployment: any, mood: keyof typeof ACTIVITY_MOODS): Promise<boolean> {
    const [min, max] = ACTIVITY_MOODS[mood].swapSize;
    const amountA = toUSDC(gaussianAmount(min * 3, max * 3));
    const amountB = toUSDC(gaussianAmount(min * 3, max * 3));
    const lowerTick = randomInt(0, 50);
    const upperTick = randomInt(lowerTick + 10, 100);
    
    console.log(`│ 🎯 CREATE POSITION`);
    console.log(`│    USDC: ${fromUSDC(amountA)}`);
    console.log(`│    EURC: ${fromUSDC(amountB)}`);
    console.log(`│    Range: [${lowerTick}, ${upperTick}]`);
    
    try {
        const tx = await simo.createPosition(
            deployment.USDC,
            deployment.EURC,
            amountA,
            amountB,
            lowerTick,
            upperTick,
            { gasPrice: calculateGasPrice(), gasLimit: 400000 }
        );
        await tx.wait();
        console.log(`│ ✅ Position created`);
        return true;
    } catch (e: any) {
        console.log(`│ ⚠️  Position creation skipped: ${e.message.substring(0, 40)}`);
        return false;
    }
}

async function stakeTokens(simo: any, deployment: any, mood: keyof typeof ACTIVITY_MOODS): Promise<boolean> {
    const isStake = Math.random() < 0.8;
    const [min, max] = ACTIVITY_MOODS[mood].swapSize;
    const amount = toUSDC(gaussianAmount(min * 5, max * 5));
    const lockDays = randomChoice([0, 30, 60, 90, 180]);
    
    if (isStake) {
        console.log(`│ 🔒 STAKE`);
        console.log(`│    Amount: ${fromUSDC(amount)} USDC`);
        console.log(`│    Lock: ${lockDays} days`);
        
        try {
            const tx = await simo.stake(deployment.USDC, amount, lockDays, {
                gasPrice: calculateGasPrice(),
                gasLimit: 300000
            });
            await tx.wait();
            console.log(`│ ✅ Tokens staked`);
            return true;
        } catch (e: any) {
            console.log(`│ ⚠️  Staking skipped: ${e.message.substring(0, 40)}`);
            return false;
        }
    } else {
        console.log(`│ 🔓 UNSTAKE`);
        console.log(`│    Amount: ${fromUSDC(amount)} USDC`);
        
        try {
            const tx = await simo.unstake(deployment.USDC, amount, {
                gasPrice: calculateGasPrice(),
                gasLimit: 300000
            });
            await tx.wait();
            console.log(`│ ✅ Tokens unstaked`);
            return true;
        } catch (e: any) {
            console.log(`│ ⚠️  Unstaking skipped: ${e.message.substring(0, 40)}`);
            return false;
        }
    }
}

async function detectArbitrage(simo: any, deployment: any): Promise<boolean> {
    console.log(`│ 🔍 ARBITRAGE DETECTION`);
    
    try {
        const poolId1 = await simo.getPoolId(deployment.USDC, deployment.EURC);
        const poolId2 = poolId1;
        
        const tx = await simo.detectArbitrage(
            deployment.USDC,
            deployment.EURC,
            poolId1,
            poolId2,
            { gasPrice: calculateGasPrice(), gasLimit: 500000 }
        );
        await tx.wait();
        console.log(`│ ✅ Arbitrage check completed`);
        return true;
    } catch (e: any) {
        console.log(`│ ⚠️  No arbitrage opportunity`);
        return false;
    }
}

async function governanceAction(simo: any): Promise<boolean> {
    const isPropose = Math.random() < 0.7;
    
    if (isPropose) {
        const titles = [
            "შემცირებული ფის განაკვეთი USDC/EURC პულზე",
            "გაზრდილი staking rewards",
            "ახალი ლიკვიდობის პროგრამა",
            "პლატფორმის განვითარების გეგმა",
            "VIP სტატუსის კრიტერიუმები"
        ];
        
        const title = randomChoice(titles);
        const votingPeriod = randomInt(86400, 604800);
        
        console.log(`│ 🗳️  GOVERNANCE PROPOSAL`);
        console.log(`│    Title: ${title}`);
        console.log(`│    Voting Period: ${(votingPeriod / 86400).toFixed(1)} days`);
        
        try {
            const tx = await simo.createProposal(
                title,
                `დეტალური აღწერა: ${title}`,
                votingPeriod,
                { gasPrice: calculateGasPrice(), gasLimit: 300000 }
            );
            await tx.wait();
            console.log(`│ ✅ Proposal created`);
            return true;
        } catch (e: any) {
            console.log(`│ ⚠️  Proposal skipped: ${e.message.substring(0, 40)}`);
            return false;
        }
    } else {
        const proposalId = randomInt(0, 5);
        const support = Math.random() < 0.6;
        
        console.log(`│ 🗳️  VOTE`);
        console.log(`│    Proposal: #${proposalId}`);
        console.log(`│    Vote: ${support ? 'FOR ✅' : 'AGAINST ❌'}`);
        
        try {
            const tx = await simo.vote(proposalId, support, {
                gasPrice: calculateGasPrice(),
                gasLimit: 200000
            });
            await tx.wait();
            console.log(`│ ✅ Vote cast`);
            return true;
        } catch (e: any) {
            console.log(`│ ⚠️  Voting skipped: ${e.message.substring(0, 40)}`);
            return false;
        }
    }
}

async function displayFinalStats(simo: any, userAddress: string) {
    const duration = ((sessionStats.endTime! - sessionStats.startTime) / 1000 / 60).toFixed(1);
    const successRate = ((sessionStats.successful / sessionStats.totalAttempts) * 100).toFixed(1);
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║                  📊 FINAL ANALYTICS                    ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    try {
        const profile = await simo.getProfile(userAddress);
        console.log("👤 User Profile:");
        console.log(`   Name: ${profile[0]}`);
        console.log(`   Reputation: ${profile[1].toString()}`);
        console.log(`   Total Trades: ${profile[2].toString()}`);
        console.log(`   Total Volume: ${fromUSDC(profile[3])} USDC`);
        console.log(`   VIP Status: ${profile[4] ? '⭐ Yes' : '🔸 No'}`);
        console.log(`   Referral Rewards: ${fromUSDC(profile[5])} USDC`);
    } catch (e: any) {
        console.log("⚠️  Profile data unavailable");
    }
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║                🏆 SESSION SUMMARY                      ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log(`👤 Operator: ${sessionStats.operatorName}`);
    console.log(`🎭 Personality: ${sessionStats.personality}`);
    console.log(`📊 Mood: ${sessionStats.mood}`);
    console.log(`🌐 Network: ${sessionStats.network}`);
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log(`✅ Success Rate: ${successRate}%`);
    
    console.log(`\n📈 Activity Breakdown:`);
    console.log(`   ✅ Successful: ${sessionStats.successful}`);
    console.log(`   ❌ Failed: ${sessionStats.failed}`);
    console.log(`   🔄 Swaps: ${sessionStats.swaps}`);
    console.log(`   💧 Liquidity: ${sessionStats.liquidityOps}`);
    console.log(`   📋 Limit Orders: ${sessionStats.limitOrders}`);
    console.log(`   🎯 Positions: ${sessionStats.positions}`);
    console.log(`   🔒 Stakes: ${sessionStats.stakes}`);
    console.log(`   🔍 Arbitrage: ${sessionStats.arbitrage}`);
    console.log(`   🗳️  Governance: ${sessionStats.governance}`);
    
    console.log(`\n💰 Financial Stats:`);
    console.log(`   Total Volume: ${sessionStats.totalVolume.toFixed(2)} USDC`);
    console.log(`   Largest Swap: ${sessionStats.largestSwap.toFixed(2)} USDC`);
    console.log(`   Est. Fees Paid: ${(sessionStats.totalVolume * 0.0005).toFixed(4)} USDC`);
    
    const graph = '█'.repeat(Math.min(50, Math.floor(sessionStats.successful / 2)));
    console.log(`\n📊 Success Graph:\n   [${graph}]`);
    
    const sessionData = {
        ...sessionStats,
        endTime: sessionStats.endTime!,
        duration: parseFloat(duration),
        successRate: parseFloat(successRate)
    };
    
    fs.writeFileSync("simo-session.json", JSON.stringify(sessionData, null, 2));
    console.log("\n💾 Session data saved to simo-session.json");
    console.log("\n╚════════════════════════════════════════════════════════╝\n");
}

// ═══════════════════════════════════════════════════════════
// 🚀 MAIN EXECUTION
// ═══════════════════════════════════════════════════════════

async function main() {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║        🎮 SIMO DEX - Multi-Chain Trading System        ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    const shouldDeploy = process.env.DEPLOY_MODE === 'true';
    
    if (shouldDeploy) {
        console.log("🏗️  DEPLOYMENT MODE\n");
        await deployContracts();
        
        console.log("\n╔════════════════════════════════════════════════════════╗");
        console.log("║              ✅ DEPLOYMENT COMPLETED!                  ║");
        console.log("╚════════════════════════════════════════════════════════╝\n");
        console.log("📝 Next steps:");
        console.log("   1. Ensure you have USDC and EURC tokens");
        console.log("   2. Run interactions:\n");
        console.log("   npx hardhat run scripts/SimoMaster.ts --network arcTestnet\n");
    } else {
        console.log("🎮 INTERACTION MODE\n");
        
        try {
            fs.readFileSync("simo-deployed.json", "utf8");
        } catch {
            console.log("❌ ERROR: simo-deployed.json not found!\n");
            console.log("📝 First run deployment:");
            console.log("   DEPLOY_MODE=true npx hardhat run scripts/SimoMaster.ts --network arcTestnet\n");
            process.exit(1);
        }
        
        await runInteractions();
        
        console.log("\n╔════════════════════════════════════════════════════════╗");
        console.log("║              🎉 SESSION COMPLETED!                     ║");
        console.log("╚════════════════════════════════════════════════════════╝\n");
        console.log("🔄 Run again for more trading:");
        console.log("   npx hardhat run scripts/SimoMaster.ts --network arcTestnet\n");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Critical Error:", error);
        process.exit(1);
    });