import { ethers } from "hardhat";
import * as fs from "fs";

// ═══════════════════════════════════════════════════════════
// 🔥 ARC COMPLETE - ყველაფერი ერთ სკრიპტში! 🔥
// Deploy → Mint 50 NFTs → Add Liquidity → Trade 70-130 TX
// ═══════════════════════════════════════════════════════════

const NAMES = [
    "გიორგი", "ნინო", "დავით", "მარიამ", "ნიკა", "ანა", "ლუკა", "თამარ",
    "გიგა", "ელენე", "საბა", "სალომე", "ლაშა", "ქეთევან", "გურამ", "თეა"
];

const NFT_NAMES = [
    "თბილისის ღამე", "კავკასიონი", "ქართული ვაზი", "სვანეთის კოშკი",
    "ბათუმის ზღვა", "მცხეთა", "კაზბეგი", "გელათი",
    "Arc DeFi", "NFT ლეგენდა", "კრიპტო არტი", "ბლოკჩეინი"
];

const RARITIES = ["Common", "Rare", "Epic", "Legendary", "Mythic"];

function rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choice<T>(arr: T[]): T {
    return arr[rand(0, arr.length - 1)];
}

function toUSDC(n: number): bigint {
    return ethers.parseUnits(n.toFixed(6), 6);
}

async function delay(ms: number) {
    console.log(`   ⏳ ${(ms / 1000).toFixed(1)}s...`);
    return new Promise(r => setTimeout(r, ms));
}

interface Stats {
    totalTX: number;
    success: number;
    failed: number;
    swaps: number;
    nftTrades: number;
    liquidity: number;
}

let stats: Stats = {
    totalTX: 0,
    success: 0,
    failed: 0,
    swaps: 0,
    nftTrades: 0,
    liquidity: 0
};

async function main() {
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║      🔥 ARC COMPLETE - სრული სისტემა! 🔥                 ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("📍 Address:", deployer.address);
    console.log("💰 ETH:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 1: DEPLOY
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║                   PHASE 1: DEPLOY                         ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");
    
    console.log("🏗️  Deploying ArcUltimate...");
    const ArcUltimate = await ethers.getContractFactory("ArcUltimate");
    const arc = await ArcUltimate.deploy();
    await arc.waitForDeployment();
    const arcAddr = await arc.getAddress();
    console.log("✅", arcAddr);
    
    console.log("\n🪙 Deploying Tokens...");
    const Token = await ethers.getContractFactory("ArcToken");
    
    const usdc = await Token.deploy("USDC", "USDC", ethers.parseUnits("10000000", 6));
    await usdc.waitForDeployment();
    const usdcAddr = await usdc.getAddress();
    console.log("✅ USDC:", usdcAddr);
    
    const eurc = await Token.deploy("EURC", "EURC", ethers.parseUnits("10000000", 6));
    await eurc.waitForDeployment();
    const eurcAddr = await eurc.getAddress();
    console.log("✅ EURC:", eurcAddr);
    
    console.log("\n👤 Creating profile...");
    let tx = await arc.createProfile(choice(NAMES));
    await tx.wait();
    console.log("✅ Profile created");
    
    console.log("\n🔐 Approving...");
    tx = await usdc.approve(arcAddr, ethers.MaxUint256);
    await tx.wait();
    tx = await eurc.approve(arcAddr, ethers.MaxUint256);
    await tx.wait();
    console.log("✅ Approved");
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 2: MINT 50 NFTs
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║              PHASE 2: MINT 50 NFTs                        ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");
    
    const mintedNFTs: number[] = [];
    
    for (let i = 0; i < 50; i++) {
        const name = choice(NFT_NAMES) + ` #${i + 1}`;
        const rarity = choice(RARITIES);
        const price = toUSDC(rand(10, 500));
        
        try {
            tx = await arc.mintNFT(name, `ipfs://arc${i}`, price, rarity);
            const receipt = await tx.wait();
            mintedNFTs.push(i + 1);
            
            if ((i + 1) % 10 === 0) {
                console.log(`   ✅ Minted ${i + 1}/50`);
            }
        } catch (e: any) {
            console.log(`   ⚠️  Mint ${i + 1} failed`);
        }
    }
    
    console.log(`\n✅ Total minted: ${mintedNFTs.length} NFTs`);
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 3: ADD MASSIVE LIQUIDITY
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║           PHASE 3: ADD MASSIVE LIQUIDITY                  ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");
    
    console.log("🏊 Creating pool...");
    tx = await arc.createPool(usdcAddr, eurcAddr);
    await tx.wait();
    console.log("✅ Pool created");
    
    console.log("\n💧 Adding 1,000,000 USDC + 1,000,000 EURC...");
    const liq = toUSDC(1000000);
    tx = await arc.addLiquidity(usdcAddr, eurcAddr, liq, liq);
    await tx.wait();
    console.log("✅ Liquidity added!");
    
    // ═══════════════════════════════════════════════════════════
    // PHASE 4: TRADE 70-130 TX
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║              PHASE 4: TRADE 70-130 TX                     ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");
    
    const totalTX = rand(70, 130);
    stats.totalTX = totalTX;
    console.log(`🎯 Starting ${totalTX} transactions...\n`);
    
    for (let i = 0; i < totalTX; i++) {
        console.log(`\n┌──── TX ${i + 1}/${totalTX} ────┐`);
        
        const op = rand(1, 100);
        let success = false;
        
        try {
            if (op <= 50) {
                // 50% - Swap
                const amount = toUSDC(rand(1, 100));
                console.log(`│ 🔄 Swap ${ethers.formatUnits(amount, 6)} USDC`);
                
                tx = await arc.swap(usdcAddr, eurcAddr, amount, 0);
                await tx.wait();
                console.log(`│ ✅ Swapped`);
                stats.swaps++;
                success = true;
                
            } else if (op <= 75) {
                // 25% - List NFT
                if (mintedNFTs.length > 0) {
                    const nftId = choice(mintedNFTs);
                    const price = toUSDC(rand(50, 500));
                    console.log(`│ 🏷️  List NFT #${nftId}`);
                    
                    tx = await arc.listNFT(nftId, price);
                    await tx.wait();
                    console.log(`│ ✅ Listed`);
                    success = true;
                } else {
                    console.log(`│ ⚠️  No NFTs to list`);
                }
                
            } else if (op <= 90) {
                // 15% - Buy NFT
                const nftId = rand(1, 50);
                console.log(`│ 💰 Buy NFT #${nftId}`);
                
                try {
                    tx = await arc.buyNFT(nftId, usdcAddr);
                    await tx.wait();
                    console.log(`│ ✅ Bought`);
                    stats.nftTrades++;
                    success = true;
                } catch {
                    console.log(`│ ⚠️  Not for sale`);
                }
                
            } else {
                // 10% - Add liquidity
                const amt = toUSDC(rand(100, 1000));
                console.log(`│ 💧 Add Liquidity`);
                
                tx = await arc.addLiquidity(usdcAddr, eurcAddr, amt, amt);
                await tx.wait();
                console.log(`│ ✅ Added`);
                stats.liquidity++;
                success = true;
            }
            
            if (success) stats.success++;
            else stats.failed++;
            
        } catch (e: any) {
            console.log(`│ ❌ ${e.message.substring(0, 40)}`);
            stats.failed++;
        }
        
        console.log(`└──────────────┘`);
        
        if ((i + 1) % 10 === 0) {
            const pct = Math.floor(((i + 1) / totalTX) * 100);
            const bar = '█'.repeat(Math.floor(pct / 2)) + '░'.repeat(50 - Math.floor(pct / 2));
            console.log(`\n[${bar}] ${pct}%`);
            console.log(`✅ ${stats.success} | ❌ ${stats.failed}\n`);
        }
        
        if (i < totalTX - 1) {
            await delay(rand(30000, 80000));
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // FINAL REPORT
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║                  🏆 FINAL REPORT 🏆                       ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");
    
    console.log(`📊 Total TX: ${stats.totalTX}`);
    console.log(`✅ Success: ${stats.success}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`🔄 Swaps: ${stats.swaps}`);
    console.log(`🎨 NFT Trades: ${stats.nftTrades}`);
    console.log(`💧 Liquidity: ${stats.liquidity}`);
    
    const successRate = ((stats.success / stats.totalTX) * 100).toFixed(1);
    console.log(`\n📈 Success Rate: ${successRate}%`);
    
    const graph = '█'.repeat(Math.floor(stats.success / 3));
    console.log(`\n[${graph}]`);
    
    fs.writeFileSync("arc-complete-stats.json", JSON.stringify(stats, null, 2));
    console.log("\n💾 Stats saved: arc-complete-stats.json\n");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error("❌", error);
        process.exit(1);
    });