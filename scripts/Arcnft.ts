import { ethers } from "hardhat";
import * as fs from "fs";

// ═══════════════════════════════════════════════════════════
// 🎨 NFT SPECIALIST BOT - 70-130 NFT ოპერაციები
// ═══════════════════════════════════════════════════════════

const GEORGIAN_ARTISTS = [
    "ნიკო ფიროსმანი", "ლადო გუდიაშვილი", "დავით კაკაბაძე", "ელენე ახვლედიანი",
    "კორნელი სანაძე", "უჩა ჯაფარიძე", "გიორგი ალექსი-მესხიშვილი", "სერგო ქობულაძე"
];

const NFT_COLLECTIONS = {
    tbilisi: [
        "თბილისის ძველი ქალაქი", "რუსთაველის გამზირი", "მთაწმინდის პარკი",
        "ნარიყალა ღამით", "მშრალი ხიდი", "აბანოთუბანი", "ფუნიკულიორი",
        "თავისუფლების მოედანი", "სოლოლაკის ბალკონები", "ავლაბარი პანორამა"
    ],
    nature: [
        "კავკასიონის მწვერვალები", "სვანეთის კოშკები", "ბორჯომის ხეობა",
        "ვაშლოვანის უდაბნო", "ბათუმის ბოტანიკური ბაღი", "ალაზნის ველი",
        "გურული მთები", "კაზბეგის პანორამა", "ლაგოდეხის ტყე", "ომალოს გზა"
    ],
    culture: [
        "ქართული ვაზის ნაყოფი", "საფირონის ჭიქა", "ქართული აბრეშუმი",
        "მინანქარი", "ქართული ცეკვა", "ჩოგბურთელი", "პანდური",
        "სამოსი და ჩოხა", "ქართული ხალიჩა", "კლდის მონასტერი"
    ],
    crypto: [
        "Arc DeFi ლეგენდა", "ბლოკჩეინის მომავალი", "NFT რევოლუცია",
        "კრიპტო სამყარო", "DeFi საქართველო", "დიჯიტალური ხელოვნება",
        "მეტავერსის გასაღები", "ტოკენიზებული კულტურა", "Web3 საქართველო"
    ]
};

const RARITIES = {
    Common: { chance: 50, price: [5, 50], royalty: [100, 300] },
    Rare: { chance: 30, price: [50, 200], royalty: [300, 500] },
    Epic: { chance: 15, price: [200, 500], royalty: [500, 700] },
    Legendary: { chance: 4, price: [500, 2000], royalty: [700, 900] },
    Mythic: { chance: 1, price: [2000, 10000], royalty: [900, 1000] }
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

function selectRarity(): string {
    const rand = Math.random() * 100;
    let cumulative = 0;
    
    for (const [rarity, config] of Object.entries(RARITIES)) {
        cumulative += config.chance;
        if (rand < cumulative) return rarity;
    }
    
    return "Common";
}

function toUSDC(amount: number): bigint {
    return ethers.parseUnits(amount.toFixed(6), 6);
}

function fromUSDC(amount: bigint): number {
    return parseFloat(ethers.formatUnits(amount, 6));
}

async function smartDelay() {
    const delay = randInt(30000, 80000);
    const hour = new Date().getHours();
    
    let adjusted = delay;
    if (hour >= 9 && hour < 18) adjusted *= 0.85;
    else if (hour >= 0 && hour < 6) adjusted *= 1.25;
    
    console.log(`   ⏳ ${(adjusted / 1000).toFixed(1)}s...`);
    return new Promise(resolve => setTimeout(resolve, adjusted));
}

function progressBar(current: number, total: number): string {
    const pct = Math.floor((current / total) * 100);
    const filled = Math.floor((current / total) * 50);
    return `[${'█'.repeat(filled)}${'░'.repeat(50 - filled)}] ${pct}%`;
}

// ═══════════════════════════════════════════════════════════
// 📊 Stats
// ═══════════════════════════════════════════════════════════

interface NFTStats {
    startTime: number;
    endTime?: number;
    artist: string;
    totalOps: number;
    successful: number;
    failed: number;
    minted: number;
    listed: number;
    sold: number;
    staked: number;
    auctioned: number;
    fractionalized: number;
    totalVolume: number;
    highestSale: number;
    collections: {
        tbilisi: number;
        nature: number;
        culture: number;
        crypto: number;
    };
    rarityBreakdown: {
        Common: number;
        Rare: number;
        Epic: number;
        Legendary: number;
        Mythic: number;
    };
}

let stats: NFTStats;

// ═══════════════════════════════════════════════════════════
// 🎨 Main NFT Bot
// ═══════════════════════════════════════════════════════════

async function main() {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║         🎨 ARC NFT - Marketplace Specialist 🎨        ║");
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
    const artist = randChoice(GEORGIAN_ARTISTS);
    const totalOps = randInt(70, 130);
    
    stats = {
        startTime: Date.now(),
        artist,
        totalOps,
        successful: 0,
        failed: 0,
        minted: 0,
        listed: 0,
        sold: 0,
        staked: 0,
        auctioned: 0,
        fractionalized: 0,
        totalVolume: 0,
        highestSale: 0,
        collections: {
            tbilisi: 0,
            nature: 0,
            culture: 0,
            crypto: 0
        },
        rarityBreakdown: {
            Common: 0,
            Rare: 0,
            Epic: 0,
            Legendary: 0,
            Mythic: 0
        }
    };
    
    console.log("👨‍🎨 Artist:", artist);
    console.log("🎯 Total Operations:", totalOps);
    console.log("📍 Address:", deployer.address);
    console.log("💰 ETH:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
    
    // Connect to contract
    const ultimate = await ethers.getContractAt("ArcUltimate", deployment.contracts.ArcUltimate);
    const usdc = await ethers.getContractAt("ArcToken", deployment.contracts.USDC);
    
    console.log("\n🔗 Connected to ArcUltimate:", deployment.contracts.ArcUltimate);
    
    // Check balance
    const usdcBal = await usdc.balanceOf(deployer.address);
    console.log("💵 USDC Balance:", fromUSDC(usdcBal).toFixed(2));
    
    // ═══════════════════════════════════════════════════════════
    // Setup
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║                    SETUP PHASE                         ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log("Creating artist profile...");
    try {
        const tx = await ultimate.createProfile(artist);
        await tx.wait();
        console.log("✅ Profile created");
    } catch {
        console.log("⚠️  Profile exists");
    }
    
    console.log("\nApproving USDC...");
    try {
        const tx = await usdc.approve(deployment.contracts.ArcUltimate, ethers.MaxUint256);
        await tx.wait();
        console.log("✅ USDC approved");
    } catch {
        console.log("⚠️  Already approved");
    }
    
    await smartDelay();
    
    // ═══════════════════════════════════════════════════════════
    // NFT Operations Phase
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║              NFT MARKETPLACE OPERATIONS                ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log(`Starting ${totalOps} NFT operations...\n`);
    
    for (let i = 0; i < totalOps; i++) {
        console.log(`\n┌────────── NFT Op ${i + 1}/${totalOps} ──────────┐`);
        console.log(`│ 👨‍🎨 ${artist}`);
        
        // Operation weights
        const rand = Math.random() * 100;
        
        try {
            let success = false;
            
            if (rand < 40) {
                // 40% - Mint NFT
                success = await mintNFT(ultimate, deployment);
                if (success) stats.minted++;
                
            } else if (rand < 60) {
                // 20% - List NFT
                success = await listNFT(ultimate);
                if (success) stats.listed++;
                
            } else if (rand < 75) {
                // 15% - Buy NFT
                success = await buyNFT(ultimate, deployment);
                if (success) stats.sold++;
                
            } else if (rand < 85) {
                // 10% - Stake NFT
                success = await stakeNFT(ultimate);
                if (success) stats.staked++;
                
            } else if (rand < 92) {
                // 7% - Auction
                success = await auctionNFT(ultimate);
                if (success) stats.auctioned++;
                
            } else {
                // 8% - Fractionalize
                success = await fractionalizeNFT(ultimate);
                if (success) stats.fractionalized++;
            }
            
            if (success) stats.successful++;
            else stats.failed++;
            
        } catch (e: any) {
            console.log(`│ ❌ Error: ${e.message.substring(0, 50)}`);
            stats.failed++;
        }
        
        console.log(`└──────────────────────────────────┘`);
        
        // Progress every 10 ops
        if ((i + 1) % 10 === 0) {
            console.log(`\n${progressBar(i + 1, totalOps)}`);
            console.log(`✅ ${stats.successful} | ❌ ${stats.failed}`);
            console.log(`🎨 Minted: ${stats.minted} | 🏪 Sold: ${stats.sold}\n`);
        }
        
        if (i < totalOps - 1) {
            await smartDelay();
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // Final Stats
    // ═══════════════════════════════════════════════════════════
    
    stats.endTime = Date.now();
    const duration = ((stats.endTime - stats.startTime) / 1000 / 60).toFixed(1);
    const successRate = ((stats.successful / stats.totalOps) * 100).toFixed(1);
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║              🏆 NFT GALLERY REPORT 🏆                  ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log(`👨‍🎨 Artist: ${stats.artist}`);
    console.log(`⏱️  Duration: ${duration} minutes`);
    console.log(`📊 Success: ${successRate}%\n`);
    
    console.log(`NFT Operations:`);
    console.log(`   ✅ Successful: ${stats.successful}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   🎨 Minted: ${stats.minted}`);
    console.log(`   🏷️  Listed: ${stats.listed}`);
    console.log(`   💰 Sold: ${stats.sold}`);
    console.log(`   🔒 Staked: ${stats.staked}`);
    console.log(`   🎭 Auctioned: ${stats.auctioned}`);
    console.log(`   🔀 Fractionalized: ${stats.fractionalized}`);
    
    console.log(`\n🎨 Collections:`);
    console.log(`   თბილისი: ${stats.collections.tbilisi}`);
    console.log(`   ბუნება: ${stats.collections.nature}`);
    console.log(`   კულტურა: ${stats.collections.culture}`);
    console.log(`   კრიპტო: ${stats.collections.crypto}`);
    
    console.log(`\n💎 Rarity Breakdown:`);
    console.log(`   Common: ${stats.rarityBreakdown.Common}`);
    console.log(`   Rare: ${stats.rarityBreakdown.Rare}`);
    console.log(`   Epic: ${stats.rarityBreakdown.Epic}`);
    console.log(`   Legendary: ${stats.rarityBreakdown.Legendary}`);
    console.log(`   Mythic: ${stats.rarityBreakdown.Mythic}`);
    
    console.log(`\n💰 Sales:`);
    console.log(`   Total Volume: ${stats.totalVolume.toFixed(2)} USDC`);
    console.log(`   Highest Sale: ${stats.highestSale.toFixed(2)} USDC`);
    
    const graph = '█'.repeat(Math.floor(stats.minted / 2));
    console.log(`\n🎨 Minted: [${graph}]`);
    
    fs.writeFileSync("arc-nft-stats.json", JSON.stringify(stats, null, 2));
    console.log("\n💾 Stats saved: arc-nft-stats.json\n");
}

// ═══════════════════════════════════════════════════════════
// 🎨 NFT Operations
// ═══════════════════════════════════════════════════════════

async function mintNFT(ultimate: any, deployment: any): Promise<boolean> {
    // Select collection
    const collectionNames = Object.keys(NFT_COLLECTIONS);
    const collectionName = randChoice(collectionNames) as keyof typeof NFT_COLLECTIONS;
    const collection = NFT_COLLECTIONS[collectionName];
    
    const name = randChoice(collection);
    const rarity = selectRarity();
    const rarityConfig = RARITIES[rarity as keyof typeof RARITIES];
    
    const price = toUSDC(randInt(...rarityConfig.price));
    const royalty = randInt(...rarityConfig.royalty);
    const metadata = `ipfs://arc-${collectionName}-${randInt(10000, 99999)}`;
    
    console.log(`│ 🎨 Minting: "${name}"`);
    console.log(`│    💎 ${rarity}`);
    console.log(`│    💰 ${fromUSDC(price).toFixed(2)} USDC`);
    console.log(`│    👑 ${(royalty / 100).toFixed(1)}% royalty`);
    
    try {
        const tx = await ultimate.mintNFT(name, metadata, price, royalty, rarity);
        await tx.wait();
        
        console.log(`│ ✅ NFT minted successfully`);
        
        // Update stats
        stats.collections[collectionName]++;
        stats.rarityBreakdown[rarity as keyof typeof stats.rarityBreakdown]++;
        
        return true;
    } catch {
        console.log(`│ ⚠️  Minting failed`);
        return false;
    }
}

async function listNFT(ultimate: any): Promise<boolean> {
    const tokenId = randInt(1, 50);
    const price = toUSDC(randInt(10, 1000));
    
    console.log(`│ 🏷️  Listing NFT #${tokenId}`);
    console.log(`│    💰 ${fromUSDC(price).toFixed(2)} USDC`);
    
    try {
        const tx = await ultimate.listNFT(tokenId, price);
        await tx.wait();
        console.log(`│ ✅ Listed`);
        return true;
    } catch {
        console.log(`│ ⚠️  Listing failed (not owner or already listed)`);
        return false;
    }
}

async function buyNFT(ultimate: any, deployment: any): Promise<boolean> {
    const tokenId = randInt(1, 50);
    
    console.log(`│ 💰 Buying NFT #${tokenId}`);
    
    try {
        // Try to get NFT info first
        const nftInfo = await ultimate.getNFTInfo(tokenId);
        
        if (!nftInfo.isListed) {
            console.log(`│ ⚠️  NFT not for sale`);
            return false;
        }
        
        const tx = await ultimate.buyNFT(tokenId, deployment.contracts.USDC, { value: 0 });
        await tx.wait();
        
        const price = fromUSDC(nftInfo.price);
        console.log(`│ ✅ Purchased for ${price.toFixed(2)} USDC`);
        
        stats.totalVolume += price;
        if (price > stats.highestSale) {
            stats.highestSale = price;
        }
        
        return true;
    } catch {
        console.log(`│ ⚠️  Purchase failed`);
        return false;
    }
}

async function stakeNFT(ultimate: any): Promise<boolean> {
    const tokenId = randInt(1, 30);
    const lockDays = randChoice([0, 30, 60, 90, 180]);
    
    console.log(`│ 🔒 Staking NFT #${tokenId}`);
    console.log(`│    ⏱️  Lock: ${lockDays} days`);
    
    try {
        const tx = await ultimate.stakeNFT(tokenId, lockDays);
        await tx.wait();
        console.log(`│ ✅ Staked`);
        return true;
    } catch {
        console.log(`│ ⚠️  Staking failed (not owner or already staked)`);
        return false;
    }
}

async function auctionNFT(ultimate: any): Promise<boolean> {
    const ops = ['create', 'bid'];
    const op = randChoice(ops);
    
    if (op === 'create') {
        const tokenId = randInt(1, 30);
        const startPrice = toUSDC(randInt(50, 500));
        const duration = randInt(3600, 86400);
        
        console.log(`│ 🎭 Creating Auction`);
        console.log(`│    NFT: #${tokenId}`);
        console.log(`│    💰 Start: ${fromUSDC(startPrice).toFixed(2)} USDC`);
        console.log(`│    ⏱️  Duration: ${(duration / 3600).toFixed(1)}h`);
        
        try {
            const tx = await ultimate.createAuction(tokenId, startPrice, duration);
            await tx.wait();
            console.log(`│ ✅ Auction created`);
            return true;
        } catch {
            console.log(`│ ⚠️  Auction creation failed`);
            return false;
        }
        
    } else {
        const auctionId = randInt(0, 10);
        const bid = toUSDC(randInt(100, 1000));
        
        console.log(`│ 💰 Bidding on Auction #${auctionId}`);
        console.log(`│    💵 ${fromUSDC(bid).toFixed(2)} USDC`);
        
        try {
            const tx = await ultimate.placeBid(auctionId, { value: bid });
            await tx.wait();
            console.log(`│ ✅ Bid placed`);
            return true;
        } catch {
            console.log(`│ ⚠️  Bidding failed`);
            return false;
        }
    }
}

async function fractionalizeNFT(ultimate: any): Promise<boolean> {
    const tokenId = randInt(1, 30);
    const shares = randInt(100, 10000);
    
    console.log(`│ 🔀 Fractionalizing NFT #${tokenId}`);
    console.log(`│    📊 Shares: ${shares}`);
    
    try {
        const tx = await ultimate.fractionalizeNFT(tokenId, shares);
        await tx.wait();
        console.log(`│ ✅ Fractionalized`);
        return true;
    } catch {
        console.log(`│ ⚠️  Fractionalization failed`);
        return false;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌", error);
        process.exit(1);
    });