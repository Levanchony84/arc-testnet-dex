import { ethers } from "hardhat";
import * as fs from "fs";

// ═══════════════════════════════════════════════════════════
// 🎭 ქართული კონფიგურაცია
// ═══════════════════════════════════════════════════════════

const GEORGIAN_NAMES = [
    "გიორგი", "ნინო", "დავით", "მარიამ", "ნიკა", "ანა", "ლუკა", "თამარ",
    "გიგა", "ელენე", "საბა", "სალომე", "ლაშა", "ქეთევან", "გურამ", "თეა",
    "ბექა", "ნათია", "ალექსი", "მაკა", "გია", "ლია", "ზურა", "დიანა",
    "ლევან", "ნატო", "ირაკლი", "ქეთი", "ვახტანგ", "მარინე", "ნუგო", "სოფო",
    "თორნიკე", "ნიკოლოზ", "მარიკა", "კახა", "ტატო", "გვანცა", "ბაჩო", "მაია"
];

const NFT_NAMES = [
    "თბილისის ღამე", "კავკასიონის მწვერვალი", "ქართული ვაზი", "სვანეთის კოშკი",
    "ბათუმის ზღვა", "მცხეთის ტაძარი", "კაზბეგის პიკი", "გელათის მონასტერი",
    "საქართველოს გული", "ქართული სული", "ანუშას სიმღერა", "რუსთაველის ლექსი",
    "ARC დიჯიტალური", "DeFi რევოლუცია", "ბლოკჩეინის ლეგენდა", "კრიპტო არტი"
];

const ACTIVITY_PROFILES = {
    aggressive: { minDelay: 25000, maxDelay: 65000, txCount: [70, 130] },
    normal: { minDelay: 30000, maxDelay: 75000, txCount: [70, 130] },
    strategic: { minDelay: 35000, maxDelay: 90000, txCount: [70, 130] }
};

// ═══════════════════════════════════════════════════════════
// 🧮 Utilities
// ═══════════════════════════════════════════════════════════

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

function toAmount(value: number, decimals: number = 18): bigint {
    return ethers.parseUnits(value.toFixed(decimals > 6 ? 6 : decimals), decimals);
}

function fromAmount(value: bigint, decimals: number = 18): number {
    return parseFloat(ethers.formatUnits(value, decimals));
}

async function smartDelay(profile: keyof typeof ACTIVITY_PROFILES = 'normal') {
    const config = ACTIVITY_PROFILES[profile];
    let delay = randInt(config.minDelay, config.maxDelay);
    
    // Time-based multipliers
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 18) delay *= 0.9;
    else if (hour >= 0 && hour < 6) delay *= 1.3;
    
    const seconds = (delay / 1000).toFixed(1);
    console.log(`   ⏳ ${seconds}s...`);
    
    return new Promise(resolve => setTimeout(resolve, delay));
}

function progressBar(current: number, total: number): string {
    const pct = Math.floor((current / total) * 100);
    const filled = Math.floor((current / total) * 50);
    return `[${'█'.repeat(filled)}${'░'.repeat(50 - filled)}] ${pct}%`;
}

// ═══════════════════════════════════════════════════════════
// 📊 Session Stats
// ═══════════════════════════════════════════════════════════

interface Stats {
    startTime: number;
    endTime?: number;
    operator: string;
    profile: string;
    totalTX: number;
    successful: number;
    failed: number;
    swaps: number;
    liquidity: number;
    nftMints: number;
    nftTrades: number;
    stakes: number;
    governance: number;
    auctions: number;
    lotteries: number;
    volume: number;
}

let stats: Stats;

// ═══════════════════════════════════════════════════════════
// 🎯 Main Bot
// ═══════════════════════════════════════════════════════════

async function main() {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║         🔥 ARC MASTER - Ultimate Bot 🔥               ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    // Load deployment
    let deployment: any;
    try {
        deployment = JSON.parse(fs.readFileSync("arc-ultimate.json", "utf8"));
        console.log("✅ Deployment loaded\n");
    } catch {
        console.log("❌ arc-ultimate.json not found!");
        console.log("   Run: npx hardhat run scripts/ArcDeploy.ts --network arc\n");
        process.exit(1);
    }
    
    const [deployer] = await ethers.getSigners();
    const operator = randChoice(GEORGIAN_NAMES);
    const profile = randChoice(Object.keys(ACTIVITY_PROFILES)) as keyof typeof ACTIVITY_PROFILES;
    
    const totalTX = randInt(...ACTIVITY_PROFILES[profile].txCount);
    
    stats = {
        startTime: Date.now(),
        operator,
        profile,
        totalTX,
        successful: 0,
        failed: 0,
        swaps: 0,
        liquidity: 0,
        nftMints: 0,
        nftTrades: 0,
        stakes: 0,
        governance: 0,
        auctions: 0,
        lotteries: 0,
        volume: 0
    };
    
    console.log("👤 Operator:", operator);
    console.log("📊 Profile:", profile);
    console.log("🎯 Total TX:", totalTX);
    console.log("📍 Address:", deployer.address);
    console.log("💰 ETH:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
    
    // Connect to contracts
    const ultimate = await ethers.getContractAt("ArcUltimate", deployment.contracts.ArcUltimate);
    const usdc = await ethers.getContractAt("ArcToken", deployment.contracts.USDC);
    const eurc = await ethers.getContractAt("ArcToken", deployment.contracts.EURC);
    const arc = await ethers.getContractAt("ArcToken", deployment.contracts.ARC);
    
    console.log("\n🔗 Connected to ArcUltimate:", deployment.contracts.ArcUltimate);
    
    // Check balances
    const usdcBal = await usdc.balanceOf(deployer.address);
    const eurcBal = await eurc.balanceOf(deployer.address);
    const arcBal = await arc.balanceOf(deployer.address);
    
    console.log("\n💎 Balances:");
    console.log("   USDC:", fromAmount(usdcBal, 6).toFixed(2));
    console.log("   EURC:", fromAmount(eurcBal, 6).toFixed(2));
    console.log("   ARC:", fromAmount(arcBal, 18).toFixed(2));
    
    // ═══════════════════════════════════════════════════════════
    // Setup Phase
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║                  SETUP PHASE                           ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log("Creating profile...");
    try {
        const tx = await ultimate.createProfile(operator);
        await tx.wait();
        console.log("✅ Profile created");
    } catch (e: any) {
        if (e.message.includes("exists")) {
            console.log("⚠️  Profile exists");
        }
    }
    
    console.log("\nApproving tokens...");
    try {
        let nonce = await deployer.getNonce();
        
        let tx = await usdc.approve(deployment.contracts.ArcUltimate, ethers.MaxUint256, { nonce: nonce++ });
        await tx.wait();
        console.log("✅ USDC");
        
        tx = await eurc.approve(deployment.contracts.ArcUltimate, ethers.MaxUint256, { nonce: nonce++ });
        await tx.wait();
        console.log("✅ EURC");
        
        tx = await arc.approve(deployment.contracts.ArcUltimate, ethers.MaxUint256, { nonce: nonce++ });
        await tx.wait();
        console.log("✅ ARC");
    } catch (e: any) {
        console.log("⚠️  Approvals done");
    }
    
    await smartDelay(profile);
    
    // ═══════════════════════════════════════════════════════════
    // Trading Phase
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║              TRADING & NFT PHASE                       ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log(`Starting ${totalTX} transactions...\n`);
    
    for (let i = 0; i < totalTX; i++) {
        console.log(`\n┌────────── TX ${i + 1}/${totalTX} ──────────┐`);
        console.log(`│ 👤 ${operator} | 📊 ${profile}`);
        
        // Action selection with weights
        const rand = Math.random() * 100;
        
        try {
            let success = false;
            
            if (rand < 35) {
                // 35% - Swaps
                success = await performSwap(ultimate, deployment, deployer.address);
                if (success) stats.swaps++;
                
            } else if (rand < 55) {
                // 20% - NFT Operations
                success = await nftOperation(ultimate, deployment);
                if (success) stats.nftMints++;
                
            } else if (rand < 70) {
                // 15% - Liquidity
                success = await liquidityOp(ultimate, deployment);
                if (success) stats.liquidity++;
                
            } else if (rand < 80) {
                // 10% - Staking
                success = await stakingOp(ultimate, deployment, deployer.address);
                if (success) stats.stakes++;
                
            } else if (rand < 88) {
                // 8% - Auctions
                success = await auctionOp(ultimate);
                if (success) stats.auctions++;
                
            } else if (rand < 94) {
                // 6% - Lottery
                success = await lotteryOp(ultimate);
                if (success) stats.lotteries++;
                
            } else {
                // 6% - Governance
                success = await governanceOp(ultimate);
                if (success) stats.governance++;
            }
            
            if (success) stats.successful++;
            else stats.failed++;
            
        } catch (e: any) {
            console.log(`│ ❌ Error: ${e.message.substring(0, 50)}`);
            stats.failed++;
        }
        
        console.log(`└────────────────────────────────┘`);
        
        // Progress every 10 TX
        if ((i + 1) % 10 === 0) {
            console.log(`\n${progressBar(i + 1, totalTX)}`);
            console.log(`✅ ${stats.successful} | ❌ ${stats.failed}\n`);
        }
        
        if (i < totalTX - 1) {
            await smartDelay(profile);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // Final Stats
    // ═══════════════════════════════════════════════════════════
    
    stats.endTime = Date.now();
    const duration = ((stats.endTime - stats.startTime) / 1000 / 60).toFixed(1);
    const successRate = ((stats.successful / stats.totalTX) * 100).toFixed(1);
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║                🏆 FINAL REPORT 🏆                      ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log(`👤 Operator: ${stats.operator}`);
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log(`📊 Success: ${successRate}%\n`);
    
    console.log(`Activity Breakdown:`);
    console.log(`   ✅ Successful: ${stats.successful}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   🔄 Swaps: ${stats.swaps}`);
    console.log(`   🎨 NFT Mints: ${stats.nftMints}`);
    console.log(`   🏪 NFT Trades: ${stats.nftTrades}`);
    console.log(`   💧 Liquidity: ${stats.liquidity}`);
    console.log(`   🔒 Stakes: ${stats.stakes}`);
    console.log(`   🎭 Auctions: ${stats.auctions}`);
    console.log(`   🎰 Lotteries: ${stats.lotteries}`);
    console.log(`   🗳️  Governance: ${stats.governance}`);
    
    const graph = '█'.repeat(Math.floor(stats.successful / 4));
    console.log(`\n[${graph}]`);
    
    fs.writeFileSync("arc-master-stats.json", JSON.stringify(stats, null, 2));
    console.log("\n💾 Stats saved: arc-master-stats.json\n");
}

// ═══════════════════════════════════════════════════════════
// 🎯 Operations
// ═══════════════════════════════════════════════════════════

async function performSwap(ultimate: any, deployment: any, userAddr: string): Promise<boolean> {
    const tokens = [deployment.contracts.USDC, deployment.contracts.EURC, deployment.contracts.ARC];
    const tokenIn = randChoice(tokens);
    let tokenOut = randChoice(tokens);
    while (tokenOut === tokenIn) tokenOut = randChoice(tokens);
    
    const amount = tokenIn === deployment.contracts.ARC 
        ? toAmount(randInt(100, 10000), 18)
        : toAmount(randInt(1, 100), 6);
    
    console.log(`│ 🔄 Swap: ${fromAmount(amount, tokenIn === deployment.contracts.ARC ? 18 : 6).toFixed(2)}`);
    
    try {
        const tx = await ultimate.swap(tokenIn, tokenOut, amount, 0);
        await tx.wait();
        console.log(`│ ✅ Swapped`);
        stats.volume += fromAmount(amount, tokenIn === deployment.contracts.ARC ? 18 : 6);
        return true;
    } catch {
        console.log(`│ ⚠️  Skipped`);
        return false;
    }
}

async function nftOperation(ultimate: any, deployment: any): Promise<boolean> {
    const ops = ['mint', 'list', 'buy'];
    const op = randChoice(ops);
    
    if (op === 'mint') {
        const name = randChoice(NFT_NAMES);
        const rarity = randChoice(["Common", "Rare", "Epic", "Legendary", "Mythic"]);
        const price = toAmount(randInt(5, 500), 6);
        const royalty = randInt(100, 1000);
        
        console.log(`│ 🎨 Minting NFT: "${name}" [${rarity}]`);
        
        try {
            const tx = await ultimate.mintNFT(name, `ipfs://arc${randInt(1000,9999)}`, price, royalty, rarity);
            await tx.wait();
            console.log(`│ ✅ NFT minted`);
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
        
    } else if (op === 'list') {
        const tokenId = randInt(1, 20);
        const price = toAmount(randInt(10, 1000), 6);
        
        console.log(`│ 🏷️  Listing NFT #${tokenId}`);
        
        try {
            const tx = await ultimate.listNFT(tokenId, price);
            await tx.wait();
            console.log(`│ ✅ Listed`);
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
        
    } else {
        const tokenId = randInt(1, 20);
        
        console.log(`│ 💰 Buying NFT #${tokenId}`);
        
        try {
            const tx = await ultimate.buyNFT(tokenId, deployment.contracts.USDC, { value: 0 });
            await tx.wait();
            console.log(`│ ✅ Purchased`);
            stats.nftTrades++;
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
    }
}

async function liquidityOp(ultimate: any, deployment: any): Promise<boolean> {
    const tokens = [deployment.contracts.USDC, deployment.contracts.EURC];
    const tokenA = randChoice(tokens);
    let tokenB = randChoice(tokens);
    while (tokenB === tokenA) tokenB = randChoice(tokens);
    
    const isAdd = Math.random() < 0.7;
    
    if (isAdd) {
        const amountA = toAmount(randInt(50, 500), 6);
        const amountB = toAmount(randInt(50, 500), 6);
        
        console.log(`│ 💧 Adding Liquidity`);
        
        try {
            const tx = await ultimate.addLiquidity(tokenA, tokenB, amountA, amountB);
            await tx.wait();
            console.log(`│ ✅ Added`);
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
    } else {
        const liquidity = toAmount(randInt(10, 100), 6);
        
        console.log(`│ 💧 Removing Liquidity`);
        
        try {
            const tx = await ultimate.removeLiquidity(tokenA, tokenB, liquidity);
            await tx.wait();
            console.log(`│ ✅ Removed`);
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
    }
}

async function stakingOp(ultimate: any, deployment: any, userAddr: string): Promise<boolean> {
    const tokenId = randInt(1, 10);
    const lockDays = randChoice([0, 30, 60, 90]);
    
    console.log(`│ 🔒 Staking NFT #${tokenId} (${lockDays}d)`);
    
    try {
        const tx = await ultimate.stakeNFT(tokenId, lockDays);
        await tx.wait();
        console.log(`│ ✅ Staked`);
        return true;
    } catch {
        console.log(`│ ⚠️  Skipped`);
        return false;
    }
}

async function auctionOp(ultimate: any): Promise<boolean> {
    const ops = ['create', 'bid', 'end'];
    const op = randChoice(ops);
    
    if (op === 'create') {
        const tokenId = randInt(1, 20);
        const startPrice = toAmount(randInt(10, 100), 18);
        const duration = randInt(3600, 86400);
        
        console.log(`│ 🎭 Creating Auction #${tokenId}`);
        
        try {
            const tx = await ultimate.createAuction(tokenId, startPrice, duration);
            await tx.wait();
            console.log(`│ ✅ Created`);
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
        
    } else if (op === 'bid') {
        const auctionId = randInt(0, 5);
        const bid = toAmount(randInt(20, 200), 18);
        
        console.log(`│ 💰 Bidding on Auction #${auctionId}`);
        
        try {
            const tx = await ultimate.placeBid(auctionId, { value: bid });
            await tx.wait();
            console.log(`│ ✅ Bid placed`);
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
        
    } else {
        const auctionId = randInt(0, 5);
        
        console.log(`│ 🏁 Ending Auction #${auctionId}`);
        
        try {
            const tx = await ultimate.endAuction(auctionId);
            await tx.wait();
            console.log(`│ ✅ Ended`);
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
    }
}

async function lotteryOp(ultimate: any): Promise<boolean> {
    const ops = ['create', 'buy', 'draw'];
    const op = randChoice(ops);
    
    if (op === 'create') {
        const ticketPrice = toAmount(randInt(1, 10), 18);
        const duration = randInt(3600, 86400);
        
        console.log(`│ 🎰 Creating Lottery`);
        
        try {
            const tx = await ultimate.createLottery(ticketPrice, duration);
            await tx.wait();
            console.log(`│ ✅ Created`);
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
        
    } else if (op === 'buy') {
        const lotteryId = randInt(0, 5);
        const price = toAmount(randInt(1, 10), 18);
        
        console.log(`│ 🎟️  Buying Lottery Ticket #${lotteryId}`);
        
        try {
            const tx = await ultimate.buyLotteryTicket(lotteryId, { value: price });
            await tx.wait();
            console.log(`│ ✅ Ticket purchased`);
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
        
    } else {
        const lotteryId = randInt(0, 5);
        
        console.log(`│ 🎲 Drawing Lottery #${lotteryId}`);
        
        try {
            const tx = await ultimate.drawLottery(lotteryId);
            await tx.wait();
            console.log(`│ ✅ Winner drawn`);
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
    }
}

async function governanceOp(ultimate: any): Promise<boolean> {
    const isPropose = Math.random() < 0.6;
    
    if (isPropose) {
        const titles = [
            "შემცირებული Platform Fee",
            "NFT Royalty Cap",
            "ახალი Staking Rewards",
            "Lottery Prize Pool გაზრდა",
            "VIP სტატუსის კრიტერიუმები"
        ];
        
        const title = randChoice(titles);
        const votingPeriod = randInt(86400, 604800);
        
        console.log(`│ 🗳️  Proposal: ${title}`);
        
        try {
            const tx = await ultimate.createProposal(title, `აღწერა: ${title}`, votingPeriod);
            await tx.wait();
            console.log(`│ ✅ Created`);
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
        
    } else {
        const proposalId = randInt(0, 3);
        const support = Math.random() < 0.65;
        
        console.log(`│ 🗳️  Vote #${proposalId}: ${support ? 'FOR' : 'AGAINST'}`);
        
        try {
            const tx = await ultimate.vote(proposalId, support);
            await tx.wait();
            console.log(`│ ✅ Voted`);
            return true;
        } catch {
            console.log(`│ ⚠️  Skipped`);
            return false;
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌", error);
        process.exit(1);
    });