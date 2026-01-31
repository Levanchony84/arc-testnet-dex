import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("🚀 HPDeveloper 3-Part Deployment");
    console.log("═══════════════════════════════════════════════════════════\n");

    const [deployer] = await ethers.getSigners();
    console.log("📍 Deployer:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Deploy Part 1
    console.log("⏳ Deploying HPPart1 (Swaps + Liquidity)...");
    const Part1 = await ethers.getContractFactory("HPPart1");
    const part1 = await Part1.deploy();
    await part1.waitForDeployment();
    const part1Address = await part1.getAddress();
    console.log("✅ HPPart1:", part1Address);

    // Get token addresses
    const TCL = await part1.TCL();
    const Samsung = await part1.Samsung();
    const LG = await part1.LG();
    const USDC = await part1.USDC();
    const EURC = await part1.EURC();

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Deploy Part 2
    console.log("\n⏳ Deploying HPPart2 (Staking + Lending + Governance)...");
    const Part2 = await ethers.getContractFactory("HPPart2");
    const part2 = await Part2.deploy(part1Address);
    await part2.waitForDeployment();
    const part2Address = await part2.getAddress();
    console.log("✅ HPPart2:", part2Address);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Deploy Part 3
    console.log("\n⏳ Deploying HPPart3 (Advanced Features)...");
    const Part3 = await ethers.getContractFactory("HPPart3");
    const part3 = await Part3.deploy();
    await part3.waitForDeployment();
    const part3Address = await part3.getAddress();
    console.log("✅ HPPart3:", part3Address);

    // Get NFT address
    const NFT = await part3.nftContract();

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("📝 CONTRACT ADDRESSES");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("HPPART1=" + part1Address);
    console.log("HPPART2=" + part2Address);
    console.log("HPPART3=" + part3Address);
    console.log("TCL=" + TCL);
    console.log("SAMSUNG=" + Samsung);
    console.log("LG=" + LG);
    console.log("NFT=" + NFT);
    console.log("USDC=" + USDC);
    console.log("EURC=" + EURC);
    console.log("═══════════════════════════════════════════════════════════\n");

    // Mint tokens
    console.log("🪙 Minting tokens to deployer...\n");
    await part1.mintTokens(TCL, deployer.address, ethers.parseEther("100000"));
    console.log("✅ TCL minted");
    await new Promise(resolve => setTimeout(resolve, 2000));

    await part1.mintTokens(Samsung, deployer.address, ethers.parseEther("100000"));
    console.log("✅ Samsung minted");
    await new Promise(resolve => setTimeout(resolve, 2000));

    await part1.mintTokens(LG, deployer.address, ethers.parseEther("100000"));
    console.log("✅ LG minted\n");

    // Approve tokens
    console.log("🔓 Approving tokens...");
    const tclToken = await ethers.getContractAt("Token", TCL);
    const samsungToken = await ethers.getContractAt("Token", Samsung);
    const lgToken = await ethers.getContractAt("Token", LG);

    await tclToken.approve(part1Address, ethers.parseEther("100000"));
    await tclToken.approve(part2Address, ethers.parseEther("100000"));
    await new Promise(resolve => setTimeout(resolve, 2000));

    await samsungToken.approve(part1Address, ethers.parseEther("100000"));
    await samsungToken.approve(part2Address, ethers.parseEther("100000"));
    await new Promise(resolve => setTimeout(resolve, 2000));

    await lgToken.approve(part1Address, ethers.parseEther("100000"));
    await lgToken.approve(part2Address, ethers.parseEther("100000"));
    console.log("✅ Approvals done\n");

    // Add liquidity
    console.log("💧 Creating liquidity pools...");
    const initialLiquidity = ethers.parseEther("10000");

    await part1.addLiquidity(TCL, Samsung, initialLiquidity, initialLiquidity);
    console.log("✅ TCL/Samsung pool");
    await new Promise(resolve => setTimeout(resolve, 2000));

    await part1.addLiquidity(TCL, LG, initialLiquidity, initialLiquidity);
    console.log("✅ TCL/LG pool");
    await new Promise(resolve => setTimeout(resolve, 2000));

    await part1.addLiquidity(Samsung, LG, initialLiquidity, initialLiquidity);
    console.log("✅ Samsung/LG pool\n");

    console.log("═══════════════════════════════════════════════════════════");
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("Part 1 (Swaps/Liquidity):", part1Address);
    console.log("Part 2 (Staking/Lending):", part2Address);
    console.log("Part 3 (Advanced):", part3Address);
    console.log("═══════════════════════════════════════════════════════════\n");

    const addresses = {
        HPPart1: part1Address,
        HPPart2: part2Address,
        HPPart3: part3Address,
        TCL: TCL,
        Samsung: Samsung,
        LG: LG,
        NFT: NFT,
        USDC: USDC,
        EURC: EURC,
        deployedAt: new Date().toISOString(),
        network: "Arc Testnet"
    };

    fs.writeFileSync('deployed-addresses.json', JSON.stringify(addresses, null, 2));
    console.log("💾 Addresses saved: deployed-addresses.json\n");
    console.log("🔥 Next: npx hardhat run interact.js --network arc\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });