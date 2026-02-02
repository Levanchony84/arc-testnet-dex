import { ethers } from "hardhat";
import * as fs from "fs";

// ═══════════════════════════════════════════════════════════
// ⚡ ARC CHAOS MODE - უდედისმტყვნელესი CHAOS! ⚡
// ═══════════════════════════════════════════════════════════

const CHAOS_NAMES = [
    "⚡დავითი განადგურებელი", "🔥ნინო ქაოსური", "💀გიორგი დესტრუქტორი",
    "⚔️თამარი მეომარი", "🌪️ნიკა ქარიშხალი", "💥ანა ექსპლოზია",
    "🎯ლუკა სნაიპერი", "🚀ელენე რაკეტა", "⭐საბა სუპერნოვა"
];

const CHAOS_MODES = {
    psycho: { minDelay: 15000, maxDelay: 35000, desc: "😈 PSYCHO - სრული ქაოსი" },
    berserk: { minDelay: 20000, maxDelay: 45000, desc: "🔥 BERSERK - აგრესიული" },
    insane: { minDelay: 10000, maxDelay: 30000, desc: "🌪️ INSANE - შეშლილი" }
};

// ═══════════════════════════════════════════════════════════
// 🧮 Chaos Utils
// ═══════════════════════════════════════════════════════════

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

function toUSDC(amount: number): bigint {
    return ethers.parseUnits(amount.toFixed(6), 6);
}

function toARC(amount: number): bigint {
    return ethers.parseEther(amount.toFixed(6));
}

function fromUSDC(amount: bigint): number {
    return parseFloat(ethers.formatUnits(amount, 6));
}

async function chaosDelay(mode: keyof typeof CHAOS_MODES) {
    const config = CHAOS_MODES[mode];
    const delay = randInt(config.minDelay, config.maxDelay);
    
    // Unpredictable variations
    let adjusted = delay;
    if (Math.random() < 0.2) adjusted *= randInt(5, 15) / 10; // 20% chance wild swing
    
    console.log(`   ⚡ ${(adjusted / 1000).toFixed(1)}s`);
    return new Promise(resolve => setTimeout(resolve, adjusted));
}

function progressBar(current: number, total: number): string {
    const pct = Math.floor((current / total) * 100);
    const filled = Math.floor((current / total) * 50);
    return `[${'█'.repeat(filled)}${'░'.repeat(50 - filled)}] ${pct}%`;
}

// ═══════════════════════════════════════════════════════════
// 📊 Chaos Stats
// ═══════════════════════════════════════════════════════════

interface ChaosStats {
    startTime: number;
    endTime?: number;
    operator: string;
    mode: string;
    totalOps: number;
    successful: number;
    failed: number;
    swaps: number;
    nftOps: number;
    liquidity: number;
    stakes: number;
    auctions: number;
    lotteries: number;
    governance: number;
    fractionalizations: number;
    volume: number;
    chaosLevel: number; // 0-100
}

let stats: ChaosStats;

// ═══════════════════════════════════════════════════════════
// ⚡ Main Chaos Bot
// ═══════════════════════════════════════════════════════════

async function main() {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║        ⚡💀 ARC CHAOS MODE - EXTREME! 💀⚡             ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    // ASCII Art
    console.log("     ⚡⚡⚡  C H A O S  M O D E  ⚡⚡⚡");
    console.log("    🔥💀☠️ არ დაიშურო არაფერი! ☠️💀🔥\n");
    
    // Load deployment
    let deployment: any;
    try {
        deployment = JSON.parse(fs.readFileSync("arc-ultimate.json", "utf8"));
        console.log("✅ Deployment loaded\n");
    } catch {
        console.log("❌ arc-ultimate.json not found!");
        process.exit(1);
    }
    
    const [deployer] = await ethers.getSigners();
    const operator = randChoice(CHAOS_NAMES);
    const mode = randChoice(Object.keys(CHAOS_MODES)) as keyof typeof CHAOS_MODES;
    const totalOps = randInt(70, 130);
    
    stats = {
        startTime: Date.now(),
        operator,
        mode: CHAOS_MODES[mode].desc,
        totalOps,
        successful: 0,
        failed: 0,
        swaps: 0,
        nftOps: 0,
        liquidity: 0,
        stakes: 0,
        auctions: 0,
        lotteries: 0,
        governance: 0,
        fractionalizations: 0,
        volume: 0,
        chaosLevel: 0
    };
    
    console.log("💀 Chaos Operator:", operator);
    console.log("🔥 Mode:", CHAOS_MODES[mode].desc);
    console.log("⚡ Total Operations:", totalOps);
    console.log("📍 Address:", deployer.address);
    
    // Connect
    const ultimate = await ethers.getContractAt("ArcUltimate", deployment.contracts.ArcUltimate);
    const usdc = await ethers.getContractAt("ArcToken", deployment.contracts.USDC);
    const eurc = await ethers.getContractAt("ArcToken", deployment.contracts.EURC);
    const arc = await ethers.getContractAt("ArcToken", deployment.contracts.ARC);
    
    console.log("\n🔗 Connected to Chaos Arena:", deployment.contracts.ArcUltimate);
    
    // ═══════════════════════════════════════════════════════════
    // Quick Setup
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n⚡ RAPID SETUP...");
    
    try {
        const tx = await ultimate.createProfile(operator);
        await tx.wait();
        console.log("✅ Profile");
    } catch {
        console.log("⚠️  Profile OK");
    }
    
    try {
        let nonce = await deployer.getNonce();
        await usdc.approve(deployment.contracts.ArcUltimate, ethers.MaxUint256, { nonce: nonce++ });
        await eurc.approve(deployment.contracts.ArcUltimate, ethers.MaxUint256, { nonce: nonce++ });
        await arc.approve(deployment.contracts.ArcUltimate, ethers.MaxUint256, { nonce: nonce++ });
        console.log("✅ Approvals");
    } catch {
        console.log("⚠️  Approvals OK");
    }
    
    await chaosDelay(mode);
    
    // ═══════════════════════════════════════════════════════════
    // CHAOS PHASE
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║           ⚡💥 CHAOS UNLEASHED 💥⚡                    ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log(`Starting ${totalOps} CHAOTIC operations...\n`);
    
    for (let i = 0; i < totalOps; i++) {
        console.log(`\n┌─ CHAOS ${i + 1}/${totalOps} ─┐`);
        console.log(`│ ${operator}`);
        
        // Completely random operation selection
        const rand = Math.random() * 100;
        
        try {
            let success = false;
            
            if (rand < 25) {
                // 25% - Rapid Swaps
                success = await rapidSwap(ultimate, deployment);
                if (success) stats.swaps++;
                
            } else if (rand < 45) {
                // 20% - Explosive NFT
                success = await explosiveNFT(ultimate, deployment);
                if (success) stats.nftOps++;
                
            } else if (rand < 60) {
                // 15% - Wild Liquidity
                success = await wildLiquidity(ultimate, deployment);
                if (success) stats.liquidity++;
                
            } else if (rand < 72) {
                // 12% - Crazy Staking
                success = await crazyStake(ultimate, deployment);
                if (success) stats.stakes++;
                
            } else if (rand < 82) {
                // 10% - Auction Madness
                success = await auctionMadness(ultimate);
                if (success) stats.auctions++;
                
            } else if (rand < 90) {
                // 8% - Lottery Rush
                success = await lotteryRush(ultimate);
                if (success) stats.lotteries++;
                
            } else if (rand < 96) {
                // 6% - Governance Chaos
                success = await governanceChaos(ultimate);
                if (success) stats.governance++;
                
            } else {
                // 4% - Fractionalize Frenzy
                success = await fractionalizeFrenzy(ultimate);
                if (success) stats.fractionalizations++;
            }
            
            if (success) {
                stats.successful++;
                stats.chaosLevel = Math.min(100, stats.chaosLevel + 2);
            } else {
                stats.failed++;
                stats.chaosLevel = Math.max(0, stats.chaosLevel - 1);
            }
            
        } catch (e: any) {
            console.log(`│ 💥 ${e.message.substring(0, 40)}`);
            stats.failed++;
        }
        
        console.log(`│ 🌪️ Chaos: ${stats.chaosLevel}%`);
        console.log(`└─────────────┘`);
        
        // Chaos meter every 10 ops
        if ((i + 1) % 10 === 0) {
            console.log(`\n${progressBar(i + 1, totalOps)}`);
            console.log(`✅ ${stats.successful} | ❌ ${stats.failed}`);
            
            const chaosMeter = '🔥'.repeat(Math.floor(stats.chaosLevel / 10));
            console.log(`🌪️ CHAOS: [${chaosMeter}] ${stats.chaosLevel}%\n`);
        }
        
        if (i < totalOps - 1) {
            await chaosDelay(mode);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // Chaos Report
    // ═══════════════════════════════════════════════════════════
    
    stats.endTime = Date.now();
    const duration = ((stats.endTime - stats.startTime) / 1000 / 60).toFixed(1);
    const successRate = ((stats.successful / stats.totalOps) * 100).toFixed(1);
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║         ⚡💀 CHAOS AFTERMATH REPORT 💀⚡               ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log(`💀 Chaos Operator: ${stats.operator}`);
    console.log(`🔥 Mode: ${stats.mode}`);
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log(`📊 Success: ${successRate}%`);
    console.log(`🌪️ Final Chaos Level: ${stats.chaosLevel}%\n`);
    
    console.log(`Chaos Breakdown:`);
    console.log(`   ✅ Successful: ${stats.successful}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   🔄 Swaps: ${stats.swaps}`);
    console.log(`   🎨 NFT Ops: ${stats.nftOps}`);
    console.log(`   💧 Liquidity: ${stats.liquidity}`);
    console.log(`   🔒 Stakes: ${stats.stakes}`);
    console.log(`   🎭 Auctions: ${stats.auctions}`);
    console.log(`   🎰 Lotteries: ${stats.lotteries}`);
    console.log(`   🗳️  Governance: ${stats.governance}`);
    console.log(`   🔀 Fractionalizations: ${stats.fractionalizations}`);
    
    const chaosMeter = '🔥'.repeat(Math.floor(stats.chaosLevel / 5));
    console.log(`\n🌪️ CHAOS METER: [${chaosMeter}]`);
    
    const graph = '█'.repeat(Math.floor(stats.successful / 3));
    console.log(`\n⚡ [${graph}]`);
    
    fs.writeFileSync("arc-chaos-stats.json", JSON.stringify(stats, null, 2));
    console.log("\n💾 Stats saved: arc-chaos-stats.json");
    console.log("\n💀 CHAOS MODE COMPLETED! 💀\n");
}

// ═══════════════════════════════════════════════════════════
// ⚡ Chaos Operations
// ═══════════════════════════════════════════════════════════

async function rapidSwap(ultimate: any, deployment: any): Promise<boolean> {
    const tokens = [deployment.contracts.USDC, deployment.contracts.EURC, deployment.contracts.ARC];
    const tokenIn = randChoice(tokens);
    let tokenOut = randChoice(tokens);
    while (tokenOut === tokenIn) tokenOut = randChoice(tokens);
    
    const isARC = tokenIn === deployment.contracts.ARC || tokenOut === deployment.contracts.ARC;
    const amount = isARC ? toARC(randInt(500, 50000)) : toUSDC(randInt(5, 500));
    
    console.log(`│ ⚡ RAPID SWAP`);
    
    try {
        const tx = await ultimate.swap(tokenIn, tokenOut, amount, 0, { gasLimit: 300000 });
        await tx.wait();
        console.log(`│ ✅ Swapped`);
        stats.volume += isARC ? parseFloat(ethers.formatEther(amount)) : fromUSDC(amount);
        return true;
    } catch {
        console.log(`│ ⚠️  Failed`);
        return false;
    }
}

async function explosiveNFT(ultimate: any, deployment: any): Promise<boolean> {
    const ops = ['mint', 'buy', 'list'];
    const op = randChoice(ops);
    
    if (op === 'mint') {
        const names = ["💥 EXPLOSIVE", "⚡ LIGHTNING", "🔥 INFERNO", "💀 DEATH", "🌪️ TORNADO"];
        const rarities = ["Common", "Rare", "Epic", "Legendary", "Mythic"];
        
        const name = randChoice(names) + ` #${randInt(1, 9999)}`;
        const rarity = randChoice(rarities);
        const price = toUSDC(randInt(1, 5000));
        const royalty = randInt(50, 1000);
        
        console.log(`│ 💥 EXPLOSIVE MINT`);
        console.log(`│    "${name}" [${rarity}]`);
        
        try {
            const tx = await ultimate.mintNFT(name, `ipfs://chaos${randInt(1000,9999)}`, price, royalty, rarity);
            await tx.wait();
            console.log(`│ ✅ Minted`);
            return true;
        } catch {
            console.log(`│ ⚠️  Failed`);
            return false;
        }
        
    } else if (op === 'buy') {
        const tokenId = randInt(1, 100);
        console.log(`│ 💰 BUY NFT #${tokenId}`);
        
        try {
            const tx = await ultimate.buyNFT(tokenId, deployment.contracts.USDC, { value: 0 });
            await tx.wait();
            console.log(`│ ✅ Purchased`);
            return true;
        } catch {
            console.log(`│ ⚠️  Failed`);
            return false;
        }
        
    } else {
        const tokenId = randInt(1, 100);
        const price = toUSDC(randInt(10, 10000));
        console.log(`│ 🏷️ LIST #${tokenId}`);
        
        try {
            const tx = await ultimate.listNFT(tokenId, price);
            await tx.wait();
            console.log(`│ ✅ Listed`);
            return true;
        } catch {
            console.log(`│ ⚠️  Failed`);
            return false;
        }
    }
}

async function wildLiquidity(ultimate: any, deployment: any): Promise<boolean> {
    const tokens = [deployment.contracts.USDC, deployment.contracts.EURC, deployment.contracts.ARC];
    const tokenA = randChoice(tokens);
    let tokenB = randChoice(tokens);
    while (tokenB === tokenA) tokenB = randChoice(tokens);
    
    const isAdd = Math.random() < 0.5;
    
    if (isAdd) {
        const isARC = tokenA === deployment.contracts.ARC || tokenB === deployment.contracts.ARC;
        const amountA = isARC ? toARC(randInt(1000, 100000)) : toUSDC(randInt(100, 5000));
        const amountB = isARC ? toARC(randInt(1000, 100000)) : toUSDC(randInt(100, 5000));
        
        console.log(`│ 💧 WILD ADD LIQUIDITY`);
        
        try {
            const tx = await ultimate.addLiquidity(tokenA, tokenB, amountA, amountB, { gasLimit: 500000 });
            await tx.wait();
            console.log(`│ ✅ Added`);
            return true;
        } catch {
            console.log(`│ ⚠️  Failed`);
            return false;
        }
    } else {
        const liquidity = toUSDC(randInt(10, 500));
        console.log(`│ 💧 REMOVE LIQUIDITY`);
        
        try {
            const tx = await ultimate.removeLiquidity(tokenA, tokenB, liquidity, { gasLimit: 500000 });
            await tx.wait();
            console.log(`│ ✅ Removed`);
            return true;
        } catch {
            console.log(`│ ⚠️  Failed`);
            return false;
        }
    }
}

async function crazyStake(ultimate: any, deployment: any): Promise<boolean> {
    const tokenId = randInt(1, 50);
    const lockDays = randChoice([0, 30, 60, 90, 180, 365]);
    
    console.log(`│ 🔒 CRAZY STAKE #${tokenId} (${lockDays}d)`);
    
    try {
        const tx = await ultimate.stakeNFT(tokenId, lockDays);
        await tx.wait();
        console.log(`│ ✅ Staked`);
        return true;
    } catch {
        console.log(`│ ⚠️  Failed`);
        return false;
    }
}

async function auctionMadness(ultimate: any): Promise<boolean> {
    const ops = ['create', 'bid'];
    const op = randChoice(ops);
    
    if (op === 'create') {
        const tokenId = randInt(1, 50);
        const startPrice = toUSDC(randInt(10, 5000));
        const duration = randInt(600, 86400); // 10min - 24h
        
        console.log(`│ 🎭 AUCTION MADNESS`);
        
        try {
            const tx = await ultimate.createAuction(tokenId, startPrice, duration);
            await tx.wait();
            console.log(`│ ✅ Created`);
            return true;
        } catch {
            console.log(`│ ⚠️  Failed`);
            return false;
        }
    } else {
        const auctionId = randInt(0, 20);
        const bid = toUSDC(randInt(50, 10000));
        
        console.log(`│ 💰 CRAZY BID`);
        
        try {
            const tx = await ultimate.placeBid(auctionId, { value: bid });
            await tx.wait();
            console.log(`│ ✅ Bid placed`);
            return true;
        } catch {
            console.log(`│ ⚠️  Failed`);
            return false;
        }
    }
}

async function lotteryRush(ultimate: any): Promise<boolean> {
    const ops = ['create', 'buy'];
    const op = randChoice(ops);
    
    if (op === 'create') {
        const ticketPrice = toUSDC(randInt(1, 100));
        const duration = randInt(600, 86400);
        
        console.log(`│ 🎰 LOTTERY RUSH`);
        
        try {
            const tx = await ultimate.createLottery(ticketPrice, duration);
            await tx.wait();
            console.log(`│ ✅ Created`);
            return true;
        } catch {
            console.log(`│ ⚠️  Failed`);
            return false;
        }
    } else {
        const lotteryId = randInt(0, 10);
        const price = toUSDC(randInt(1, 100));
        
        console.log(`│ 🎟️ TICKET FRENZY`);
        
        try {
            const tx = await ultimate.buyLotteryTicket(lotteryId, { value: price });
            await tx.wait();
            console.log(`│ ✅ Bought`);
            return true;
        } catch {
            console.log(`│ ⚠️  Failed`);
            return false;
        }
    }
}

async function governanceChaos(ultimate: any): Promise<boolean> {
    const isPropose = Math.random() < 0.5;
    
    if (isPropose) {
        const titles = [
            "💥 CHAOS Fee Structure",
            "⚡ EXTREME Staking Boost",
            "🔥 WILD Lottery Pools",
            "💀 INSANE NFT Royalties",
            "🌪️ TORNADO Governance"
        ];
        
        const title = randChoice(titles);
        const votingPeriod = randInt(3600, 86400);
        
        console.log(`│ 🗳️ CHAOS PROPOSAL`);
        
        try {
            const tx = await ultimate.createProposal(title, `CHAOS: ${title}`, votingPeriod);
            await tx.wait();
            console.log(`│ ✅ Proposed`);
            return true;
        } catch {
            console.log(`│ ⚠️  Failed`);
            return false;
        }
    } else {
        const proposalId = randInt(0, 10);
        const support = Math.random() < 0.5;
        
        console.log(`│ 🗳️ CHAOS VOTE: ${support ? '⚡FOR' : '💀AGAINST'}`);
        
        try {
            const tx = await ultimate.vote(proposalId, support);
            await tx.wait();
            console.log(`│ ✅ Voted`);
            return true;
        } catch {
            console.log(`│ ⚠️  Failed`);
            return false;
        }
    }
}

async function fractionalizeFrenzy(ultimate: any): Promise<boolean> {
    const tokenId = randInt(1, 50);
    const shares = randInt(1000, 100000);
    
    console.log(`│ 🔀 FRACTIONALIZE FRENZY`);
    console.log(`│    #${tokenId} → ${shares} shares`);
    
    try {
        const tx = await ultimate.fractionalizeNFT(tokenId, shares);
        await tx.wait();
        console.log(`│ ✅ Fractionalized`);
        return true;
    } catch {
        console.log(`│ ⚠️  Failed`);
        return false;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💀 CHAOS ERROR:", error);
        process.exit(1);
    });