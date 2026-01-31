import { ethers } from "hardhat";
import * as fs from "fs";

// ═══════════════════════════════════════════════════════════
// 🎭 ქართული სახელები და კონფიგურაცია
// ═══════════════════════════════════════════════════════════

const GEORGIAN_NAMES = [
    "გიორგი", "ნინო", "დავით", "მარიამ", "ნიკა", "ანა", "ლუკა", "თამარ",
    "გიგა", "ელენე", "საბა", "სალომე", "ლაშა", "ქეთევან", "გურამ", "თეა",
    "ბექა", "ნათია", "ალექსი", "მაკა", "გია", "ლია", "ზურა", "დიანა",
    "ლევან", "ნატო", "ირაკლი", "ქეთი", "ვახტანგ", "მარინე", "ნუგო", "სოფო"
];

const NFT_NAMES = [
    "თბილისის ღამე", "კავკასიონის მთები", "ქართული ვაზი", "სვანეთის კოშკები",
    "ბათუმის ზღვა", "მცხეთის ტაძარი", "კაზბეგის პიკი", "გელათის მონასტერი",
    "საქართველოს გული", "ქართული სული", "HP კრიპტო არტი", "HP დიჯიტალური ხელოვნება",
    "არკის მომავალი", "DeFi რევოლუცია", "ბლოკჩეინის ლეგენდა", "საქართველოს ტოკენი"
];

const NFT_RARITIES = ["Common", "Rare", "Epic", "Legendary", "Mythic"];

const ACTIVITY_MOODS = {
    aggressive: { minDelay: 15000, maxDelay: 45000, txPerSession: [15, 30] },
    normal: { minDelay: 30000, maxDelay: 90000, txPerSession: [10, 20] },
    casual: { minDelay: 60000, maxDelay: 180000, txPerSession: [5, 15] },
    strategic: { minDelay: 45000, maxDelay: 120000, txPerSession: [8, 18] }
};

// ═══════════════════════════════════════════════════════════
// 🧮 Utility ფუნქციები
// ═══════════════════════════════════════════════════════════

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
    return array[randomInt(0, array.length - 1)];
}

function randomAmount(min: number, max: number): bigint {
    const value = Math.random() * (max - min) + min;
    return ethers.parseEther(value.toFixed(6));
}

function gaussianRandom(mean: number = 0, stdDev: number = 1): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stdDev + mean;
}

function gaussianAmount(min: number, max: number): bigint {
    const mean = (min + max) / 2;
    const stdDev = (max - min) / 6;
    let value = gaussianRandom(mean, stdDev);
    value = Math.max(min, Math.min(max, value));
    return ethers.parseEther(value.toFixed(6));
}

async function smartDelay(mood: keyof typeof ACTIVITY_MOODS = 'normal') {
    const config = ACTIVITY_MOODS[mood];
    let delay = randomInt(config.minDelay, config.maxDelay);
    
    // ადამიანური ფაქტორები
    const hour = new Date().getHours();
    
    // დილა (7-9): სწრაფი
    if (hour >= 7 && hour < 9) delay *= 0.7;
    // სამსახურის საათები (9-18): ნორმალური
    else if (hour >= 9 && hour < 18) delay *= 1.0;
    // საღამო (18-23): აქტიური
    else if (hour >= 18 && hour < 23) delay *= 0.9;
    // ღამე (23-7): ნელი
    else delay *= 1.5;
    
    // დღის შემთხვევითობა
    if (Math.random() < 0.1) delay *= randomInt(15, 25) / 10; // 10% chance dramatic change
    
    const seconds = (delay / 1000).toFixed(1);
    console.log(`   ⏳ პაუზა: ${seconds}s`);
    
    return new Promise(resolve => setTimeout(resolve, delay));
}

function calculateGasPrice(): bigint {
    const baseGwei = Math.random() * 20 + 25; // 25-45 Gwei
    const hour = new Date().getHours();
    
    let multiplier = 1.0;
    if (hour >= 12 && hour <= 18) multiplier = 1.15; // peak hours
    if (hour >= 0 && hour <= 6) multiplier = 0.85; // low activity
    
    const adjusted = baseGwei * multiplier;
    return ethers.parseUnits(adjusted.toFixed(2), "gwei");
}

function progressBar(current: number, total: number, length: number = 40): string {
    const percentage = Math.floor((current / total) * 100);
    const filled = Math.floor((current / total) * length);
    const empty = length - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage}%`;
}

// ═══════════════════════════════════════════════════════════
// 📊 სესიის სტატისტიკა
// ═══════════════════════════════════════════════════════════

interface SessionStats {
    startTime: number;
    endTime?: number;
    operatorName: string;
    totalAttempts: number;
    successful: number;
    failed: number;
    swaps: number;
    liquidityOps: number;
    nftMints: number;
    nftTrades: number;
    stakes: number;
    governance: number;
    arbitrage: number;
    totalVolume: bigint;
    totalGasUsed: bigint;
    mood: string;
}

let sessionStats: SessionStats;

// ═══════════════════════════════════════════════════════════
// 🏗️ DEPLOY ფუნქცია
// ═══════════════════════════════════════════════════════════

async function deployContracts() {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║           🚀 HP DeFi Empire - Deployment               ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log("📍 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH\n");
    
    // Deploy Main Contract
    console.log("🏗️  Deploying HPDeFiEmpire...");
    const HPDeFiEmpire = await ethers.getContractFactory("HPDeFiEmpire");
    const empire = await HPDeFiEmpire.deploy();
    await empire.waitForDeployment();
    const empireAddress = await empire.getAddress();
    console.log("✅ HPDeFiEmpire:", empireAddress);
    
    // Deploy Test Tokens
    console.log("\n🪙 Deploying Test Tokens...");
    
    // ✅ FIXED: Testtoken.sol with lowercase 't'
    const Token = await ethers.getContractFactory("contracts/Testtoken.sol:TestToken");
    
    const tcl = await Token.deploy("TCL Token", "TCL", ethers.parseEther("10000000"));
    await tcl.waitForDeployment();
    const tclAddress = await tcl.getAddress();
    console.log("   ▸ TCL:", tclAddress);
    
    const samsung = await Token.deploy("Samsung Token", "SAMSUNG", ethers.parseEther("10000000"));
    await samsung.waitForDeployment();
    const samsungAddress = await samsung.getAddress();
    console.log("   ▸ SAMSUNG:", samsungAddress);
    
    const lg = await Token.deploy("LG Token", "LG", ethers.parseEther("10000000"));
    await lg.waitForDeployment();
    const lgAddress = await lg.getAddress();
    console.log("   ▸ LG:", lgAddress);
    
    // Save addresses
    const addresses = {
        HPDeFiEmpire: empireAddress,
        TCL: tclAddress,
        SAMSUNG: samsungAddress,
        LG: lgAddress,
        deployedAt: new Date().toISOString(),
        network: "arc-testnet"
    };
    
    fs.writeFileSync("hp-deployed.json", JSON.stringify(addresses, null, 2));
    console.log("\n💾 Addresses saved to hp-deployed.json");
    
    return { empire, tcl, samsung, lg, addresses };
}

// ═══════════════════════════════════════════════════════════
// 🎯 მთავარი ინტერაქციის ფუნქცია
// ═══════════════════════════════════════════════════════════

async function runInteractions() {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║        🎮 HP DeFi Empire - Smart Interactions          ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    // Load addresses
    let addresses;
    try {
        addresses = JSON.parse(fs.readFileSync("hp-deployed.json", "utf8"));
        console.log("✅ კონფიგურაცია ჩატვირთულია\n");
    } catch {
        console.log("❌ hp-deployed.json not found! Run deployment first.");
        process.exit(1);
    }
    
    const [deployer] = await ethers.getSigners();
    const operatorName = randomChoice(GEORGIAN_NAMES);
    const mood = randomChoice(Object.keys(ACTIVITY_MOODS)) as keyof typeof ACTIVITY_MOODS;
    
    // Initialize session stats
    sessionStats = {
        startTime: Date.now(),
        operatorName,
        totalAttempts: 0,
        successful: 0,
        failed: 0,
        swaps: 0,
        liquidityOps: 0,
        nftMints: 0,
        nftTrades: 0,
        stakes: 0,
        governance: 0,
        arbitrage: 0,
        totalVolume: 0n,
        totalGasUsed: 0n,
        mood
    };
    
    console.log("👤 ოპერატორი:", operatorName);
    console.log("🎭 განწყობა:", mood);
    console.log("📍 Address:", deployer.address);
    console.log("💰 ETH Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
    
    // Connect to contracts
    const empire = await ethers.getContractAt("HPDeFiEmpire", addresses.HPDeFiEmpire);
    const tcl = await ethers.getContractAt("TestToken", addresses.TCL);
    const samsung = await ethers.getContractAt("TestToken", addresses.SAMSUNG);
    const lg = await ethers.getContractAt("TestToken", addresses.LG);
    
    console.log("\n🔗 Connected to HPDeFiEmpire:", addresses.HPDeFiEmpire);
    
    // Check balances
    const tclBal = await tcl.balanceOf(deployer.address);
    const samBal = await samsung.balanceOf(deployer.address);
    const lgBal = await lg.balanceOf(deployer.address);
    
    console.log("\n💎 Token Balances:");
    console.log("   ▸ TCL:", ethers.formatEther(tclBal));
    console.log("   ▸ SAMSUNG:", ethers.formatEther(samBal));
    console.log("   ▸ LG:", ethers.formatEther(lgBal));
    
    // ═══════════════════════════════════════════════════════════
    // 🎬 PHASE 1: Setup & Approvals
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║                   PHASE 1: Setup                       ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    // Create Profile
    console.log("👤 Creating user profile...");
    try {
        const gas = calculateGasPrice();
        const tx = await empire.createProfile(operatorName, { gasPrice: gas });
        await tx.wait();
        console.log("✅ Profile created:", operatorName);
    } catch (e: any) {
        if (!e.message.includes("Profile exists")) {
            console.log("⚠️  Profile creation skipped");
        }
    }
    
    // Batch Approvals
    console.log("\n🔐 Approving tokens...");
    const maxApproval = ethers.MaxUint256;
    
    // Sequential approvals with nonce management to avoid "replacement transaction underpriced"
    try {
        let nonce = await deployer.getNonce();
        
        console.log("   Approving TCL...");
        const tx1 = await tcl.approve(addresses.HPDeFiEmpire, maxApproval, { 
            nonce: nonce++,
            gasLimit: 100000
        });
        await tx1.wait();
        console.log("   ✅ TCL approved");
        
        console.log("   Approving SAMSUNG...");
        const tx2 = await samsung.approve(addresses.HPDeFiEmpire, maxApproval, { 
            nonce: nonce++,
            gasLimit: 100000
        });
        await tx2.wait();
        console.log("   ✅ SAMSUNG approved");
        
        console.log("   Approving LG...");
        const tx3 = await lg.approve(addresses.HPDeFiEmpire, maxApproval, { 
            nonce: nonce++,
            gasLimit: 100000
        });
        await tx3.wait();
        console.log("   ✅ LG approved");
        
        console.log("✅ All tokens approved (3/3)\n");
    } catch (e: any) {
        console.log("⚠️  Approval error:", e.message.substring(0, 100));
        console.log("Retrying with sequential approvals...\n");
        
        await tcl.approve(addresses.HPDeFiEmpire, maxApproval);
        await new Promise(r => setTimeout(r, 2000));
        await samsung.approve(addresses.HPDeFiEmpire, maxApproval);
        await new Promise(r => setTimeout(r, 2000));
        await lg.approve(addresses.HPDeFiEmpire, maxApproval);
        console.log("✅ All tokens approved\n");
    }
    
    await smartDelay(mood);
    
    // ═══════════════════════════════════════════════════════════
    // 🎬 PHASE 2: Create Pools
    // ═══════════════════════════════════════════════════════════
    
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║                  PHASE 2: Create Pools                 ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    const pools = [
        { tokenA: addresses.TCL, tokenB: addresses.SAMSUNG, name: "TCL/SAMSUNG" },
        { tokenA: addresses.SAMSUNG, tokenB: addresses.LG, name: "SAMSUNG/LG" },
        { tokenA: addresses.TCL, tokenB: addresses.LG, name: "TCL/LG" }
    ];
    
    for (const pool of pools) {
        try {
            console.log(`🏊 Creating pool: ${pool.name}`);
            const tx = await empire.createPool(pool.tokenA, pool.tokenB, { gasPrice: calculateGasPrice() });
            await tx.wait();
            console.log(`✅ Pool created: ${pool.name}`);
            await smartDelay('casual');
        } catch (e: any) {
            if (e.message.includes("Pool exists")) {
                console.log(`⚠️  Pool already exists: ${pool.name}`);
            } else {
                console.log(`❌ Error creating ${pool.name}:`, e.message.substring(0, 100));
            }
        }
    }
    
    await smartDelay(mood);
    
    // ═══════════════════════════════════════════════════════════
    // 🎬 PHASE 3: Add Initial Liquidity
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║              PHASE 3: Initial Liquidity                ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    const liquidityOps = [
        { tokenA: addresses.TCL, tokenB: addresses.SAMSUNG, amountA: "1000", amountB: "1000" },
        { tokenA: addresses.SAMSUNG, tokenB: addresses.LG, amountA: "800", amountB: "800" },
        { tokenA: addresses.TCL, tokenB: addresses.LG, amountA: "900", amountB: "900" }
    ];
    
    for (const op of liquidityOps) {
        try {
            console.log(`💧 Adding liquidity: ${op.amountA} + ${op.amountB}`);
            const tx = await empire.addLiquidity(
                op.tokenA,
                op.tokenB,
                ethers.parseEther(op.amountA),
                ethers.parseEther(op.amountB),
                { gasPrice: calculateGasPrice() }
            );
            const receipt = await tx.wait();
            sessionStats.liquidityOps++;
            sessionStats.successful++;
            console.log(`✅ Liquidity added (Gas: ${receipt!.gasUsed.toString()})`);
            await smartDelay(mood);
        } catch (e: any) {
            console.log("❌ Liquidity failed:", e.message.substring(0, 80));
            sessionStats.failed++;
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // 🎬 PHASE 4: Smart Trading & Arbitrage
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║           PHASE 4: Smart Trading & Arbitrage          ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    const [minTx, maxTx] = ACTIVITY_MOODS[mood].txPerSession;
    const totalTrades = randomInt(minTx, maxTx);
    console.log(`🎯 Planned trades: ${totalTrades}\n`);
    
    sessionStats.totalAttempts = totalTrades;
    
    for (let i = 0; i < totalTrades; i++) {
        console.log(`\n┌─────────────────── Trade ${i + 1}/${totalTrades} ───────────────────┐`);
        console.log(`│ Operator: ${operatorName} | Mood: ${mood}`);
        
        const actionType = randomInt(1, 100);
        
        try {
            let success = false;
            
            // 40% Swaps
            if (actionType <= 40) {
                success = await performSwap(empire, addresses, deployer.address);
                if (success) sessionStats.swaps++;
            }
            // 20% Liquidity Management
            else if (actionType <= 60) {
                success = await manageLiquidity(empire, addresses);
                if (success) sessionStats.liquidityOps++;
            }
            // 15% NFT Operations
            else if (actionType <= 75) {
                success = await nftOperations(empire, addresses);
                if (success) sessionStats.nftMints++;
            }
            // 10% Staking
            else if (actionType <= 85) {
                success = await stakingOperations(empire, addresses, deployer.address);
                if (success) sessionStats.stakes++;
            }
            // 10% Arbitrage Detection
            else if (actionType <= 95) {
                success = await detectArbitrage(empire, addresses);
                if (success) sessionStats.arbitrage++;
            }
            // 5% Governance
            else {
                success = await governanceOperations(empire);
                if (success) sessionStats.governance++;
            }
            
            if (success) {
                sessionStats.successful++;
                console.log("└─────────────────────────────────────────────────────┘");
            } else {
                sessionStats.failed++;
            }
            
        } catch (e: any) {
            console.log("❌ Transaction failed:", e.message.substring(0, 100));
            sessionStats.failed++;
            console.log("└─────────────────────────────────────────────────────┘");
        }
        
        // Progress bar every 5 trades
        if ((i + 1) % 5 === 0) {
            console.log("\n" + progressBar(i + 1, totalTrades));
        }
        
        if (i < totalTrades - 1) {
            await smartDelay(mood);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // 🎬 PHASE 5: Advanced NFT Trading
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║              PHASE 5: NFT Marketplace                  ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    const nftMintCount = randomInt(3, 8);
    console.log(`🎨 Minting ${nftMintCount} unique NFTs...\n`);
    
    for (let i = 0; i < nftMintCount; i++) {
        try {
            const name = randomChoice(NFT_NAMES);
            const rarity = randomChoice(NFT_RARITIES);
            const metadata = `ipfs://HP${randomInt(1000, 9999)}`;
            const price = gaussianAmount(10, 500);
            const royalty = randomInt(100, 500); // 1-5%
            
            console.log(`🖼️  Minting: "${name}" [${rarity}]`);
            console.log(`   Price: ${ethers.formatEther(price)} TCL | Royalty: ${royalty / 100}%`);
            
            const tx = await empire.mintNFT(
                name,
                metadata,
                price,
                royalty,
                rarity,
                { gasPrice: calculateGasPrice() }
            );
            await tx.wait();
            
            sessionStats.nftMints++;
            console.log(`✅ NFT minted successfully\n`);
            
            await smartDelay('casual');
        } catch (e: any) {
            console.log("❌ NFT mint failed:", e.message.substring(0, 80), "\n");
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // 🎬 PHASE 6: Final Analytics
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║                  📊 Final Analytics                    ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    try {
        const profile = await empire.getProfile(deployer.address);
        console.log("👤 User Profile:");
        console.log(`   Name: ${profile[0]}`);
        console.log(`   Reputation: ${profile[1].toString()}`);
        console.log(`   Total Trades: ${profile[2].toString()}`);
        console.log(`   Total Volume: ${ethers.formatEther(profile[3])}`);
        console.log(`   Verified: ${profile[4] ? '✅' : '❌'}`);
        console.log(`   VIP Status: ${profile[5] ? '⭐' : '🔸'}`);
        
        console.log("\n📊 Platform Stats:");
        const platformStats = await empire.getPlatformStats();
        console.log(`   Total Pools: ${platformStats[0].toString()}`);
        console.log(`   Total Users: ${platformStats[1].toString()}`);
        console.log(`   Total NFTs: ${platformStats[2].toString()}`);
        console.log(`   Lifetime Volume: ${ethers.formatEther(platformStats[3])}`);
        console.log(`   Lifetime Fees: ${ethers.formatEther(platformStats[4])}`);
        
    } catch (e: any) {
        console.log("⚠️  Analytics unavailable:", e.message.substring(0, 80));
    }
    
    // ═══════════════════════════════════════════════════════════
    // 📈 SESSION SUMMARY
    // ═══════════════════════════════════════════════════════════
    
    sessionStats.endTime = Date.now();
    const duration = ((sessionStats.endTime - sessionStats.startTime) / 1000 / 60).toFixed(1);
    const successRate = ((sessionStats.successful / sessionStats.totalAttempts) * 100).toFixed(1);
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║                  🏆 SESSION SUMMARY                    ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log(`👤 Operator: ${sessionStats.operatorName}`);
    console.log(`🎭 Mood: ${sessionStats.mood}`);
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log(`📊 Success Rate: ${successRate}%`);
    console.log(`\n📈 Activity Breakdown:`);
    console.log(`   ✅ Successful: ${sessionStats.successful}`);
    console.log(`   ❌ Failed: ${sessionStats.failed}`);
    console.log(`   🔄 Swaps: ${sessionStats.swaps}`);
    console.log(`   💧 Liquidity Ops: ${sessionStats.liquidityOps}`);
    console.log(`   🎨 NFTs Minted: ${sessionStats.nftMints}`);
    console.log(`   🎭 NFT Trades: ${sessionStats.nftTrades}`);
    console.log(`   🔒 Staking Ops: ${sessionStats.stakes}`);
    console.log(`   🔍 Arbitrage: ${sessionStats.arbitrage}`);
    console.log(`   🗳️  Governance: ${sessionStats.governance}`);
    
    const graph = '█'.repeat(Math.floor(sessionStats.successful / 2));
    console.log(`\n📊 Success Graph: [${graph}]`);
    
    // Save session data
    fs.writeFileSync("hp-session.json", JSON.stringify(sessionStats, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    , 2));
    
    console.log("\n💾 Session data saved to hp-session.json");
    console.log("\n╚════════════════════════════════════════════════════════╝\n");

}

// ═══════════════════════════════════════════════════════════
// 🎯 დამხმარე ფუნქციები - Trading Operations
// ═══════════════════════════════════════════════════════════

async function performSwap(empire: any, addresses: any, userAddress: string): Promise<boolean> {
    const tokens = [addresses.TCL, addresses.SAMSUNG, addresses.LG];
    const tokenIn = randomChoice(tokens);
    let tokenOut = randomChoice(tokens);
    
    while (tokenOut === tokenIn) {
        tokenOut = randomChoice(tokens);
    }
    
    const amount = gaussianAmount(1, 50);
    
    console.log(`│ 🔄 Swap: ${ethers.formatEther(amount)} tokens`);
    
    try {
        const tx = await empire.swap(tokenIn, tokenOut, amount, 0, {
            gasPrice: calculateGasPrice()
        });
        const receipt = await tx.wait();
        console.log(`│ ✅ Swap completed (Gas: ${receipt!.gasUsed.toString()})`);
        return true;
    } catch (e: any) {
        console.log(`│ ❌ Swap failed: ${e.message.substring(0, 60)}`);
        return false;
    }
}

async function manageLiquidity(empire: any, addresses: any): Promise<boolean> {
    const action = Math.random() < 0.7 ? 'add' : 'remove';
    
    const pools = [
        { tokenA: addresses.TCL, tokenB: addresses.SAMSUNG },
        { tokenA: addresses.SAMSUNG, tokenB: addresses.LG },
        { tokenA: addresses.TCL, tokenB: addresses.LG }
    ];
    
    const pool = randomChoice(pools);
    
    if (action === 'add') {
        const amountA = gaussianAmount(10, 200);
        const amountB = gaussianAmount(10, 200);
        
        console.log(`│ 💧 Adding liquidity: ${ethers.formatEther(amountA)} + ${ethers.formatEther(amountB)}`);
        
        try {
            const tx = await empire.addLiquidity(
                pool.tokenA,
                pool.tokenB,
                amountA,
                amountB,
                { gasPrice: calculateGasPrice() }
            );
            await tx.wait();
            console.log(`│ ✅ Liquidity added`);
            return true;
        } catch (e: any) {
            console.log(`│ ❌ Add liquidity failed`);
            return false;
        }
    } else {
        const liquidity = gaussianAmount(5, 50);
        
        console.log(`│ 💧 Removing liquidity: ${ethers.formatEther(liquidity)}`);
        
        try {
            const tx = await empire.removeLiquidity(
                pool.tokenA,
                pool.tokenB,
                liquidity,
                { gasPrice: calculateGasPrice() }
            );
            await tx.wait();
            console.log(`│ ✅ Liquidity removed`);
            return true;
        } catch (e: any) {
            console.log(`│ ❌ Remove liquidity failed`);
            return false;
        }
    }
}

async function nftOperations(empire: any, addresses: any): Promise<boolean> {
    const operations = ['mint', 'list', 'buy'];
    const operation = randomChoice(operations);
    
    if (operation === 'mint') {
        const name = randomChoice(NFT_NAMES);
        const rarity = randomChoice(NFT_RARITIES);
        const metadata = `ipfs://HP${randomInt(10000, 99999)}`;
        const price = gaussianAmount(5, 100);
        const royalty = randomInt(100, 800);
        
        console.log(`│ 🎨 Minting NFT: "${name}" [${rarity}]`);
        
        try {
            const tx = await empire.mintNFT(name, metadata, price, royalty, rarity, {
                gasPrice: calculateGasPrice()
            });
            await tx.wait();
            console.log(`│ ✅ NFT minted`);
            return true;
        } catch (e: any) {
            console.log(`│ ❌ NFT mint failed`);
            return false;
        }
    } else if (operation === 'list') {
        const tokenId = randomInt(1, 10);
        const price = gaussianAmount(10, 500);
        
        console.log(`│ 🏷️  Listing NFT #${tokenId} for ${ethers.formatEther(price)}`);
        
        try {
            const tx = await empire.listNFT(tokenId, price, { gasPrice: calculateGasPrice() });
            await tx.wait();
            console.log(`│ ✅ NFT listed`);
            return true;
        } catch (e: any) {
            console.log(`│ ❌ NFT listing failed`);
            return false;
        }
    } else {
        const tokenId = randomInt(1, 10);
        const paymentToken = addresses.TCL;
        
        console.log(`│ 💰 Buying NFT #${tokenId}`);
        
        try {
            const tx = await empire.buyNFT(tokenId, paymentToken, { gasPrice: calculateGasPrice() });
            await tx.wait();
            console.log(`│ ✅ NFT purchased`);
            sessionStats.nftTrades++;
            return true;
        } catch (e: any) {
            console.log(`│ ❌ NFT purchase failed`);
            return false;
        }
    }
}

async function stakingOperations(empire: any, addresses: any, userAddress: string): Promise<boolean> {
    const action = Math.random() < 0.7 ? 'stake' : 'unstake';
    const tokens = [addresses.TCL, addresses.SAMSUNG, addresses.LG];
    const token = randomChoice(tokens);
    
    if (action === 'stake') {
        const amount = gaussianAmount(10, 100);
        const lockDays = randomChoice([0, 30, 60, 90]);
        
        console.log(`│ 🔒 Staking ${ethers.formatEther(amount)} (Lock: ${lockDays} days)`);
        
        try {
            const tx = await empire.stake(token, amount, lockDays, { gasPrice: calculateGasPrice() });
            await tx.wait();
            console.log(`│ ✅ Tokens staked`);
            return true;
        } catch (e: any) {
            console.log(`│ ❌ Staking failed`);
            return false;
        }
    } else {
        const amount = gaussianAmount(5, 50);
        
        console.log(`│ 🔓 Unstaking ${ethers.formatEther(amount)}`);
        
        try {
            const tx = await empire.unstake(token, amount, { gasPrice: calculateGasPrice() });
            await tx.wait();
            console.log(`│ ✅ Tokens unstaked`);
            return true;
        } catch (e: any) {
            console.log(`│ ❌ Unstaking failed`);
            return false;
        }
    }
}

async function detectArbitrage(empire: any, addresses: any): Promise<boolean> {
    const tokens = [addresses.TCL, addresses.SAMSUNG, addresses.LG];
    const tokenIn = randomChoice(tokens);
    let tokenOut = randomChoice(tokens);
    
    while (tokenOut === tokenIn) {
        tokenOut = randomChoice(tokens);
    }
    
    // Get all pool IDs (simplified - would need actual implementation)
    const pools = [
        ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address', 'address'], [addresses.TCL, addresses.SAMSUNG])),
        ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address', 'address'], [addresses.SAMSUNG, addresses.LG]))
    ];
    
    const poolA = randomChoice(pools);
    const poolB = randomChoice(pools);
    
    console.log(`│ 🔍 Detecting arbitrage opportunity...`);
    
    try {
        const tx = await empire.detectArbitrage(tokenIn, tokenOut, poolA, poolB, {
            gasPrice: calculateGasPrice()
        });
        const receipt = await tx.wait();
        
        // Check if opportunity was found
        if (receipt && receipt.logs.length > 0) {
            console.log(`│ ✅ Arbitrage opportunity detected!`);
            
            // Try to execute it
            try {
                const executeAmount = gaussianAmount(10, 100);
                const executeTx = await empire.executeArbitrage(0, executeAmount, {
                    gasPrice: calculateGasPrice()
                });
                await executeTx.wait();
                console.log(`│ 💰 Arbitrage executed successfully!`);
            } catch {
                console.log(`│ ⚠️  Arbitrage detection OK, execution skipped`);
            }
            return true;
        } else {
            console.log(`│ ℹ️  No arbitrage opportunity found`);
            return false;
        }
    } catch (e: any) {
        console.log(`│ ❌ Arbitrage detection failed`);
        return false;
    }
}

async function governanceOperations(empire: any): Promise<boolean> {
    const action = Math.random() < 0.6 ? 'propose' : 'vote';
    
    if (action === 'propose') {
        const titles = [
            "გაზრდილი Staking Rewards",
            "NFT Royalty Cap შემცირება",
            "ახალი Pool-ის დამატება",
            "Platform Fee-ს ოპტიმიზაცია",
            "VIP სტატუსის კრიტერიუმები"
        ];
        
        const title = randomChoice(titles);
        const description = `${title} - დეტალური აღწერა და იმპლემენტაციის გეგმა`;
        const votingPeriod = randomInt(1, 5) * 86400; // 1-5 days
        
        console.log(`│ 🗳️  Creating proposal: "${title}"`);
        
        try {
            const tx = await empire.createProposal(title, description, votingPeriod, {
                gasPrice: calculateGasPrice()
            });
            await tx.wait();
            console.log(`│ ✅ Proposal created`);
            return true;
        } catch (e: any) {
            console.log(`│ ❌ Proposal creation failed`);
            return false;
        }
    } else {
        const proposalId = randomInt(0, 5);
        const support = Math.random() < 0.7; // 70% vote for
        
        console.log(`│ 🗳️  Voting on proposal #${proposalId}: ${support ? 'FOR' : 'AGAINST'}`);
        
        try {
            const tx = await empire.vote(proposalId, support, { gasPrice: calculateGasPrice() });
            await tx.wait();
            console.log(`│ ✅ Vote cast`);
            return true;
        } catch (e: any) {
            console.log(`│ ❌ Voting failed`);
            return false;
        }
    }
}

// ═══════════════════════════════════════════════════════════
// 🚀 MAIN EXECUTION
// ═══════════════════════════════════════════════════════════

async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || 'all';
    
    if (mode === 'deploy' || mode === 'all') {
        await deployContracts();
        console.log("\n✅ Deployment completed!\n");
        
        if (mode === 'deploy') {
            console.log("Run: npx hardhat run scripts/Hpmaster.ts --network arcTestnet");
            return;
        }
        
        console.log("⏳ Waiting 5 seconds before starting interactions...\n");
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    if (mode === 'interact' || mode === 'all') {
        await runInteractions();
    }
    
    console.log("\n🎉 HP DeFi Empire - Session Complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Critical Error:", error);
        process.exit(1);
    });
// ═══════════════════════════════════════════════════════════
// 🎯 EXTENDED INTERACTION MODES - დამატებითი ფუნქციები
// ═══════════════════════════════════════════════════════════

async function advancedTradingSession(empire: any, addresses: any, deployer: any) {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║         🔥 ADVANCED TRADING SESSION                    ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    const strategies = ['scalping', 'swing', 'arbitrage', 'market-making'];
    const strategy = randomChoice(strategies);
    
    console.log(`📈 Strategy: ${strategy.toUpperCase()}\n`);
    
    switch(strategy) {
        case 'scalping':
            await scalpingStrategy(empire, addresses, deployer);
            break;
        case 'swing':
            await swingStrategy(empire, addresses, deployer);
            break;
        case 'arbitrage':
            await arbitrageStrategy(empire, addresses, deployer);
            break;
        case 'market-making':
            await marketMakingStrategy(empire, addresses, deployer);
            break;
    }
}

async function scalpingStrategy(empire: any, addresses: any, deployer: any) {
    console.log("⚡ Scalping: Multiple small, quick trades\n");
    
    const trades = randomInt(15, 25);
    for (let i = 0; i < trades; i++) {
        const tokens = [addresses.TCL, addresses.SAMSUNG, addresses.LG];
        const tokenIn = randomChoice(tokens);
        let tokenOut = randomChoice(tokens);
        while (tokenOut === tokenIn) tokenOut = randomChoice(tokens);
        
        const amount = gaussianAmount(1, 10); // Small amounts
        
        try {
            console.log(`⚡ Scalp ${i+1}/${trades}: ${ethers.formatEther(amount)}`);
            const tx = await empire.swap(tokenIn, tokenOut, amount, 0);
            await tx.wait();
            console.log(`✅ Executed`);
            await new Promise(r => setTimeout(r, randomInt(5000, 15000))); // Quick succession
        } catch (e: any) {
            console.log(`❌ Failed`);
        }
    }
}

async function swingStrategy(empire: any, addresses: any, deployer: any) {
    console.log("📊 Swing Trading: Medium-sized strategic positions\n");
    
    const positions = randomInt(5, 10);
    for (let i = 0; i < positions; i++) {
        const tokens = [addresses.TCL, addresses.SAMSUNG, addresses.LG];
        const tokenIn = randomChoice(tokens);
        let tokenOut = randomChoice(tokens);
        while (tokenOut === tokenIn) tokenOut = randomChoice(tokens);
        
        const amount = gaussianAmount(50, 200); // Medium amounts
        
        try {
            console.log(`📊 Position ${i+1}/${positions}: ${ethers.formatEther(amount)}`);
            const tx = await empire.swap(tokenIn, tokenOut, amount, 0);
            await tx.wait();
            console.log(`✅ Position opened`);
            await smartDelay('normal');
        } catch (e: any) {
            console.log(`❌ Failed`);
        }
    }
}

async function arbitrageStrategy(empire: any, addresses: any, deployer: any) {
    console.log("🔍 Arbitrage: Finding price discrepancies\n");
    
    const opportunities = randomInt(3, 8);
    for (let i = 0; i < opportunities; i++) {
        console.log(`🔍 Scanning opportunity ${i+1}/${opportunities}...`);
        
        try {
            const tokens = [addresses.TCL, addresses.SAMSUNG, addresses.LG];
            const tokenIn = randomChoice(tokens);
            let tokenOut = randomChoice(tokens);
            while (tokenOut === tokenIn) tokenOut = randomChoice(tokens);
            
            const pools = [
                ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address', 'address'], [addresses.TCL, addresses.SAMSUNG])),
                ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['address', 'address'], [addresses.SAMSUNG, addresses.LG]))
            ];
            
            const poolA = randomChoice(pools);
            const poolB = randomChoice(pools);
            
            const tx = await empire.detectArbitrage(tokenIn, tokenOut, poolA, poolB);
            await tx.wait();
            console.log(`✅ Opportunity detected`);
            
            await smartDelay('strategic');
        } catch (e: any) {
            console.log(`❌ No opportunity`);
        }
    }
}

async function marketMakingStrategy(empire: any, addresses: any, deployer: any) {
    console.log("💧 Market Making: Providing liquidity across pools\n");
    
    const pools = [
        { tokenA: addresses.TCL, tokenB: addresses.SAMSUNG },
        { tokenA: addresses.SAMSUNG, tokenB: addresses.LG },
        { tokenA: addresses.TCL, tokenB: addresses.LG }
    ];
    
    for (const pool of pools) {
        const amountA = gaussianAmount(100, 500);
        const amountB = gaussianAmount(100, 500);
        
        try {
            console.log(`💧 Adding ${ethers.formatEther(amountA)} + ${ethers.formatEther(amountB)}`);
            const tx = await empire.addLiquidity(pool.tokenA, pool.tokenB, amountA, amountB);
            await tx.wait();
            console.log(`✅ Liquidity added`);
            await smartDelay('normal');
        } catch (e: any) {
            console.log(`❌ Failed`);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// 🎨 NFT MARKETPLACE SIMULATION
// ═══════════════════════════════════════════════════════════

async function nftMarketplaceSimulation(empire: any, addresses: any, deployer: any) {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║            🎨 NFT MARKETPLACE SIMULATION               ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    // Phase 1: Creator Mints Collection
    console.log("📦 Phase 1: Minting Collection...\n");
    const collectionSize = randomInt(5, 12);
    
    for (let i = 0; i < collectionSize; i++) {
        const name = randomChoice(NFT_NAMES);
        const rarity = randomChoice(NFT_RARITIES);
        const metadata = `ipfs://HP-Collection-${randomInt(10000, 99999)}`;
        const basePrice = rarity === 'Legendary' ? gaussianAmount(100, 500) :
                         rarity === 'Epic' ? gaussianAmount(50, 200) :
                         rarity === 'Rare' ? gaussianAmount(20, 100) :
                         gaussianAmount(5, 50);
        const royalty = randomInt(200, 1000); // 2-10%
        
        try {
            console.log(`🎨 [${i+1}/${collectionSize}] "${name}" - ${rarity}`);
            const tx = await empire.mintNFT(name, metadata, basePrice, royalty, rarity);
            await tx.wait();
            console.log(`   ✅ Minted | Price: ${ethers.formatEther(basePrice)} | Royalty: ${royalty/100}%\n`);
            await new Promise(r => setTimeout(r, randomInt(3000, 8000)));
        } catch (e: any) {
            console.log(`   ❌ Mint failed\n`);
        }
    }
    
    // Phase 2: Price Discovery
    console.log("\n💰 Phase 2: Price Discovery & Listings...\n");
    const listingCount = randomInt(3, 8);
    
    for (let i = 0; i < listingCount; i++) {
        const tokenId = randomInt(1, collectionSize);
        const newPrice = gaussianAmount(10, 300);
        
        try {
            console.log(`🏷️  Listing NFT #${tokenId} for ${ethers.formatEther(newPrice)}`);
            const tx = await empire.listNFT(tokenId, newPrice);
            await tx.wait();
            console.log(`   ✅ Listed\n`);
            await new Promise(r => setTimeout(r, randomInt(5000, 10000)));
        } catch (e: any) {
            console.log(`   ❌ Listing failed\n`);
        }
    }
    
    // Phase 3: Secondary Market Trading
    console.log("\n🔄 Phase 3: Secondary Market Trading...\n");
    const trades = randomInt(2, 5);
    
    for (let i = 0; i < trades; i++) {
        const tokenId = randomInt(1, collectionSize);
        const paymentToken = addresses.TCL;
        
        try {
            console.log(`💰 Buying NFT #${tokenId} with TCL...`);
            const tx = await empire.buyNFT(tokenId, paymentToken);
            await tx.wait();
            console.log(`   ✅ Purchase successful\n`);
            sessionStats.nftTrades++;
            await smartDelay('normal');
        } catch (e: any) {
            console.log(`   ❌ Purchase failed\n`);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// 🏦 DEFI STRATEGIES
// ═══════════════════════════════════════════════════════════

async function yieldFarmingSimulation(empire: any, addresses: any, deployer: any) {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║            🌾 YIELD FARMING SIMULATION                 ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    const tokens = [addresses.TCL, addresses.SAMSUNG, addresses.LG];
    
    // Diversified staking across tokens
    console.log("💰 Deploying capital across staking pools...\n");
    
    for (const token of tokens) {
        const lockPeriods = [0, 30, 60, 90];
        const selectedLock = randomChoice(lockPeriods);
        const amount = gaussianAmount(50, 300);
        
        try {
            console.log(`🔒 Staking ${ethers.formatEther(amount)} (${selectedLock} day lock)`);
            const tx = await empire.stake(token, amount, selectedLock);
            await tx.wait();
            
            const apr = selectedLock === 0 ? 5 : selectedLock === 30 ? 7 : selectedLock === 60 ? 10 : 15;
            console.log(`   ✅ Staked | APR: ${apr}%\n`);
            
            await smartDelay('casual');
        } catch (e: any) {
            console.log(`   ❌ Staking failed\n`);
        }
    }
    
    // Check rewards
    console.log("📊 Checking staking positions...\n");
    
    for (const token of tokens) {
        try {
            const info = await empire.getStakeInfo(deployer.address, token);
            console.log(`Token: ${token.substring(0, 10)}...`);
            console.log(`   Staked: ${ethers.formatEther(info[0])}`);
            console.log(`   Pending Rewards: ${ethers.formatEther(info[1])}`);
            console.log(`   Unlock Time: ${info[2].toString() === '0' ? 'Flexible' : new Date(Number(info[2]) * 1000).toLocaleString()}\n`);
        } catch (e: any) {
            console.log(`   No position\n`);
        }
    }
}

async function liquidityMiningSession(empire: any, addresses: any, deployer: any) {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║          💎 LIQUIDITY MINING SESSION                   ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    const pools = [
        { tokenA: addresses.TCL, tokenB: addresses.SAMSUNG, name: "TCL-SAMSUNG" },
        { tokenA: addresses.SAMSUNG, tokenB: addresses.LG, name: "SAMSUNG-LG" },
        { tokenA: addresses.TCL, tokenB: addresses.LG, name: "TCL-LG" }
    ];
    
    console.log("💧 Deploying liquidity to pools...\n");
    
    for (const pool of pools) {
        const amountA = gaussianAmount(200, 800);
        const amountB = gaussianAmount(200, 800);
        
        try {
            console.log(`💎 ${pool.name}: ${ethers.formatEther(amountA)} + ${ethers.formatEther(amountB)}`);
            const tx = await empire.addLiquidity(pool.tokenA, pool.tokenB, amountA, amountB);
            const receipt = await tx.wait();
            console.log(`   ✅ LP tokens received | Gas: ${receipt!.gasUsed.toString()}\n`);
            
            await smartDelay('strategic');
        } catch (e: any) {
            console.log(`   ❌ Failed\n`);
        }
    }
    
    // Check pool stats
    console.log("📊 Pool Analytics...\n");
    
    for (const pool of pools) {
        try {
            const reserves = await empire.getPoolReserves(pool.tokenA, pool.tokenB);
            const price = await empire.getPoolPrice(pool.tokenA, pool.tokenB);
            
            console.log(`${pool.name}:`);
            console.log(`   Reserve A: ${ethers.formatEther(reserves[0])}`);
            console.log(`   Reserve B: ${ethers.formatEther(reserves[1])}`);
            console.log(`   Price: ${ethers.formatEther(price)}\n`);
        } catch (e: any) {
            console.log(`   No data\n`);
        }
    }
}