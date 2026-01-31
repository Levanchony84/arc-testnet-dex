const { ethers } = require("hardhat");
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');

// ==============================
// Configuration & Constants
// ==============================

const GEORGIAN_NAMES = [
    "გიორგი", "ნინო", "დავით", "მარიამ", "ნიკა", "ანა", "ლუკა", "თამარ",
    "გიგა", "ელენე", "საბა", "სალომე", "ლაშა", "ქეთევან", "გურამ", "თეა",
    "ბექა", "ნათია", "ალექსი", "მაკა", "გია", "ლია", "ზურა", "დიანა",
    "ლევან", "ნატო", "ირაკლი", "ქეთი", "ვახტანგ", "მარინე"
];

const GEO_ACTIONS = {
    exchange: ["გაცვლა", "სვოპი", "ტრეიდი", "გადაცვლა", "შეცვლა"],
    lock: ["სტეიკინგი", "დაბლოკვა", "ჩადება", "შენახვა"],
    loan: ["სესხება", "გატანა", "კრედიტი", "ლოანი"],
    pool: ["ლიკვიდურობა", "პული", "ფონდი", "პულინგი"],
    profit: ["შემოსავალი", "მოგება", "პროფიტი", "ინკამი"],
    decision: ["ხმის მიცემა", "ვოტინგი", "არჩევნები", "გადაწყვეტა"]
};

const DEPLOYED_CONTRACTS = {
    dex1: "0xAeF77e04da1A5f4d41562a0cB6a1B17DD9f69D81",
    dex2: "0x4E54F9915eA62395661Ca6Bc093aD90D9504F70e",
    dex3: "0x3CBF38479c81095994c9339F11331184c40e2a12"
};

const MIN_TX = 50;
const MAX_TX = 120;
const MIN_DELAY_MS = 30000;
const MAX_DELAY_MS = 140000;

// ==============================
// Global State
// ==============================

let lastTxFailed = false;
let consecutiveFailures = 0;
let sessionStats = {
    startTime: Date.now(),
    totalAttempts: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    dex1Ops: 0,
    dex2Ops: 0,
    dex3Ops: 0
};

// ==============================
// Utility Functions (Refactored)
// ==============================

function randNum(minVal, maxVal) {
    return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
}

function bigRand(minEth, maxEth) {
    const value = Math.random() * (maxEth - minVal) + minVal;
    return ethers.parseEther(value.toFixed(6));
}

function generateQty(minEth = 0.1, maxEth = 10) {
    let amount = ethers.parseEther((Math.random() * (maxEth - minEth) + minEth).toFixed(6));
    const minThreshold = ethers.parseEther("0.5");
    if (amount < minThreshold) amount = minThreshold;
    return amount;
}

function fakeAddr() {
    const hex = Math.random().toString(16).substring(2, 42);
    return "0x" + hex.padEnd(40, '0');
}

function calcWaitTime(baseMin = MIN_DELAY_MS, baseMax = MAX_DELAY_MS) {
    let duration = randNum(baseMin, baseMax);
    
    // Exponential backoff if failures
    if (consecutiveFailures > 0) {
        duration = Math.floor(duration * Math.pow(1.5, consecutiveFailures));
    }
    
    // Time-based adjustment (simulate human behavior)
    const currentHour = new Date().getHours();
    if (currentHour >= 12 && currentHour <= 18) {
        duration = Math.floor(duration * 1.2); // Peak hours, slow down
    }
    
    return duration;
}

async function myPause(customMin, customMax) {
    const waitMs = calcWaitTime(customMin, customMax);
    const waitSec = (waitMs / 1000).toFixed(1);
    console.log(`⏳ მოცდა ${waitSec} წამი...`);
    return new Promise(resolve => setTimeout(resolve, waitMs));
}

function selectRandom(collection) {
    return collection[randNum(0, collection.length - 1)];
}

function computeGasPrice() {
    const baseGwei = Math.random() * 30 + 30; // 30-60
    const currentHour = new Date().getHours();
    let adjusted = baseGwei;
    
    if (currentHour >= 12 && currentHour <= 18) {
        adjusted *= 1.2; // Peak hours
    }
    
    return ethers.parseUnits(adjusted.toFixed(2), "gwei");
}

// Gaussian distribution for more human-like randomness
function gaussianRandom(mean = 0, stdDev = 1) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * stdDev + mean;
}

function gaussianAmount(minEth, maxEth) {
    const mean = (minEth + maxEth) / 2;
    const stdDev = (maxEth - minEth) / 6;
    let value = gaussianRandom(mean, stdDev);
    
    if (value < minEth) value = minEth;
    if (value > maxEth) value = maxEth;
    
    return ethers.parseEther(value.toFixed(6));
}

// Progress bar
function renderProgressBar(current, total, barLength = 30) {
    const percentage = Math.floor((current / total) * 100);
    const filled = Math.floor((current / total) * barLength);
    const empty = barLength - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${percentage}%`;
}

// ==============================
// Transaction Actions Map
// ==============================

const createActionMap = (contracts, tokens, deployer) => {
    const { dex1, dex2, dex3 } = contracts;
    const { tcl, samsung, lg, config } = tokens;
    
    return {
        // ========== DEX 1 Operations ==========
        1: async (gas) => {
            const myBalance = await tcl.balanceOf(deployer);
            if (myBalance < ethers.parseEther("1")) {
                console.log(`⚠ TCL balance ძალიან დაბალია: ${ethers.formatEther(myBalance)}`);
                return false;
            }
            const qty = myBalance > ethers.parseEther("20") ? gaussianAmount(1, 10) : myBalance / 10n;
            console.log(`🔄 ${selectRandom(GEO_ACTIONS.exchange)}: TCL → Samsung (${ethers.formatEther(qty)})`);
            const tx = await dex1.swap(config.TCL, config.Samsung, qty, 0, { gasPrice: gas });
            await tx.wait();
            console.log("✓ swap დასრულდა წარმატებით");
            return true;
        },
        
        2: async (gas) => {
            if (Math.random() > 0.7) return null; // 30% skip chance
            const myBalance = await samsung.balanceOf(deployer);
            if (myBalance < ethers.parseEther("1")) {
                console.log(`⚠ Samsung balance არასაკმარისია`);
                return false;
            }
            const qty = myBalance > ethers.parseEther("10") ? gaussianAmount(1, 5) : myBalance / 10n;
            console.log(`🔄 ${selectRandom(GEO_ACTIONS.exchange)}: Samsung → LG (${ethers.formatEther(qty)})`);
            const tx = await dex1.swap(config.Samsung, config.LG, qty, 0, { gasPrice: gas });
            await tx.wait();
            console.log("✓ exchange შესრულდა");
            return true;
        },
        
        3: async (gas) => {
            const myBalance = await lg.balanceOf(deployer);
            if (myBalance < ethers.parseEther("1")) return false;
            const qty = myBalance > ethers.parseEther("15") ? gaussianAmount(1, 8) : myBalance / 10n;
            console.log(`🔄 ${selectRandom(GEO_ACTIONS.exchange)}: LG → TCL (${ethers.formatEther(qty)})`);
            const tx = await dex1.swap(config.LG, config.TCL, qty, 0, { gasPrice: gas });
            await tx.wait();
            console.log("✓ ტრანზაქცია OK");
            return true;
        },
        
        4: async (gas) => {
            const myBalance = await tcl.balanceOf(deployer);
            if (myBalance < ethers.parseEther("1")) return false;
            const qty = myBalance > ethers.parseEther("25") ? gaussianAmount(1, 12) : myBalance / 10n;
            console.log(`🔄 ${selectRandom(GEO_ACTIONS.exchange)}: TCL → LG`);
            const tx = await dex1.swap(config.TCL, config.LG, qty, 0, { gasPrice: gas });
            await tx.wait();
            console.log("✓ გაცვლილია");
            return true;
        },
        
        5: async (gas) => {
            const myBalance = await samsung.balanceOf(deployer);
            if (myBalance < ethers.parseEther("1")) return false;
            const qty = myBalance > ethers.parseEther("12") ? gaussianAmount(1, 6) : myBalance / 10n;
            console.log(`🔄 ${selectRandom(GEO_ACTIONS.exchange)}: Samsung → TCL`);
            const tx = await dex1.swap(config.Samsung, config.TCL, qty, 0, { gasPrice: gas });
            await tx.wait();
            console.log("✓ done");
            return true;
        },
        
        6: async (gas) => {
            const myBalance = await lg.balanceOf(deployer);
            if (myBalance < ethers.parseEther("1")) return false;
            const qty = myBalance > ethers.parseEther("20") ? gaussianAmount(1, 10) : myBalance / 10n;
            console.log(`🔄 ${selectRandom(GEO_ACTIONS.exchange)}: LG → Samsung`);
            const tx = await dex1.swap(config.LG, config.Samsung, qty, 0, { gasPrice: gas });
            await tx.wait();
            console.log("✓ სვოპი OK");
            return true;
        },
        
        7: async (gas) => {
            const bal1 = await tcl.balanceOf(deployer);
            const bal2 = await samsung.balanceOf(deployer);
            if (bal1 < ethers.parseEther("2") || bal2 < ethers.parseEther("2")) {
                console.log(`⚠ არასაკმარისი tokens liquidity-სთვის`);
                return false;
            }
            const amt1 = bal1 > ethers.parseEther("40") ? gaussianAmount(2, 20) : bal1 / 10n;
            const amt2 = bal2 > ethers.parseEther("40") ? gaussianAmount(2, 20) : bal2 / 10n;
            console.log(`💧 ${selectRandom(GEO_ACTIONS.pool)}: TCL/Samsung Pool`);
            const tx = await dex1.addLiquidity(config.TCL, config.Samsung, amt1, amt2, { gasPrice: gas });
            await tx.wait();
            console.log("✓ ლიკვიდობა დამატებულია");
            return true;
        },
        
        8: async (gas) => {
            const bal1 = await samsung.balanceOf(deployer);
            const bal2 = await lg.balanceOf(deployer);
            if (bal1 < ethers.parseEther("2") || bal2 < ethers.parseEther("2")) return false;
            const amt1 = bal1 > ethers.parseEther("30") ? gaussianAmount(2, 15) : bal1 / 10n;
            const amt2 = bal2 > ethers.parseEther("30") ? gaussianAmount(2, 15) : bal2 / 10n;
            console.log(`💧 ${selectRandom(GEO_ACTIONS.pool)}: Samsung/LG Pool`);
            const tx = await dex1.addLiquidity(config.Samsung, config.LG, amt1, amt2, { gasPrice: gas });
            await tx.wait();
            console.log("✓ pool updated");
            return true;
        },
        
        9: async (gas) => {
            const bal1 = await tcl.balanceOf(deployer);
            const bal2 = await lg.balanceOf(deployer);
            if (bal1 < ethers.parseEther("2") || bal2 < ethers.parseEther("2")) return false;
            const amt1 = bal1 > ethers.parseEther("50") ? gaussianAmount(2, 25) : bal1 / 10n;
            const amt2 = bal2 > ethers.parseEther("50") ? gaussianAmount(2, 25) : bal2 / 10n;
            console.log(`💧 ${selectRandom(GEO_ACTIONS.pool)}: TCL/LG Pool`);
            const tx = await dex1.addLiquidity(config.TCL, config.LG, amt1, amt2, { gasPrice: gas });
            await tx.wait();
            console.log("✓ liquidity added");
            return true;
        },
        
        10: async (gas) => {
            const myBalance = await tcl.balanceOf(deployer);
            if (myBalance < ethers.parseEther("2")) return false;
            const qty = myBalance > ethers.parseEther("30") ? gaussianAmount(2, 15) : myBalance / 10n;
            const route = [config.TCL, config.Samsung, config.LG];
            console.log(`🔀 Multi-Hop: TCL → SAM → LG`);
            const tx = await dex1.multiHopSwap(route, qty, 0, { gasPrice: gas });
            await tx.wait();
            console.log("✓ multi-hop complete");
            return true;
        },
        
        // ========== DEX 2 Operations ==========
        11: async (gas) => {
            const myBalance = await tcl.balanceOf(deployer);
            if (myBalance < ethers.parseEther("5")) return false;
            const qty = myBalance > ethers.parseEther("100") ? gaussianAmount(5, 50) : myBalance / 10n;
            console.log(`🔒 ${selectRandom(GEO_ACTIONS.lock)}: TCL`);
            const tx = await dex2.stake(config.TCL, qty, { gasPrice: gas });
            await tx.wait();
            console.log("✓ stake successful");
            return true;
        },
        
        12: async (gas) => {
            const myBalance = await samsung.balanceOf(deployer);
            if (myBalance < ethers.parseEther("3")) return false;
            const qty = myBalance > ethers.parseEther("60") ? gaussianAmount(3, 30) : myBalance / 10n;
            console.log(`🔒 ${selectRandom(GEO_ACTIONS.lock)}: Samsung`);
            const tx = await dex2.stake(config.Samsung, qty, { gasPrice: gas });
            await tx.wait();
            console.log("✓ დაბლოკილია");
            return true;
        },
        
        13: async (gas) => {
            const myBalance = await lg.balanceOf(deployer);
            if (myBalance < ethers.parseEther("4")) return false;
            const qty = myBalance > ethers.parseEther("80") ? gaussianAmount(4, 40) : myBalance / 10n;
            console.log(`🔒 ${selectRandom(GEO_ACTIONS.lock)}: LG`);
            const tx = await dex2.stake(config.LG, qty, { gasPrice: gas });
            await tx.wait();
            console.log("✓ staking OK");
            return true;
        },
        
        14: async (gas) => {
            const qty = gaussianAmount(10, 100);
            console.log(`🔓 unstake: TCL`);
            try {
                const tx = await dex2.unstake(config.TCL, qty, { gasPrice: gas });
                await tx.wait();
                console.log("✓ ამოღებულია");
                return true;
            } catch (err) {
                console.log("⚠ არ არის საკმარისი stake");
                return false;
            }
        },
        
        15: async (gas) => {
            const options = [
                { addr: config.TCL, contract: tcl },
                { addr: config.Samsung, contract: samsung },
                { addr: config.LG, contract: lg }
            ];
            const pick = selectRandom(options);
            const myBalance = await pick.contract.balanceOf(deployer);
            if (myBalance < ethers.parseEther("10")) return false;
            const qty = myBalance > ethers.parseEther("200") ? gaussianAmount(10, 100) : myBalance / 10n;
            console.log(`🏦 collateral deposit: ${ethers.formatEther(qty)}`);
            const tx = await dex2.depositCollateral(pick.addr, qty, { gasPrice: gas });
            await tx.wait();
            console.log("✓ გირაო შეტანილია");
            return true;
        },
        
        16: async (gas) => {
            const myBalance = await tcl.balanceOf(deployer);
            if (myBalance < ethers.parseEther("50")) {
                console.log(`⚠ არასაკმარისი TCL გირაოსთვის`);
                return false;
            }
            
            const loanAmount = gaussianAmount(10, 30);
            const collateralAmount = (loanAmount * 200n) / 100n;
            
            console.log(`💸 ${selectRandom(GEO_ACTIONS.loan)}: TCL`);
            console.log(`   📥 collateral: ${ethers.formatEther(collateralAmount)} TCL`);
            
            let tx = await dex2.depositCollateral(config.TCL, collateralAmount, { gasPrice: gas });
            await tx.wait();
            console.log(`   ✓ გირაო მიღებულია`);
            
            tx = await dex2.borrow(config.TCL, loanAmount, { gasPrice: gas });
            await tx.wait();
            console.log(`   ✓ loan issued: ${ethers.formatEther(loanAmount)} TCL`);
            return true;
        },
        
        17: async (gas) => {
            const myBalance = await samsung.balanceOf(deployer);
            if (myBalance < ethers.parseEther("50")) return false;
            
            const loanAmount = gaussianAmount(10, 30);
            const collateralAmount = (loanAmount * 200n) / 100n;
            
            console.log(`💸 ${selectRandom(GEO_ACTIONS.loan)}: Samsung`);
            console.log(`   📥 collateral: ${ethers.formatEther(collateralAmount)} SAM`);
            
            let tx = await dex2.depositCollateral(config.Samsung, collateralAmount, { gasPrice: gas });
            await tx.wait();
            console.log(`   ✓ გირაო OK`);
            
            tx = await dex2.borrow(config.Samsung, loanAmount, { gasPrice: gas });
            await tx.wait();
            console.log(`   ✓ სესხი გაცემულია: ${ethers.formatEther(loanAmount)} SAM`);
            return true;
        },
        
        18: async (gas) => {
            const options = [
                { addr: config.TCL, contract: tcl, name: "TCL" },
                { addr: config.Samsung, contract: samsung, name: "Samsung" }
            ];
            const pick = selectRandom(options);
            
            console.log(`💰 სესხის დაფარვა: ${pick.name}`);
            
            const debt = await dex2.getBorrow(deployer, pick.addr);
            
            if (debt == 0n) {
                console.log(`⚠ ${pick.name} loan არ არის`);
                return false;
            }
            
            const myBalance = await pick.contract.balanceOf(deployer);
            const maxRepay = debt / 2n;
            const repayQty = myBalance < maxRepay ? myBalance : maxRepay;
            
            if (repayQty == 0n) {
                console.log(`⚠ არასაკმარისი ${pick.name} repayment-სთვის`);
                return false;
            }
            
            console.log(`   💳 debt: ${ethers.formatEther(debt)} ${pick.name}`);
            console.log(`   💵 payment: ${ethers.formatEther(repayQty)} ${pick.name}`);
            
            const tx = await dex2.repay(pick.addr, repayQty, { gasPrice: gas });
            await tx.wait();
            console.log("✓ repaid");
            return true;
        },
        
        19: async (gas) => {
            const qty = gaussianAmount(10, 100);
            const options = [config.TCL, config.Samsung, config.LG];
            const pick = selectRandom(options);
            console.log(`🏦 collateral withdrawal`);
            try {
                const tx = await dex2.withdrawCollateral(pick, qty, { gasPrice: gas });
                await tx.wait();
                console.log("✓ გამოტანილია");
                return true;
            } catch (err) {
                console.log("⚠ withdrawal შეუძლებელია");
                return false;
            }
        },
        
        20: async (gas) => {
            console.log(`💰 ${selectRandom(GEO_ACTIONS.profit)} claim`);
            try {
                const tx = await dex2.claimYield({ gasPrice: gas });
                await tx.wait();
                console.log("✓ yield claimed");
                return true;
            } catch (err) {
                console.log("⚠ yield არ არის");
                return false;
            }
        },
        
        21: async (gas) => {
            const myBalance = await tcl.balanceOf(deployer);
            if (myBalance < ethers.parseEther("30")) return false;
            const qty = myBalance > ethers.parseEther("60") ? gaussianAmount(3, 30) : myBalance / 10n;
            console.log(`⚡ Zap In`);
            const tx = await dex2.zapIn(config.TCL, qty, config.Samsung, config.LG, { gasPrice: gas });
            await tx.wait();
            console.log("✓ zapped");
            return true;
        },
        
        // ========== DEX 3 Operations ==========
        22: async (gas) => {
            const myBalance = await tcl.balanceOf(deployer);
            if (myBalance < ethers.parseEther("100")) return false;
            const qty = gaussianAmount(10, 100);
            console.log(`⚡ Flash Loan`);
            try {
                const tx = await dex3.flashLoan(config.TCL, qty, { gasPrice: gas });
                await tx.wait();
                console.log("✓ flash loan executed");
                return true;
            } catch (err) {
                console.log("⚠ flash loan conditions failed");
                return false;
            }
        },
        
        23: async (gas) => {
            const myBalance = await tcl.balanceOf(deployer);
            if (myBalance < ethers.parseEther("20")) return false;
            const qty = myBalance > ethers.parseEther("40") ? gaussianAmount(2, 20) : myBalance / 10n;
            console.log(`🔒 Escrow creation`);
            const buyer = fakeAddr();
            const tx = await dex3.createEscrow(buyer, config.TCL, qty, Math.floor(Date.now() / 1000) + 86400, { gasPrice: gas });
            await tx.wait();
            console.log("✓ escrow created");
            return true;
        },
        
        24: async (gas) => {
            if (Math.random() > 0.5) return null; // 50% skip
            const metadata = ["ipfs://art1", "ipfs://collectible2", "ipfs://unique3", "ipfs://rare4"];
            console.log(`🎨 NFT Mint`);
            try {
                const tx = await dex3.mintNFT(selectRandom(metadata), { gasPrice: gas });
                await tx.wait();
                console.log("✓ NFT minted");
                return true;
            } catch (err) {
                console.log("⚠ method unavailable");
                return false;
            }
        },
        
        25: async (gas) => {
            const id = randNum(1, 10);
            const price = gaussianAmount(50, 500);
            console.log(`🏷️  NFT listing`);
            try {
                const tx = await dex3.listNFT(id, price, { gasPrice: gas });
                await tx.wait();
                console.log("✓ NFT listed");
                return true;
            } catch (err) {
                console.log("⚠ NFT not found");
                return false;
            }
        },
        
        26: async (gas) => {
            const ticketPrice = gaussianAmount(5, 50);
            console.log(`🎰 Lottery creation`);
            try {
                const tx = await dex3.createLottery(ticketPrice, 24 * 60 * 60, { gasPrice: gas });
                await tx.wait();
                console.log("✓ lottery created");
                return true;
            } catch (err) {
                console.log("⚠ method unavailable");
                return false;
            }
        },
        
        27: async (gas) => {
            const ref = fakeAddr();
            console.log(`👥 Referrer setup`);
            try {
                const tx = await dex3.setReferrer(ref, { gasPrice: gas });
                await tx.wait();
                console.log("✓ referrer set");
                return true;
            } catch (err) {
                console.log("⚠ referrer already set");
                return false;
            }
        }
    };
};

// ==============================
// Balance Check
// ==============================

async function checkBalanceBeforeTx(tokenContract, requiredAmount, tokenName) {
    const balance = await tokenContract.balanceOf(deployer.address);
    if (balance < requiredAmount) {
        throw new Error(`არასაკმარისი ${tokenName} ბალანსი: ${ethers.formatEther(balance)}`);
    }
    return true;
}

// ==============================
// LP Token Discovery
// ==============================

async function discoverLPTokens(dex1Contract, tokenAddresses) {
    const lpRegistry = {};
    const pairs = [
        ["TCL", "Samsung"],
        ["Samsung", "LG"],
        ["TCL", "LG"]
    ];
    
    console.log("🔍 LP tokens მოძიება...");
    
    let discoveredCount = 0;
    const promises = pairs.map(async ([token1, token2]) => {
        try {
            const addr1 = tokenAddresses[token1];
            const addr2 = tokenAddresses[token2];
            const lpAddr = await dex1Contract.lpTokens(addr1, addr2);
            
            if (lpAddr && lpAddr !== ethers.ZeroAddress) {
                const pairName = `${token1}-${token2}`;
                lpRegistry[pairName] = lpAddr;
                console.log(`   ▸ ${pairName}: ${lpAddr}`);
                discoveredCount++;
            }
        } catch (error) {
            // Silent fail for non-existent pairs
        }
    });
    
    await Promise.all(promises);
    
    if (discoveredCount === 0) {
        console.log("⚠ LP tokens ვერ მოიძებნა");
    }
    
    return lpRegistry;
}

// ==============================
// Approval Block (Batch)
// ==============================

async function performApprovals(tokens, contracts, deployer) {
    console.log("🔐 Token approvals (batch)...");
    
    const { tcl, samsung, lg } = tokens;
    const { dex1, dex2, dex3 } = contracts;
    const gas = computeGasPrice();
    
    console.log(`   ⛽ Gas: ${ethers.formatUnits(gas, "gwei")} Gwei`);
    
    const approvalTasks = [
        tcl.approve(DEPLOYED_CONTRACTS.dex1, ethers.MaxUint256, { gasPrice: gas }),
        tcl.approve(DEPLOYED_CONTRACTS.dex2, ethers.MaxUint256, { gasPrice: gas }),
        tcl.approve(DEPLOYED_CONTRACTS.dex3, ethers.MaxUint256, { gasPrice: gas }),
        samsung.approve(DEPLOYED_CONTRACTS.dex1, ethers.MaxUint256, { gasPrice: gas }),
        samsung.approve(DEPLOYED_CONTRACTS.dex2, ethers.MaxUint256, { gasPrice: gas }),
        samsung.approve(DEPLOYED_CONTRACTS.dex3, ethers.MaxUint256, { gasPrice: gas }),
        lg.approve(DEPLOYED_CONTRACTS.dex1, ethers.MaxUint256, { gasPrice: gas }),
        lg.approve(DEPLOYED_CONTRACTS.dex2, ethers.MaxUint256, { gasPrice: gas }),
        lg.approve(DEPLOYED_CONTRACTS.dex3, ethers.MaxUint256, { gasPrice: gas })
    ];
    
    try {
        const txs = await Promise.all(approvalTasks);
        console.log(`   ⚙ ${txs.length} approvals გაგზავნილია...`);
        
        await Promise.all(txs.map(tx => tx.wait()));
        console.log(`✓ approvals დასრულებულია (9/9)\n`);
        return true;
    } catch (error) {
        console.log("⚠ approval შეცდომა:", error.message);
        console.log("   ▶ გაგრძელება...\n");
        return false;
    }
}

// ==============================
// Save Session Stats
// ==============================

async function saveSessionStats(stats, filename = 'session-stats.json') {
    try {
        stats.endTime = Date.now();
        stats.durationSeconds = Math.floor((stats.endTime - stats.startTime) / 1000);
        stats.successRate = ((stats.successful / stats.totalAttempts) * 100).toFixed(2) + '%';
        
        await fs.writeFile(filename, JSON.stringify(stats, null, 2));
        console.log(`💾 სტატისტიკა შენახულია: ${filename}`);
    } catch (err) {
        console.log("⚠ სტატისტიკის შენახვა ვერ მოხერხდა");
    }
}

// ==============================
// Main Execution
// ==============================

async function main() {
    console.log("╔════════════════════════════════════════════════════════╗");
    console.log("║      HPDeveloper - Multi-DEX Interactive Bot           ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    // Load configuration
    let configuration;
    try {
        const data = await fs.readFile('deployed-addresses.json', 'utf8');
        configuration = JSON.parse(data);
        console.log("✓ კონფიგურაცია ჩატვირთულია\n");
    } catch (error) {
        console.error("✗ deployed-addresses.json ფაილი ვერ მოიძებნა!");
        console.log("▶ გაუშვით: npx hardhat run deploy.js --network arc\n");
        process.exit(1);
    }
    
    const [deployer] = await ethers.getSigners();
    const operatorName = selectRandom(GEORGIAN_NAMES);
    
    console.log(`👤 ოპერატორი: ${operatorName}`);
    console.log(`📍 Address: ${deployer.address}`);
    console.log(`💰 ETH: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))}\n`);
    
    // Connect to contracts
    console.log("🔌 კონტრაქტებთან დაკავშირება...");
    const dex1 = await ethers.getContractAt("HPPart1", DEPLOYED_CONTRACTS.dex1);
    const dex2 = await ethers.getContractAt("HPPart2", DEPLOYED_CONTRACTS.dex2);
    const dex3 = await ethers.getContractAt("HPPart3", DEPLOYED_CONTRACTS.dex3);
    
    console.log(`   ▸ DEX1: ${DEPLOYED_CONTRACTS.dex1}`);
    console.log(`   ▸ DEX2: ${DEPLOYED_CONTRACTS.dex2}`);
    console.log(`   ▸ DEX3: ${DEPLOYED_CONTRACTS.dex3}`);
    
    // Token contracts
    const tcl = await ethers.getContractAt("IERC20", configuration.TCL);
    const samsung = await ethers.getContractAt("IERC20", configuration.Samsung);
    const lg = await ethers.getContractAt("IERC20", configuration.LG);
    console.log("✓ კავშირები აქტიურია\n");
    
    // LP tokens discovery
    const lpTokens = await discoverLPTokens(dex1, {
        TCL: configuration.TCL,
        Samsung: configuration.Samsung,
        LG: configuration.LG
    });
    
    // Check balances
    console.log("\n💎 საწყისი balances:");
    const balance1 = await tcl.balanceOf(deployer.address);
    const balance2 = await samsung.balanceOf(deployer.address);
    const balance3 = await lg.balanceOf(deployer.address);
    
    console.log(`   ▸ TCL: ${ethers.formatEther(balance1)}`);
    console.log(`   ▸ Samsung: ${ethers.formatEther(balance2)}`);
    console.log(`   ▸ LG: ${ethers.formatEther(balance3)}`);
    
    if (balance1 == 0n && balance2 == 0n && balance3 == 0n) {
        console.log("\n✗ ტოკენები ვერ მოიძებნა!");
        console.log("▶ გაუშვით deploy script\n");
        process.exit(1);
    }
    
    console.log("\n");
    
    // Approvals
    await performApprovals(
        { tcl, samsung, lg },
        { dex1, dex2, dex3 },
        deployer
    );
    
    // Create action map
    const actionMap = createActionMap(
        { dex1, dex2, dex3 },
        { tcl, samsung, lg, config: configuration },
        deployer.address
    );
    
    // Transaction execution
    const TOTAL_TX = randNum(MIN_TX, MAX_TX);
    console.log(`🎯 დაგეგმილია ${TOTAL_TX} ტრანზაქცია\n`);
    console.log("╔════════════════════════════════════════════════════════╗\n");
    
    sessionStats.totalAttempts = TOTAL_TX;
    
    for (let i = 0; i < TOTAL_TX; i++) {
        // Human-like skip behavior
        if (Math.random() > 0.85) {
            console.log(`⏭  TX #${i+1}/${TOTAL_TX} გამოტოვებულია (რანდომი)`);
            sessionStats.skipped++;
            continue;
        }
        
        // Fatigue simulation - longer pause after many transactions
        if (i > 0 && i % 30 === 0) {
            console.log(`\n😴 "დაღლილობა" - გაზრდილი პაუზა\n`);
            await myPause(MIN_DELAY_MS * 2, MAX_DELAY_MS * 2);
        }
        
        // Select action
        const actionId = randNum(1, 27);
        const actionFunc = actionMap[actionId];
        
        if (!actionFunc) {
            console.log(`⚠ არასწორი action ID: ${actionId}`);
            sessionStats.failed++;
            continue;
        }
        
        // Determine DEX
        let dexLabel;
        if (actionId <= 10) {
            dexLabel = "DEX1 (Swaps/Liquidity)";
            sessionStats.dex1Ops++;
        } else if (actionId <= 21) {
            dexLabel = "DEX2 (Staking/Lending)";
            sessionStats.dex2Ops++;
        } else {
            dexLabel = "DEX3 (Advanced)";
            sessionStats.dex3Ops++;
        }
        
        const gas = computeGasPrice();
        const gweiVal = ethers.formatUnits(gas, "gwei");
        
        console.log(`┌────────────────────────────────────────────────────┐`);
        console.log(`│ 📊 TX #${i+1}/${TOTAL_TX}`);
        console.log(`│ 👤 ${operatorName}`);
        console.log(`│ 🏦 ${dexLabel}`);
        console.log(`│ ⛽ ${Number(gweiVal).toFixed(2)} Gwei`);
        console.log(`└────────────────────────────────────────────────────┘`);
        
        // Progress bar every 10 tx
        if ((i + 1) % 10 === 0) {
            console.log(renderProgressBar(i + 1, TOTAL_TX));
        }
        
        // Execute with retry logic
        let success = false;
        let retryCount = 0;
        const maxRetries = 2;
        
        while (!success && retryCount <= maxRetries) {
            try {
                const result = await actionFunc(gas);
                
                if (result === null) {
                    // Skipped by action itself
                    console.log("⏭  action-მა გამოტოვა\n");
                    sessionStats.skipped++;
                    break;
                } else if (result === false) {
                    // Failed but handled
                    sessionStats.failed++;
                    lastTxFailed = true;
                    consecutiveFailures++;
                    break;
                } else {
                    // Success
                    sessionStats.successful++;
                    lastTxFailed = false;
                    consecutiveFailures = 0;
                    success = true;
                }
                
            } catch (error) {
                retryCount++;
                console.log(`✗ შეცდომა (ცდა ${retryCount}/${maxRetries}): ${error.message.substring(0, 100)}`);
                
                // Log to file
                fsSync.appendFileSync('error.log', `[${new Date().toISOString()}] TX ${i+1}: ${error.message}\n`);
                
                if (retryCount <= maxRetries) {
                    console.log("   ▶ ხელახალი ცდა...");
                    await myPause(5000, 10000);
                } else {
                    console.log("   ✗ მეორე ცდაც წარუმატებელი\n");
                    sessionStats.failed++;
                    lastTxFailed = true;
                    consecutiveFailures++;
                }
            }
        }
        
        // Safety: stop if too many failures
        if (sessionStats.failed > 30) {
            console.log("\n✗ ძალიან ბევრი წარუმატებელი TX - სკრიპტი შეწყდა\n");
            break;
        }
        
        // Delay before next
        if (i < TOTAL_TX - 1) {
            await myPause();
        }
    }
    
    // Final statistics
    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║                   📊 საბოლოო შედეგები                  ║");
    console.log("╚════════════════════════════════════════════════════════╝");
    
    const totalProcessed = sessionStats.successful + sessionStats.failed;
    const successRate = totalProcessed > 0 ? ((sessionStats.successful / totalProcessed) * 100).toFixed(1) : 0;
    
    console.log(`✓ წარმატებული: ${sessionStats.successful}`);
    console.log(`✗ წარუმატებელი: ${sessionStats.failed}`);
    console.log(`⏭  გამოტოვებული: ${sessionStats.skipped}`);
    console.log(`📈 წარმატების %: ${successRate}%`);
    
    // Visual graph
    const graphLength = Math.floor(sessionStats.successful / 5);
    console.log(`\nგრაფიკი: [${'#'.repeat(graphLength)}]`);
    
    console.log(`\n🏦 DEX განაწილება:`);
    console.log(`   ▸ DEX1 (Swaps/Liquidity): ${sessionStats.dex1Ops} ops`);
    console.log(`   ▸ DEX2 (Staking/Lending): ${sessionStats.dex2Ops} ops`);
    console.log(`   ▸ DEX3 (Advanced): ${sessionStats.dex3Ops} ops`);
    console.log("╚════════════════════════════════════════════════════════╝\n");
    
    // Final balances
    console.log("💎 საბოლოო balances:");
    const finalBal1 = await tcl.balanceOf(deployer.address);
    const finalBal2 = await samsung.balanceOf(deployer.address);
    const finalBal3 = await lg.balanceOf(deployer.address);
    
    console.log(`   ▸ TCL: ${ethers.formatEther(finalBal1)}`);
    console.log(`   ▸ Samsung: ${ethers.formatEther(finalBal2)}`);
    console.log(`   ▸ LG: ${ethers.formatEther(finalBal3)}`);
    
    // User stats
    try {
        console.log("\n📈 DEX2 სტატისტიკა:");
        const stats = await dex2.getUserStats(deployer.address);
        console.log(`   ▸ Staked: ${ethers.formatEther(stats[0])}`);
        console.log(`   ▸ Borrowed: ${ethers.formatEther(stats[1])}`);
        console.log(`   ▸ Collateral: ${ethers.formatEther(stats[2])}`);
        console.log(`   ▸ LP Balance: ${ethers.formatEther(stats[3])}`);
        console.log(`   ▸ Credit Score: ${stats[4].toString()}`);
    } catch (err) {
        console.log("\n⚠ სტატისტიკა არ არის ხელმისაწვდომი");
    }
    
    // Save session
    await saveSessionStats(sessionStats);
    
    console.log("\n🎉 სესია დასრულებულია!");
    console.log(`👤 ოპერატორი: ${operatorName}`);
    console.log("╚════════════════════════════════════════════════════════╝\n");
}

// ==============================
// Error Handling & Execution
// ==============================

main()
    .then(() => {
        console.log("✓ სკრიპტი წარმატებით დასრულდა");
        process.exit(0);
    })
    .catch((error) => {
        console.error("✗ კრიტიკული შეცდომა:", error);
        fsSync.appendFileSync('critical-error.log', `[${new Date().toISOString()}] ${error.stack}\n`);
        console.log("✗ შეცდომა ჩაწერილია critical-error.log-ში");
        process.exit(1);
    });