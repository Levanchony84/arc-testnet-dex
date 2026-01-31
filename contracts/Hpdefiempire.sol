// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HPDeFiEmpire - ჰერმანე პაატაშვილის DeFi იმპერია
 * @notice სრული DeFi ეკოსისტემა: DEX, NFT, Arbitrage, Governance, Analytics, Identity
 * @dev Arc Testnet-ისთვის შექმნილი ულტრა-ინოვაციური პროტოკოლი
 * @author HP Developer Team
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract HPDeFiEmpire {
    
    // ═══════════════════════════════════════════════════════════
    // 👤 OWNER & SECURITY
    // ═══════════════════════════════════════════════════════════
    
    address public owner;
    bool private locked;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier nonReentrant() {
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        _;
        locked = false;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 📊 STRUCTS
    // ═══════════════════════════════════════════════════════════
    
    struct Pool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        uint256 price; // tokenB per tokenA (scaled by 1e18)
        uint256 volume24h;
        uint256 fees24h;
        uint256 lastUpdate;
        bool exists;
    }
    
    struct NFT {
        string name;
        string metadata; // IPFS hash
        address creator;
        address owner;
        uint256 price;
        bool forSale;
        uint256 royalty; // basis points (100 = 1%)
        uint256 createdAt;
        uint256 lastSalePrice;
        uint256 totalSales;
        string rarity; // Common, Rare, Epic, Legendary
    }
    
    struct UserProfile {
        string georgianName;
        uint256 reputation;
        uint256 totalTrades;
        uint256 totalVolume;
        uint256 nftsMinted;
        uint256 nftsOwned;
        uint256 stakingPower;
        uint256 governanceWeight;
        uint256 governanceVotes;
        uint256 arbitrageProfits;
        uint256 joinedAt;
        bool verified;
        bool vip;
    }
    
    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool passed;
    }
    
    struct StakePosition {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaim;
        uint256 totalRewards;
        uint256 lockPeriod; // 0 = flexible, 30/60/90 days
    }
    
    struct ArbitrageOpportunity {
        address tokenIn;
        address tokenOut;
        bytes32 poolA;
        bytes32 poolB;
        uint256 profitEstimate;
        uint256 timestamp;
        bool executed;
    }
    
    struct DailyMetrics {
        uint256 totalVolume;
        uint256 totalTrades;
        uint256 uniqueUsers;
        uint256 totalFees;
        uint256 nftSales;
        uint256 arbitrageExecuted;
        uint256 timestamp;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 💾 STATE VARIABLES
    // ═══════════════════════════════════════════════════════════
    
    // Core
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public swapFee = 30; // 0.3%
    uint256 public platformFee = 10; // 0.1%
    uint256 public nftRoyaltyMax = 1000; // 10% max
    
    // Counters
    uint256 public nextNftId = 1;
    uint256 public nextProposalId = 1;
    uint256 public totalPools;
    uint256 public totalUsers;
    uint256 public totalArbitrageOps;
    
    // Statistics
    uint256 public lifetimeVolume;
    uint256 public lifetimeFees;
    uint256 public lifetimeNFTSales;
    
    // Mappings
    mapping(bytes32 => Pool) public pools;
    mapping(uint256 => NFT) public nfts;
    mapping(address => UserProfile) public profiles;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(address => StakePosition)) public stakes;
    mapping(uint256 => DailyMetrics) public dailyMetrics;
    mapping(address => mapping(bytes32 => uint256)) public userLiquidity;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => bool) public isRegistered;
    mapping(uint256 => ArbitrageOpportunity) public arbitrageOps;
    
    // Arrays
    bytes32[] public poolIds;
    uint256[] public nftIds;
    address[] public users;
    
    // ═══════════════════════════════════════════════════════════
    // 📡 EVENTS
    // ═══════════════════════════════════════════════════════════
    
    event PoolCreated(bytes32 indexed poolId, address tokenA, address tokenB, uint256 timestamp);
    event LiquidityAdded(address indexed user, bytes32 indexed poolId, uint256 amountA, uint256 amountB);
    event LiquidityRemoved(address indexed user, bytes32 indexed poolId, uint256 amountA, uint256 amountB);
    event Swapped(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 fee);
    event PriceUpdated(bytes32 indexed poolId, uint256 newPrice, uint256 timestamp);
    
    event NFTMinted(uint256 indexed tokenId, address creator, string name, string rarity);
    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTSold(uint256 indexed tokenId, address from, address to, uint256 price, uint256 royalty);
    event NFTTransferred(uint256 indexed tokenId, address from, address to);
    
    event ProfileCreated(address indexed user, string georgianName, uint256 timestamp);
    event ReputationUpdated(address indexed user, uint256 oldRep, uint256 newRep);
    event VIPStatusGranted(address indexed user, uint256 timestamp);
    
    event ProposalCreated(uint256 indexed proposalId, address proposer, string title);
    event Voted(uint256 indexed proposalId, address voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);
    
    event Staked(address indexed user, address token, uint256 amount, uint256 lockPeriod);
    event Unstaked(address indexed user, address token, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, address token, uint256 rewards);
    
    event ArbitrageDetected(uint256 indexed opId, address tokenIn, address tokenOut, uint256 profit);
    event ArbitrageExecuted(uint256 indexed opId, address executor, uint256 actualProfit);
    
    // ═══════════════════════════════════════════════════════════
    // 🏗️ CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════
    
    constructor() {
        owner = msg.sender;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 👤 USER PROFILE & IDENTITY
    // ═══════════════════════════════════════════════════════════
    
    function createProfile(string memory georgianName) external {
        require(!isRegistered[msg.sender], "Profile exists");
        require(bytes(georgianName).length > 0, "Name required");
        
        profiles[msg.sender] = UserProfile({
            georgianName: georgianName,
            reputation: 100, // Starting reputation
            totalTrades: 0,
            totalVolume: 0,
            nftsMinted: 0,
            nftsOwned: 0,
            stakingPower: 0,
            governanceWeight: 0,
            governanceVotes: 0,
            arbitrageProfits: 0,
            joinedAt: block.timestamp,
            verified: false,
            vip: false
        });
        
        isRegistered[msg.sender] = true;
        users.push(msg.sender);
        totalUsers++;
        
        emit ProfileCreated(msg.sender, georgianName, block.timestamp);
    }
    
    function updateReputation(address user, uint256 points, bool increase) internal {
        uint256 oldRep = profiles[user].reputation;
        
        if (increase) {
            profiles[user].reputation += points;
        } else {
            if (profiles[user].reputation > points) {
                profiles[user].reputation -= points;
            } else {
                profiles[user].reputation = 0;
            }
        }
        
        // Auto VIP at 1000 reputation
        if (profiles[user].reputation >= 1000 && !profiles[user].vip) {
            profiles[user].vip = true;
            emit VIPStatusGranted(user, block.timestamp);
        }
        
        emit ReputationUpdated(user, oldRep, profiles[user].reputation);
    }
    
    function getProfile(address user) external view returns (
        string memory name,
        uint256 reputation,
        uint256 totalTrades,
        uint256 totalVolume,
        bool verified,
        bool vip
    ) {
        UserProfile memory p = profiles[user];
        return (p.georgianName, p.reputation, p.totalTrades, p.totalVolume, p.verified, p.vip);
    }
    
    // ═══════════════════════════════════════════════════════════
    // 💱 DEX FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    function createPool(address tokenA, address tokenB) external returns (bytes32) {
        require(tokenA != tokenB, "Same token");
        require(tokenA != address(0) && tokenB != address(0), "Zero address");
        
        // Normalize token order
        if (uint160(tokenA) > uint160(tokenB)) {
            (tokenA, tokenB) = (tokenB, tokenA);
        }
        
        bytes32 poolId = keccak256(abi.encodePacked(tokenA, tokenB));
        require(!pools[poolId].exists, "Pool exists");
        
        pools[poolId] = Pool({
            tokenA: tokenA,
            tokenB: tokenB,
            reserveA: 0,
            reserveB: 0,
            totalLiquidity: 0,
            price: 0,
            volume24h: 0,
            fees24h: 0,
            lastUpdate: block.timestamp,
            exists: true
        });
        
        poolIds.push(poolId);
        totalPools++;
        
        emit PoolCreated(poolId, tokenA, tokenB, block.timestamp);
        return poolId;
    }
    
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external nonReentrant returns (uint256 liquidity) {
        require(amountA > 0 && amountB > 0, "Zero amount");
        
        bytes32 poolId = _addLiquidityAndGetId(tokenA, tokenB, amountA, amountB);
        liquidity = _calculateAndAddLiquidity(poolId, amountA, amountB);
        
        return liquidity;
    }
    
    function _addLiquidityAndGetId(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) internal returns (bytes32 poolId) {
        // Normalize
        if (uint160(tokenA) > uint160(tokenB)) {
            (tokenA, tokenB) = (tokenB, tokenA);
            (amountA, amountB) = (amountB, amountA);
        }
        
        poolId = keccak256(abi.encodePacked(tokenA, tokenB));
        require(pools[poolId].exists, "Pool not found");
        
        // Transfer tokens
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
        
        return poolId;
    }
    
    function _calculateAndAddLiquidity(
        bytes32 poolId,
        uint256 amountA,
        uint256 amountB
    ) internal returns (uint256 liquidity) {
        Pool storage pool = pools[poolId];
        
        // Calculate liquidity
        if (pool.totalLiquidity == 0) {
            liquidity = sqrt(amountA * amountB);
        } else {
            liquidity = min(
                (amountA * pool.totalLiquidity) / pool.reserveA,
                (amountB * pool.totalLiquidity) / pool.reserveB
            );
        }
        
        require(liquidity > 0, "Insufficient liquidity");
        
        // Update pool
        pool.reserveA += amountA;
        pool.reserveB += amountB;
        pool.totalLiquidity += liquidity;
        pool.price = (pool.reserveB * 1e18) / pool.reserveA;
        pool.lastUpdate = block.timestamp;
        
        // Update user
        userLiquidity[msg.sender][poolId] += liquidity;
        profiles[msg.sender].stakingPower += liquidity;
        
        updateReputation(msg.sender, 5, true);
        
        emit LiquidityAdded(msg.sender, poolId, amountA, amountB);
        emit PriceUpdated(poolId, pool.price, block.timestamp);
        
        return liquidity;
    }
    
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        require(liquidity > 0, "Zero liquidity");
        
        bytes32 poolId = _getPoolId(tokenA, tokenB);
        require(pools[poolId].exists, "Pool not found");
        require(userLiquidity[msg.sender][poolId] >= liquidity, "Insufficient liquidity");
        
        (amountA, amountB) = _removeLiquidityFromPool(poolId, liquidity, tokenA, tokenB);
        
        return (amountA, amountB);
    }
    
    function _removeLiquidityFromPool(
        bytes32 poolId,
        uint256 liquidity,
        address tokenA,
        address tokenB
    ) internal returns (uint256 amountA, uint256 amountB) {
        Pool storage pool = pools[poolId];
        
        // Calculate amounts
        amountA = (liquidity * pool.reserveA) / pool.totalLiquidity;
        amountB = (liquidity * pool.reserveB) / pool.totalLiquidity;
        
        require(amountA > 0 && amountB > 0, "Insufficient amounts");
        
        // Update pool
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        pool.totalLiquidity -= liquidity;
        if (pool.reserveA > 0) {
            pool.price = (pool.reserveB * 1e18) / pool.reserveA;
        }
        pool.lastUpdate = block.timestamp;
        
        // Update user
        userLiquidity[msg.sender][poolId] -= liquidity;
        if (profiles[msg.sender].stakingPower >= liquidity) {
            profiles[msg.sender].stakingPower -= liquidity;
        }
        
        // Transfer tokens
        IERC20(tokenA).transfer(msg.sender, amountA);
        IERC20(tokenB).transfer(msg.sender, amountB);
        
        emit LiquidityRemoved(msg.sender, poolId, amountA, amountB);
        emit PriceUpdated(poolId, pool.price, block.timestamp);
        
        return (amountA, amountB);
    }
    
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn != tokenOut, "Same token");
        
        // Get pool ID
        bytes32 poolId = _getPoolId(tokenIn, tokenOut);
        require(pools[poolId].exists, "Pool not found");
        
        // Calculate swap
        (amountOut, ) = _executeSwap(poolId, tokenIn, tokenOut, amountIn, minAmountOut);
        
        return amountOut;
    }
    
    function _getPoolId(address tokenIn, address tokenOut) internal pure returns (bytes32) {
        address tokenA = tokenIn;
        address tokenB = tokenOut;
        
        if (uint160(tokenA) > uint160(tokenB)) {
            (tokenA, tokenB) = (tokenB, tokenA);
        }
        
        return keccak256(abi.encodePacked(tokenA, tokenB));
    }
    
    function _executeSwap(
        bytes32 poolId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut, uint256 fee) {
        Pool storage pool = pools[poolId];
        
        // Determine if tokens are reversed
        bool reversed = uint160(tokenIn) > uint160(tokenOut);
        
        // Calculate amount out with fee
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - swapFee);
        uint256 reserveIn = reversed ? pool.reserveB : pool.reserveA;
        uint256 reserveOut = reversed ? pool.reserveA : pool.reserveB;
        
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
        require(amountOut >= minAmountOut, "Slippage exceeded");
        require(amountOut < reserveOut, "Insufficient liquidity");
        
        fee = (amountIn * swapFee) / FEE_DENOMINATOR;
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update pool reserves
        if (reversed) {
            pool.reserveB += amountIn;
            pool.reserveA -= amountOut;
        } else {
            pool.reserveA += amountIn;
            pool.reserveB -= amountOut;
        }
        
        // Update pool stats
        pool.price = (pool.reserveB * 1e18) / pool.reserveA;
        pool.volume24h += amountIn;
        pool.fees24h += fee;
        pool.lastUpdate = block.timestamp;
        
        // Update user stats
        profiles[msg.sender].totalTrades++;
        profiles[msg.sender].totalVolume += amountIn;
        updateReputation(msg.sender, 1, true);
        
        // Update global stats
        lifetimeVolume += amountIn;
        lifetimeFees += fee;
        
        // Update daily metrics
        uint256 today = block.timestamp / 1 days;
        dailyMetrics[today].totalVolume += amountIn;
        dailyMetrics[today].totalTrades++;
        dailyMetrics[today].totalFees += fee;
        dailyMetrics[today].timestamp = block.timestamp;
        
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut, fee);
        emit PriceUpdated(poolId, pool.price, block.timestamp);
        
        return (amountOut, fee);
    }
    
    function getPoolPrice(address tokenA, address tokenB) external view returns (uint256) {
        if (uint160(tokenA) > uint160(tokenB)) {
            (tokenA, tokenB) = (tokenB, tokenA);
        }
        bytes32 poolId = keccak256(abi.encodePacked(tokenA, tokenB));
        return pools[poolId].price;
    }
    
    function getPoolReserves(address tokenA, address tokenB) external view returns (uint256, uint256) {
        if (uint160(tokenA) > uint160(tokenB)) {
            (tokenA, tokenB) = (tokenB, tokenA);
        }
        bytes32 poolId = keccak256(abi.encodePacked(tokenA, tokenB));
        return (pools[poolId].reserveA, pools[poolId].reserveB);
    }
    
    // ═══════════════════════════════════════════════════════════
    // 🎨 NFT FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    function mintNFT(
        string memory name,
        string memory metadata,
        uint256 price,
        uint256 royalty,
        string memory rarity
    ) external returns (uint256) {
        require(isRegistered[msg.sender], "Create profile first");
        require(bytes(name).length > 0, "Name required");
        require(royalty <= nftRoyaltyMax, "Royalty too high");
        
        uint256 tokenId = nextNftId++;
        
        nfts[tokenId] = NFT({
            name: name,
            metadata: metadata,
            creator: msg.sender,
            owner: msg.sender,
            price: price,
            forSale: price > 0,
            royalty: royalty,
            createdAt: block.timestamp,
            lastSalePrice: 0,
            totalSales: 0,
            rarity: rarity
        });
        
        nftIds.push(tokenId);
        profiles[msg.sender].nftsMinted++;
        profiles[msg.sender].nftsOwned++;
        updateReputation(msg.sender, 10, true);
        
        emit NFTMinted(tokenId, msg.sender, name, rarity);
        
        if (price > 0) {
            emit NFTListed(tokenId, price);
        }
        
        return tokenId;
    }
    
    function listNFT(uint256 tokenId, uint256 price) external {
        require(nfts[tokenId].owner == msg.sender, "Not owner");
        require(price > 0, "Invalid price");
        
        nfts[tokenId].price = price;
        nfts[tokenId].forSale = true;
        
        emit NFTListed(tokenId, price);
    }
    
    function buyNFT(uint256 tokenId, address paymentToken) external nonReentrant {
        NFT storage nft = nfts[tokenId];
        require(nft.forSale, "Not for sale");
        require(nft.owner != msg.sender, "Already owner");
        
        uint256 price = nft.price;
        uint256 royaltyAmount = (price * nft.royalty) / FEE_DENOMINATOR;
        uint256 sellerAmount = price - royaltyAmount;
        
        // Transfer payment
        IERC20(paymentToken).transferFrom(msg.sender, nft.owner, sellerAmount);
        if (royaltyAmount > 0) {
            IERC20(paymentToken).transferFrom(msg.sender, nft.creator, royaltyAmount);
        }
        
        // Update NFT
        address previousOwner = nft.owner;
        nft.owner = msg.sender;
        nft.forSale = false;
        nft.lastSalePrice = price;
        nft.totalSales++;
        
        // Update profiles
        profiles[previousOwner].nftsOwned--;
        profiles[msg.sender].nftsOwned++;
        
        updateReputation(msg.sender, 3, true);
        updateReputation(previousOwner, 2, true);
        if (nft.creator != previousOwner) {
            updateReputation(nft.creator, 1, true);
        }
        
        // Update stats
        lifetimeNFTSales += price;
        uint256 today = block.timestamp / 1 days;
        dailyMetrics[today].nftSales++;
        
        emit NFTSold(tokenId, previousOwner, msg.sender, price, royaltyAmount);
    }
    
    function transferNFT(uint256 tokenId, address to) external {
        require(nfts[tokenId].owner == msg.sender, "Not owner");
        require(to != address(0), "Zero address");
        
        nfts[tokenId].owner = to;
        nfts[tokenId].forSale = false;
        
        profiles[msg.sender].nftsOwned--;
        profiles[to].nftsOwned++;
        
        emit NFTTransferred(tokenId, msg.sender, to);
    }
    
    function getNFT(uint256 tokenId) external view returns (
        string memory name,
        address owner,
        uint256 price,
        bool forSale,
        string memory rarity,
        uint256 totalSales
    ) {
        NFT memory nft = nfts[tokenId];
        return (nft.name, nft.owner, nft.price, nft.forSale, nft.rarity, nft.totalSales);
    }
    
    // ═══════════════════════════════════════════════════════════
    // 💰 STAKING FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    function stake(address token, uint256 amount, uint256 lockDays) external nonReentrant {
        require(amount > 0, "Zero amount");
        require(lockDays == 0 || lockDays == 30 || lockDays == 60 || lockDays == 90, "Invalid lock");
        
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        StakePosition storage position = stakes[msg.sender][token];
        
        // Claim existing rewards
        if (position.amount > 0) {
            _claimRewards(msg.sender, token);
        }
        
        position.amount += amount;
        position.startTime = block.timestamp;
        position.lastClaim = block.timestamp;
        position.lockPeriod = lockDays * 1 days;
        
        profiles[msg.sender].stakingPower += amount;
        
        updateReputation(msg.sender, 2, true);
        
        emit Staked(msg.sender, token, amount, lockDays);
    }
    
    function unstake(address token, uint256 amount) external nonReentrant {
        StakePosition storage position = stakes[msg.sender][token];
        require(position.amount >= amount, "Insufficient stake");
        
        if (position.lockPeriod > 0) {
            require(block.timestamp >= position.startTime + position.lockPeriod, "Still locked");
        }
        
        uint256 rewards = _calculateRewards(msg.sender, token);
        
        position.amount -= amount;
        if (profiles[msg.sender].stakingPower >= amount) {
            profiles[msg.sender].stakingPower -= amount;
        }
        
        IERC20(token).transfer(msg.sender, amount);
        
        if (rewards > 0) {
            position.totalRewards += rewards;
            IERC20(token).transfer(msg.sender, rewards);
        }
        
        emit Unstaked(msg.sender, token, amount, rewards);
    }
    
    function claimRewards(address token) external nonReentrant {
        _claimRewards(msg.sender, token);
    }
    
    function _claimRewards(address user, address token) internal {
        uint256 rewards = _calculateRewards(user, token);
        if (rewards == 0) return;
        
        StakePosition storage position = stakes[user][token];
        position.lastClaim = block.timestamp;
        position.totalRewards += rewards;
        
        IERC20(token).transfer(user, rewards);
        
        updateReputation(user, 1, true);
        
        emit RewardsClaimed(user, token, rewards);
    }
    
    function _calculateRewards(address user, address token) internal view returns (uint256) {
        StakePosition memory position = stakes[user][token];
        if (position.amount == 0) return 0;
        
        uint256 duration = block.timestamp - position.lastClaim;
        uint256 baseAPR = 500; // 5% base APR
        
        // Bonus for lock periods
        if (position.lockPeriod == 30 days) baseAPR = 700; // 7%
        if (position.lockPeriod == 60 days) baseAPR = 1000; // 10%
        if (position.lockPeriod == 90 days) baseAPR = 1500; // 15%
        
        return (position.amount * baseAPR * duration) / (365 days * FEE_DENOMINATOR);
    }
    
    function getStakeInfo(address user, address token) external view returns (
        uint256 amount,
        uint256 rewards,
        uint256 lockEnd
    ) {
        StakePosition memory position = stakes[user][token];
        uint256 pendingRewards = _calculateRewards(user, token);
        uint256 unlockTime = position.lockPeriod > 0 ? position.startTime + position.lockPeriod : 0;
        
        return (position.amount, pendingRewards, unlockTime);
    }
    
    // ═══════════════════════════════════════════════════════════
    // 🔍 ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    function detectArbitrage(
        address tokenIn,
        address tokenOut,
        bytes32 poolA,
        bytes32 poolB
    ) external returns (uint256 opId) {
        require(pools[poolA].exists && pools[poolB].exists, "Invalid pools");
        
        uint256 priceA = _getPoolPrice(poolA, tokenIn, tokenOut);
        uint256 priceB = _getPoolPrice(poolB, tokenIn, tokenOut);
        
        uint256 priceDiff = priceA > priceB ? priceA - priceB : priceB - priceA;
        uint256 profitEstimate = priceDiff * 1000; // Simplified
        
        if (profitEstimate > 0) {
            opId = totalArbitrageOps++;
            
            arbitrageOps[opId] = ArbitrageOpportunity({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                poolA: poolA,
                poolB: poolB,
                profitEstimate: profitEstimate,
                timestamp: block.timestamp,
                executed: false
            });
            
            emit ArbitrageDetected(opId, tokenIn, tokenOut, profitEstimate);
        }
        
        return opId;
    }
    
    function executeArbitrage(uint256 opId, uint256 amount) external nonReentrant returns (uint256 profit) {
        ArbitrageOpportunity storage op = arbitrageOps[opId];
        require(!op.executed, "Already executed");
        require(block.timestamp <= op.timestamp + 300, "Opportunity expired"); // 5 min
        
        // Execute swaps on both pools
        uint256 amountOut1 = _simulateSwap(op.poolA, op.tokenIn, op.tokenOut, amount);
        uint256 amountOut2 = _simulateSwap(op.poolB, op.tokenOut, op.tokenIn, amountOut1);
        
        profit = amountOut2 > amount ? amountOut2 - amount : 0;
        
        if (profit > 0) {
            op.executed = true;
            profiles[msg.sender].arbitrageProfits += profit;
            updateReputation(msg.sender, 5, true);
            
            uint256 today = block.timestamp / 1 days;
            dailyMetrics[today].arbitrageExecuted++;
            
            emit ArbitrageExecuted(opId, msg.sender, profit);
        }
        
        return profit;
    }
    
    function _getPoolPrice(bytes32 poolId, address tokenIn, address tokenOut) internal view returns (uint256) {
        Pool memory pool = pools[poolId];
        
        bool reversed = false;
        address tokenA = tokenIn;
        address tokenB = tokenOut;
        
        if (uint160(tokenA) > uint160(tokenB)) {
            (tokenA, tokenB) = (tokenB, tokenA);
            reversed = true;
        }
        
        if (reversed) {
            return pool.reserveA > 0 ? (pool.reserveB * 1e18) / pool.reserveA : 0;
        } else {
            return pool.reserveB > 0 ? (pool.reserveA * 1e18) / pool.reserveB : 0;
        }
    }
    
    function _simulateSwap(
        bytes32 poolId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256) {
        Pool memory pool = pools[poolId];
        
        bool reversed = false;
        if (uint160(tokenIn) > uint160(tokenOut)) {
            reversed = true;
        }
        
        uint256 reserveIn = reversed ? pool.reserveB : pool.reserveA;
        uint256 reserveOut = reversed ? pool.reserveA : pool.reserveB;
        
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - swapFee);
        return (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }
    
    // ═══════════════════════════════════════════════════════════
    // 🗳️ GOVERNANCE FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    function createProposal(
        string memory title,
        string memory description,
        uint256 votingPeriod
    ) external returns (uint256) {
        require(isRegistered[msg.sender], "Create profile first");
        require(profiles[msg.sender].stakingPower >= 1000, "Insufficient staking power");
        require(votingPeriod >= 1 days && votingPeriod <= 7 days, "Invalid period");
        
        uint256 proposalId = nextProposalId++;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            title: title,
            description: description,
            proposer: msg.sender,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            executed: false,
            passed: false
        });
        
        updateReputation(msg.sender, 15, true);
        
        emit ProposalCreated(proposalId, msg.sender, title);
        
        return proposalId;
    }
    
    function vote(uint256 proposalId, bool support) external {
        require(isRegistered[msg.sender], "Create profile first");
        Proposal storage prop = proposals[proposalId];
        require(block.timestamp >= prop.startTime && block.timestamp <= prop.endTime, "Voting closed");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        
        uint256 weight = profiles[msg.sender].stakingPower + profiles[msg.sender].reputation;
        
        if (support) {
            prop.forVotes += weight;
        } else {
            prop.againstVotes += weight;
        }
        
        hasVoted[proposalId][msg.sender] = true;
        profiles[msg.sender].governanceVotes++;
        profiles[msg.sender].governanceWeight += weight;
        
        updateReputation(msg.sender, 2, true);
        
        emit Voted(proposalId, msg.sender, support, weight);
    }
    
    function executeProposal(uint256 proposalId) external {
        Proposal storage prop = proposals[proposalId];
        require(block.timestamp > prop.endTime, "Voting ongoing");
        require(!prop.executed, "Already executed");
        
        prop.executed = true;
        prop.passed = prop.forVotes > prop.againstVotes;
        
        if (prop.passed) {
            updateReputation(prop.proposer, 20, true);
        }
        
        emit ProposalExecuted(proposalId, prop.passed);
    }
    
    // ═══════════════════════════════════════════════════════════
    // 📊 ANALYTICS & HELPERS
    // ═══════════════════════════════════════════════════════════
    
    function getDailyMetrics(uint256 dayTimestamp) external view returns (
        uint256 volume,
        uint256 trades,
        uint256 fees,
        uint256 nftSales,
        uint256 arbitrage
    ) {
        uint256 day = dayTimestamp / 1 days;
        DailyMetrics memory metrics = dailyMetrics[day];
        return (metrics.totalVolume, metrics.totalTrades, metrics.totalFees, metrics.nftSales, metrics.arbitrageExecuted);
    }
    
    function getPlatformStats() external view returns (
        uint256 _totalPools,
        uint256 _totalUsers,
        uint256 _totalNFTs,
        uint256 _lifetimeVolume,
        uint256 _lifetimeFees
    ) {
        return (totalPools, totalUsers, nextNftId - 1, lifetimeVolume, lifetimeFees);
    }
    
    function getAllPools() external view returns (bytes32[] memory) {
        return poolIds;
    }
    
    function getAllNFTs() external view returns (uint256[] memory) {
        return nftIds;
    }
    
    function getAllUsers() external view returns (address[] memory) {
        return users;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 🛠️ UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
    
    // ═══════════════════════════════════════════════════════════
    // 🔧 ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════
    
    function setFees(uint256 _swapFee, uint256 _platformFee) external onlyOwner {
        require(_swapFee <= 100 && _platformFee <= 50, "Fee too high");
        swapFee = _swapFee;
        platformFee = _platformFee;
    }
    
    function verifyUser(address user) external onlyOwner {
        profiles[user].verified = true;
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }
}
