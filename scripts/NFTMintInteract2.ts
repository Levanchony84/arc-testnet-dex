import { ethers } from "hardhat";

interface NFTInteraction {
  name: string;
  argsGenerator: (
    nft: any,
    signer: any,
    usdc: any,
    amount: bigint,
    tokenId: number
  ) => Promise<any[]>;
}

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Deploying from:", signer.address);

  const usdcAddress = "0x3600000000000000000000000000000000000000";
  const usdc = await ethers.getContractAt("IERC20", usdcAddress);

  const nftNames = ["TCL", "Samsung", "LG", "Sony"];
  const nfts: any[] = [];
  const mintedPerNft = 10;

  // Deploy + Approve + Mint
  for (const name of nftNames) {
    const NFT = await ethers.getContractFactory("Pika");
    const nft = await NFT.deploy(name, `${name.slice(0, 3).toUpperCase()}NFT`, usdcAddress);
    await nft.waitForDeployment();
    const nftAddr = await nft.getAddress();
    console.log(`${name} NFT deployed to: ${nftAddr}`);

    try {
      await (await usdc.approve(nftAddr, ethers.MaxUint256)).wait();
      console.log(`USDC approved for ${name} NFT`);
    } catch (e: any) {
      console.log(`USDC approve failed for ${name}: ${e.shortMessage || e.message}`);
    }

    try {
      await (await nft.mint(mintedPerNft)).wait();
      console.log(`Minted ${mintedPerNft} on ${name}`);
    } catch (e: any) {
      console.log(`Mint failed for ${name}: ${e.shortMessage || e.message}`);
    }

    nfts.push(nft);
  }

  // Interactions (მხოლოდ არსებული ფუნქციები Pika.sol-დან)
  const interactions: NFTInteraction[] = [
    { name: "mint", argsGenerator: async (_, __, ___, amt) => [amt] },
    { name: "burn", argsGenerator: async (_, __, ___, ____, tokenId) => [tokenId] },
    {
      name: "transferFrom",
      argsGenerator: async (_, signer, ___, ____, tokenId) => [signer.address, ethers.Wallet.createRandom().address, tokenId],
    },
    {
      name: "approve",
      argsGenerator: async (_, __, ___, ____, tokenId) => [ethers.Wallet.createRandom().address, tokenId],
    },
    { name: "stake", argsGenerator: async (_, __, ___, ____, tokenId) => [tokenId] },
    { name: "unstake", argsGenerator: async (_, __, ___, ____, tokenId) => [tokenId] },
    {
      name: "setApprovalForAll",
      argsGenerator: async () => [ethers.Wallet.createRandom().address, true],
    },
    { name: "claimRewardsForToken", argsGenerator: async (_, __, ___, ____, tokenId) => [tokenId] },
    { name: "claimAllRewards", argsGenerator: async () => [] },
    { name: "safeMint", argsGenerator: async () => [signer.address] },
  ];

  const numTxs = Math.floor(Math.random() * 16) + 15;
  console.log(`Performing ${numTxs} random interactions...`);

  // Track staked tokens per NFT contract
  const stakedTokens: { [contractAddr: string]: Set<number> } = {};
  nfts.forEach(async (nft) => {
    const addr = await nft.getAddress();
    stakedTokens[addr] = new Set();
  });

  for (let i = 0; i < numTxs; i++) {
    const randNft = nfts[Math.floor(Math.random() * nfts.length)];
    const nftAddr = await randNft.getAddress();

    const randInteract = interactions[Math.floor(Math.random() * interactions.length)];

    let tokenId: number;
    const isUnstakeRelated = ["unstake", "unstakeMultiple", "claimRewardsForToken"].includes(randInteract.name);

    if (isUnstakeRelated && stakedTokens[nftAddr].size > 0) {
      // უპირატესობა სტეიკებულ ტოკენებს
      const stakedArray = Array.from(stakedTokens[nftAddr]);
      tokenId = stakedArray[Math.floor(Math.random() * stakedArray.length)];
    } else {
      // ჩვეულებრივი რანდომი 1-დან 10-მდე
      tokenId = Math.floor(Math.random() * mintedPerNft) + 1;
    }

    const randQty = Math.floor(Math.random() * 5) + 1;
    const amount = ethers.parseUnits(randQty.toString(), 0);

    const gasGwei = 200 + Math.floor(Math.random() * 301);
    const gasPrice = ethers.parseUnits(gasGwei.toString(), "gwei");

    console.log(
      `Tx ${i + 1}/${numTxs}: ${randInteract.name.padEnd(20)} | NFT ${(await randNft.name()).padEnd(10)} | tokenId ${tokenId} | gas ${gasGwei} Gwei`
    );

    try {
      if (typeof randNft[randInteract.name] !== "function") {
        throw new Error(`Function "${randInteract.name}" does not exist on this contract`);
      }

      const args = await randInteract.argsGenerator(randNft, signer, usdc, amount, tokenId);
      const tx = await randNft[randInteract.name](...args, {
        gasPrice,
        gasLimit: 1500000, // უფრო მაღალი ლიმიტი staking/unstaking-ისთვის
      });

      const receipt = await tx.wait();
      console.log(`  → Success (block ${receipt.blockNumber})`);

      // თუ stake → დავამატოთ staked set-ში
      if (randInteract.name === "stake") {
        stakedTokens[nftAddr].add(tokenId);
      }
      // თუ unstake → წავშალოთ
      if (["unstake", "unstakeMultiple"].includes(randInteract.name)) {
        stakedTokens[nftAddr].delete(tokenId);
      }

    } catch (e: any) {
      const msg = e.shortMessage || e.reason || e.message || "Unknown revert";
      console.log(`  → Failed: ${msg.slice(0, 150)}${msg.length > 150 ? "..." : ""}`);
    }

    const delay = (10 + Math.floor(Math.random() * 21)) * 1000;
    await new Promise(r => setTimeout(r, delay));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});