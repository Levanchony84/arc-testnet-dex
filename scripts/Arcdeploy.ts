import { ethers } from "hardhat";
import * as fs from "fs";

// ═══════════════════════════════════════════════════════════
// 🚀 ARC ULTIMATE - DEPLOYMENT SCRIPT
// ═══════════════════════════════════════════════════════════

async function main() {
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║        🔥 ARC ULTIMATE - დეპლოიმენტი 🔥               ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    const network = await ethers.provider.getNetwork();
    
    console.log("📍 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
    console.log("🌐 Network:", network.name, `(Chain ID: ${network.chainId})\n`);
    
    // ═══════════════════════════════════════════════════════════
    // 1. Deploy Test Tokens
    // ═══════════════════════════════════════════════════════════
    
    console.log("🪙 Deploying Test Tokens...\n");
    
    const Token = await ethers.getContractFactory("ArcToken");
    
    console.log("   Minting USDC...");
    const usdc = await Token.deploy("Arc USDC", "USDC", ethers.parseUnits("100000000", 6)); // 100M USDC
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("   ✅ USDC:", usdcAddress);
    
    console.log("   Minting EURC...");
    const eurc = await Token.deploy("Arc EURC", "EURC", ethers.parseUnits("100000000", 6)); // 100M EURC
    await eurc.waitForDeployment();
    const eurcAddress = await eurc.getAddress();
    console.log("   ✅ EURC:", eurcAddress);
    
    console.log("   Minting ARC Token...");
    const arc = await Token.deploy("Arc Token", "ARC", ethers.parseEther("1000000000")); // 1B ARC
    await arc.waitForDeployment();
    const arcAddress = await arc.getAddress();
    console.log("   ✅ ARC:", arcAddress);
    
    // ═══════════════════════════════════════════════════════════
    // 2. Deploy ArcUltimate Main Contract
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n🏗️  Deploying ArcUltimate Contract...");
    const ArcUltimate = await ethers.getContractFactory("ArcUltimate");
    const ultimate = await ArcUltimate.deploy();
    await ultimate.waitForDeployment();
    const ultimateAddress = await ultimate.getAddress();
    console.log("✅ ArcUltimate:", ultimateAddress);
    
    // ═══════════════════════════════════════════════════════════
    // 3. Initial Setup
    // ═══════════════════════════════════════════════════════════
    
    console.log("\n⚙️  Initial Setup...\n");
    
    // Transfer tokens to deployer for testing
    console.log("   Distributing tokens to deployer...");
    
    const usdcAmount = ethers.parseUnits("10000000", 6); // 10M
    const eurcAmount = ethers.parseUnits("10000000", 6); // 10M
    const arcAmount = ethers.parseEther("100000000"); // 100M
    
    console.log("   ✅ Tokens ready for distribution");
    
    // Approve ArcUltimate to spend tokens
    console.log("\n   Approving ArcUltimate...");
    
    let tx = await usdc.approve(ultimateAddress, ethers.MaxUint256);
    await tx.wait();
    console.log("   ✅ USDC approved");
    
    tx = await eurc.approve(ultimateAddress, ethers.MaxUint256);
    await tx.wait();
    console.log("   ✅ EURC approved");
    
    tx = await arc.approve(ultimateAddress, ethers.MaxUint256);
    await tx.wait();
    console.log("   ✅ ARC approved");
    
    // Create initial pools
    console.log("\n   Creating liquidity pools...");
    
    tx = await ultimate.createPool(usdcAddress, eurcAddress);
    await tx.wait();
    console.log("   ✅ USDC/EURC pool");
    
    tx = await ultimate.createPool(usdcAddress, arcAddress);
    await tx.wait();
    console.log("   ✅ USDC/ARC pool");
    
    tx = await ultimate.createPool(eurcAddress, arcAddress);
    await tx.wait();
    console.log("   ✅ EURC/ARC pool");
    
    // Add initial liquidity
    console.log("\n   Adding initial liquidity...");
    
    const liqAmount = ethers.parseUnits("100000", 6); // 100k each
    
    tx = await ultimate.addLiquidity(
        usdcAddress,
        eurcAddress,
        liqAmount,
        liqAmount
    );
    await tx.wait();
    console.log("   ✅ USDC/EURC liquidity: 100k each");
    
    const arcLiqAmount = ethers.parseEther("1000000"); // 1M ARC
    
    tx = await ultimate.addLiquidity(
        usdcAddress,
        arcAddress,
        liqAmount,
        arcLiqAmount
    );
    await tx.wait();
    console.log("   ✅ USDC/ARC liquidity: 100k USDC + 1M ARC");
    
    // ═══════════════════════════════════════════════════════════
    // 4. Save Deployment Data
    // ═══════════════════════════════════════════════════════════
    
    const deployment = {
        network: {
            name: network.name,
            chainId: network.chainId.toString()
        },
        deployer: deployer.address,
        contracts: {
            ArcUltimate: ultimateAddress,
            USDC: usdcAddress,
            EURC: eurcAddress,
            ARC: arcAddress
        },
        tokens: {
            usdc: {
                address: usdcAddress,
                symbol: "USDC",
                decimals: 6,
                supply: "100000000"
            },
            eurc: {
                address: eurcAddress,
                symbol: "EURC",
                decimals: 6,
                supply: "100000000"
            },
            arc: {
                address: arcAddress,
                symbol: "ARC",
                decimals: 18,
                supply: "1000000000"
            }
        },
        pools: [
            { tokenA: "USDC", tokenB: "EURC", liquidity: "100000" },
            { tokenA: "USDC", tokenB: "ARC", liquidity: "100000 USDC + 1M ARC" },
            { tokenA: "EURC", tokenB: "ARC", liquidity: "Ready for addition" }
        ],
        deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync("arc-ultimate.json", JSON.stringify(deployment, null, 2));
    
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║              ✅ DEPLOYMENT COMPLETED!                  ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    console.log("📄 Deployment saved to: arc-ultimate.json\n");
    
    console.log("📊 Summary:");
    console.log(`   🏛️  ArcUltimate: ${ultimateAddress}`);
    console.log(`   💵 USDC: ${usdcAddress}`);
    console.log(`   💶 EURC: ${eurcAddress}`);
    console.log(`   🔷 ARC: ${arcAddress}`);
    
    console.log("\n🚀 Next Steps:");
    console.log("   1. Run ArcMaster.ts for 150-200 interactions");
    console.log("   2. Run ArcNFT.ts for NFT marketplace activity");
    console.log("   3. Run ArcChaos.ts for extreme chaos mode\n");
    
    console.log("Commands:");
    console.log("   npx hardhat run scripts/ArcMaster.ts --network arc");
    console.log("   npx hardhat run scripts/ArcNFT.ts --network arc");
    console.log("   npx hardhat run scripts/ArcChaos.ts --network arc\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });