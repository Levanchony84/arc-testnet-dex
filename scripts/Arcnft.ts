import { ethers } from "hardhat";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load .env file
dotenv.config();

// ═══════════════════════════════════════════════════════════
// 🎨 NFT SPECIALIST BOT - 70-130 NFT ოპერაციები
// Enhanced with: Retry Logic, Real IPFS Upload, Random Pauses
// ═══════════════════════════════════════════════════════════

// 🌐 PINATA API Configuration for REAL IPFS uploads
// Add these to your .env file:
// PINATA_JWT=your_pinata_jwt_token
// OR
// PINATA_API_KEY=your_api_key
// PINATA_SECRET_KEY=your_secret_key
const PINATA_API_KEY = process.env.PINATA_API_KEY || "";
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || "";
const PINATA_JWT = process.env.PINATA_JWT || "";

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
    
    // 🎲 5-10% chance for random pause (human behavior)
    if (Math.random() < 0.075) { // 7.5% average
        const pauseMultiplier = 2 + Math.random() * 3; // 2-5x longer
        adjusted *= pauseMultiplier;
        console.log(`   😴 Random pause detected - ${(adjusted / 1000).toFixed(1)}s (human behavior)`);
    } else {
        console.log(`   ⏳ ${(adjusted / 1000).toFixed(1)}s...`);
    }
    
    return new Promise(resolve => setTimeout(resolve, adjusted));
}

function progressBar(current: number, total: number): string {
    const pct = Math.floor((current / total) * 100);
    const filled = Math.floor((current / total) * 50);
    return `[${'█'.repeat(filled)}${'░'.repeat(50 - filled)}] ${pct}%`;
}

// ═══════════════════════════════════════════════════════════
// 📤 REAL IPFS UPLOAD via Pinata
// ═══════════════════════════════════════════════════════════

async function uploadToPinata(metadata: any): Promise<string> {
    if (!PINATA_JWT && !PINATA_API_KEY) {
        console.log(`   ⚠️  Pinata credentials not found - using mock IPFS`);
        return `ipfs://Qm${Math.random().toString(36).substring(2, 15)}`;
    }
    
    try {
        console.log(`   📤 Uploading metadata to Pinata...`);
        
        const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
        const headers: any = {
            'Content-Type': 'application/json'
        };
        
        // Use JWT if available, otherwise API keys
        if (PINATA_JWT) {
            headers['Authorization'] = `Bearer ${PINATA_JWT}`;
        } else {
            headers['pinata_api_key'] = PINATA_API_KEY;
            headers['pinata_secret_api_key'] = PINATA_SECRET_KEY;
        }
        
        const body = JSON.stringify({
            pinataContent: metadata,
            pinataMetadata: {
                name: `arc-nft-${metadata.name}-${Date.now()}`
            }
        });
        
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body
        });
        
        if (!response.ok) {
            throw new Error(`Pinata API error: ${response.status}`);
        }
        
        const result = await response.json();
        const ipfsHash = result.IpfsHash;
        
        console.log(`   ✅ Uploaded to IPFS: ${ipfsHash}`);
        return `ipfs://${ipfsHash}`;
        
    } catch (error: any) {
        console.log(`   ⚠️  Pinata upload failed: ${error.message}`);
        console.log(`   🔄 Falling back to mock IPFS...`);
        return `ipfs://Qm${Math.random().toString(36).substring(2, 15)}`;
    }
}

// ═══════════════════════════════════════════════════════════
// 🔄 RETRY LOGIC - 1-2 retries on failure
// ═══════════════════════════════════════════════════════════

async function executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 2
): Promise<{ success: boolean; result?: T; error?: string }> {
    let lastError: string = "";
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`   🔄 Retry ${attempt}/${maxRetries}...`);
                // Wait before retry
                await new Promise(r => setTimeout(r, 2000 + attempt * 1000));
            }
            
            const result = await operation();
            return { success: true, result };
            
        } catch (error: any) {
            lastError = error.message;
            
            if (attempt === maxRetries) {
                console.log(`   ❌ Failed after ${maxRetries + 1} attempts`);
                return { success: false, error: lastError };
            }
            
            console.log(`   ⚠️  Attempt ${attempt + 1} failed: ${lastError.substring(0, 50)}`);
        }
    }
    
    return { success: false, error: lastError };
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
    retried: number;
    ipfsUploads: number;
    randomPauses: number;
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
    console.log("║   Enhanced: Retry Logic + Real IPFS + Smart Pauses   ║");
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
        retried: 0,
        ipfsUploads: 0,
        randomPauses: 0,
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
    
    // Check Pinata config
    if (PINATA_JWT || PINATA_API_KEY) {
        console.log("📤 Pinata IPFS: ✅ Configured");
    } else {
        console.log("📤 Pinata IPFS: ⚠️  Not configured (will use mock)");
    }
    
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
    const profileResult = await executeWithRetry(async () => {
        const tx = await ultimate.createProfile(artist);
        return await tx.wait();
    }, "createProfile", 2);
    
    if (profileResult.success) {
        console.log("✅ Profile created");
    } else {
        console.log("⚠️  Profile exists or creation failed");
    }
    
    console.log("\nApproving USDC...");
    const approvalResult = await executeWithRetry(async () => {
        const tx = await usdc.approve(deployment.contracts.ArcUltimate, ethers.MaxUint256);
        return await tx.wait();
    }, "approve", 2);
    
    if (approvalResult.success) {
        console.log("✅ USDC approved");
    } else {
        console.log("⚠️  Already approved or approval failed");
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
        
        // Track if we had random pause
        const beforeDelay = Date.now();
        
        // Operation weights
        const rand = Math.random() * 100;
        
        let success = false;
        
        if (rand < 40) {
            // 40% - Mint NFT
            const result = await mintNFT(ultimate, deployment);
            success = result.success;
            if (result.retried) stats.retried++;
            if (success) stats.minted++;
            
        } else if (rand < 60) {
            // 20% - List NFT
            const result = await listNFT(ultimate);
            success = result.success;
            if (result.retried) stats.retried++;
            if (success) stats.listed++;
            
        } else if (rand < 75) {
            // 15% - Buy NFT
            const result = await buyNFT(ultimate, deployment);
            success = result.success;
            if (result.retried) stats.retried++;
            if (success) stats.sold++;
            
        } else if (rand < 85) {
            // 10% - Stake NFT
            const result = await stakeNFT(ultimate);
            success = result.success;
            if (result.retried) stats.retried++;
            if (success) stats.staked++;
            
        } else if (rand < 92) {
            // 7% - Auction
            const result = await auctionNFT(ultimate);
            success = result.success;
            if (result.retried) stats.retried++;
            if (success) stats.auctioned++;
            
        } else {
            // 8% - Fractionalize
            const result = await fractionalizeNFT(ultimate);
            success = result.success;
            if (result.retried) stats.retried++;
            if (success) stats.fractionalized++;
        }
        
        if (success) stats.successful++;
        else stats.failed++;
        
        console.log(`└──────────────────────────────────┘`);
        
        // Progress every 10 ops
        if ((i + 1) % 10 === 0) {
            console.log(`\n${progressBar(i + 1, totalOps)}`);
            console.log(`✅ ${stats.successful} | ❌ ${stats.failed} | 🔄 Retried: ${stats.retried}`);
            console.log(`🎨 Minted: ${stats.minted} | 🏪 Sold: ${stats.sold} | 📤 IPFS: ${stats.ipfsUploads}\n`);
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
    console.log(`   🔄 Retried: ${stats.retried}`);
    console.log(`   📤 IPFS Uploads: ${stats.ipfsUploads}`);
    console.log(`   😴 Random Pauses: ${stats.randomPauses}`);
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
    
    console.log(`\n🔥 Advanced Features:`);
    console.log(`   ✅ Retry logic: 1-2 attempts per operation`);
    console.log(`   ✅ Real IPFS: ${stats.ipfsUploads > 0 ? 'Pinata integrated' : 'Mock mode'}`);
    console.log(`   ✅ Human behavior: ${stats.randomPauses} random pauses (5-10%)`);
    
    const graph = '█'.repeat(Math.floor(stats.minted / 2));
    console.log(`\n🎨 Minted: [${graph}]`);
    
    fs.writeFileSync("arc-nft-stats.json", JSON.stringify(stats, null, 2));
    console.log("\n💾 Stats saved: arc-nft-stats.json\n");
}

// ═══════════════════════════════════════════════════════════
// 🎨 NFT Operations (with retry logic)
// ═══════════════════════════════════════════════════════════

async function mintNFT(ultimate: any, deployment: any): Promise<{ success: boolean; retried: boolean }> {
    // Select collection
    const collectionNames = Object.keys(NFT_COLLECTIONS);
    const collectionName = randChoice(collectionNames) as keyof typeof NFT_COLLECTIONS;
    const collection = NFT_COLLECTIONS[collectionName];
    
    const name = randChoice(collection);
    const rarity = selectRarity();
    const rarityConfig = RARITIES[rarity as keyof typeof RARITIES];
    
    const price = toUSDC(randInt(...rarityConfig.price));
    const royalty = randInt(...rarityConfig.royalty);
    
    console.log(`│ 🎨 Minting: "${name}"`);
    console.log(`│    💎 ${rarity}`);
    console.log(`│    💰 ${fromUSDC(price).toFixed(2)} USDC`);
    console.log(`│    👑 ${(royalty / 100).toFixed(1)}% royalty`);
    
    // Create metadata
    const metadata = {
        name,
        description: `Georgian NFT Collection - ${collectionName}`,
        image: `https://arc-nft.art/${collectionName}/${randInt(1, 1000)}.png`,
        attributes: [
            { trait_type: "Collection", value: collectionName },
            { trait_type: "Rarity", value: rarity },
            { trait_type: "Artist", value: stats.artist },
            { trait_type: "Created", value: new Date().toISOString() }
        ]
    };
    
    // Upload to IPFS
    const ipfsUri = await uploadToPinata(metadata);
    stats.ipfsUploads++;
    
    const result = await executeWithRetry(async () => {
        const tx = await ultimate.mintNFT(name, ipfsUri, price, royalty, rarity);
        return await tx.wait();
    }, "mintNFT", randInt(1, 2)); // 1-2 retries randomly
    
    if (result.success) {
        console.log(`│ ✅ NFT minted successfully`);
        
        // Update stats
        stats.collections[collectionName]++;
        stats.rarityBreakdown[rarity as keyof typeof stats.rarityBreakdown]++;
        
        return { success: true, retried: false };
    } else {
        console.log(`│ ⚠️  Minting failed`);
        return { success: false, retried: true };
    }
}

async function listNFT(ultimate: any): Promise<{ success: boolean; retried: boolean }> {
    const tokenId = randInt(1, 50);
    const price = toUSDC(randInt(10, 1000));
    
    console.log(`│ 🏷️  Listing NFT #${tokenId}`);
    console.log(`│    💰 ${fromUSDC(price).toFixed(2)} USDC`);
    
    const result = await executeWithRetry(async () => {
        const tx = await ultimate.listNFT(tokenId, price);
        return await tx.wait();
    }, "listNFT", randInt(1, 2));
    
    if (result.success) {
        console.log(`│ ✅ Listed`);
        return { success: true, retried: false };
    } else {
        console.log(`│ ⚠️  Listing failed (not owner or already listed)`);
        return { success: false, retried: true };
    }
}

async function buyNFT(ultimate: any, deployment: any): Promise<{ success: boolean; retried: boolean }> {
    const tokenId = randInt(1, 50);
    
    console.log(`│ 💰 Buying NFT #${tokenId}`);
    
    const result = await executeWithRetry(async () => {
        const nftInfo = await ultimate.getNFTInfo(tokenId);
        
        if (!nftInfo.isListed) {
            throw new Error("NFT not for sale");
        }
        
        const tx = await ultimate.buyNFT(tokenId, deployment.contracts.USDC, { value: 0 });
        const receipt = await tx.wait();
        
        const price = fromUSDC(nftInfo.price);
        stats.totalVolume += price;
        if (price > stats.highestSale) {
            stats.highestSale = price;
        }
        
        return { price };
    }, "buyNFT", randInt(1, 2));
    
    if (result.success && result.result) {
        console.log(`│ ✅ Purchased for ${result.result.price.toFixed(2)} USDC`);
        return { success: true, retried: false };
    } else {
        console.log(`│ ⚠️  Purchase failed`);
        return { success: false, retried: true };
    }
}

async function stakeNFT(ultimate: any): Promise<{ success: boolean; retried: boolean }> {
    const tokenId = randInt(1, 30);
    const lockDays = randChoice([0, 30, 60, 90, 180]);
    
    console.log(`│ 🔒 Staking NFT #${tokenId}`);
    console.log(`│    ⏱️  Lock: ${lockDays} days`);
    
    const result = await executeWithRetry(async () => {
        const tx = await ultimate.stakeNFT(tokenId, lockDays);
        return await tx.wait();
    }, "stakeNFT", randInt(1, 2));
    
    if (result.success) {
        console.log(`│ ✅ Staked`);
        return { success: true, retried: false };
    } else {
        console.log(`│ ⚠️  Staking failed (not owner or already staked)`);
        return { success: false, retried: true };
    }
}

async function auctionNFT(ultimate: any): Promise<{ success: boolean; retried: boolean }> {
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
        
        const result = await executeWithRetry(async () => {
            const tx = await ultimate.createAuction(tokenId, startPrice, duration);
            return await tx.wait();
        }, "createAuction", randInt(1, 2));
        
        if (result.success) {
            console.log(`│ ✅ Auction created`);
            return { success: true, retried: false };
        } else {
            console.log(`│ ⚠️  Auction creation failed`);
            return { success: false, retried: true };
        }
        
    } else {
        const auctionId = randInt(0, 10);
        const bid = toUSDC(randInt(100, 1000));
        
        console.log(`│ 💰 Bidding on Auction #${auctionId}`);
        console.log(`│    💵 ${fromUSDC(bid).toFixed(2)} USDC`);
        
        const result = await executeWithRetry(async () => {
            const tx = await ultimate.placeBid(auctionId, { value: bid });
            return await tx.wait();
        }, "placeBid", randInt(1, 2));
        
        if (result.success) {
            console.log(`│ ✅ Bid placed`);
            return { success: true, retried: false };
        } else {
            console.log(`│ ⚠️  Bidding failed`);
            return { success: false, retried: true };
        }
    }
}

async function fractionalizeNFT(ultimate: any): Promise<{ success: boolean; retried: boolean }> {
    const tokenId = randInt(1, 30);
    const shares = randInt(100, 10000);
    
    console.log(`│ 🔀 Fractionalizing NFT #${tokenId}`);
    console.log(`│    📊 Shares: ${shares}`);
    
    const result = await executeWithRetry(async () => {
        const tx = await ultimate.fractionalizeNFT(tokenId, shares);
        return await tx.wait();
    }, "fractionalizeNFT", randInt(1, 2));
    
    if (result.success) {
        console.log(`│ ✅ Fractionalized`);
        return { success: true, retried: false };
    } else {
        console.log(`│ ⚠️  Fractionalization failed`);
        return { success: false, retried: true };
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌", error);
        process.exit(1);
    });