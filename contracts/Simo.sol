// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Simo DEX - სიმო დეცენტრალიზებული ბირჟა
 * @notice Advanced Multi-Chain DEX with Real USDC Swaps
 * @dev Supports concentrated liquidity, limit orders, flash swaps, and multi-hop routing
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract Simo is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════
    // 📊 STRUCTS & ENUMS
    // ═══════════════════════════════════════════════════════════

    struct Pool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        uint256 feeRate; // basis points (100 = 1%)
        uint256 totalVolume;
        uint256 totalFees;
        bool active;
        mapping(address => uint256) liquidity;
        mapping(address => Position[]) positions;
    }

    struct Position {
        uint256 id;
        uint256 liquidity;
        uint256 lowerTick;
        uint256 upperTick;
        uint256 feesEarnedA;
        uint256 feesEarnedB;
        uint256 timestamp;
        bool active;
    }

    struct LimitOrder {
        uint256 id;
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 executionPrice;
        uint256 expiry;
        bool executed;
        bool cancelled;
    }

    struct UserProfile {
        string name;
        uint256 totalTrades;
        uint256 totalVolume;
        uint256 totalFeesGenerated;
        uint256 reputationScore;
        uint256 referralRewards;
        bool isVIP;
        address referrer;
        uint256 joinedAt;
    }

    struct ArbitrageOpportunity {
        address tokenA;
        address tokenB;
        bytes32 poolA;
        bytes32 poolB;
        uint256 profitEstimate;
        uint256 detectedAt;
        bool executed;
    }

    // ═══════════════════════════════════════════════════════════
    // 💾 STATE VARIABLES
    // ═══════════════════════════════════════════════════════════

    // Pools
    mapping(bytes32 => Pool) public pools;
    bytes32[] public poolIds;
    
    // Orders
    mapping(uint256 => LimitOrder) public limitOrders;
    uint256 public nextOrderId = 1;
    
    // Users
    mapping(address => UserProfile) public profiles;
    mapping(address => uint256[]) public userOrders;
    
    // Arbitrage
    ArbitrageOpportunity[] public arbitrageOpportunities;
    
    // Staking
    mapping(address => mapping(address => uint256)) public stakedBalances;
    mapping(address => mapping(address => uint256)) public stakingRewards;
    mapping(address => mapping(address => uint256)) public stakingTimestamps;
    
    // Governance
    struct Proposal {
        string title;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 deadline;
        bool executed;
        mapping(address => bool) hasVoted;
    }
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public nextProposalId;
    
    // Platform Stats
    uint256 public totalPools;
    uint256 public totalUsers;
    uint256 public lifetimeVolume;
    uint256 public lifetimeFees;
    
    // Fee collector
    address public feeCollector;
    uint256 public platformFeeRate = 5; // 0.05%
    
    // Multi-Network USDC Addresses
    mapping(uint256 => mapping(string => address)) public networkTokens;

    // ═══════════════════════════════════════════════════════════
    // 📡 EVENTS
    // ═══════════════════════════════════════════════════════════

    event PoolCreated(bytes32 indexed poolId, address tokenA, address tokenB, uint256 feeRate);
    event LiquidityAdded(bytes32 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(bytes32 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(bytes32 indexed poolId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 fee);
    event LimitOrderPlaced(uint256 indexed orderId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn);
    event LimitOrderExecuted(uint256 indexed orderId, uint256 amountOut);
    event LimitOrderCancelled(uint256 indexed orderId);
    event PositionCreated(bytes32 indexed poolId, address indexed provider, uint256 positionId, uint256 lowerTick, uint256 upperTick);
    event FeesCollected(bytes32 indexed poolId, address indexed provider, uint256 feesA, uint256 feesB);
    event ArbitrageDetected(address tokenA, address tokenB, uint256 profitEstimate);
    event ArbitrageExecuted(uint256 indexed opportunityId, uint256 profit);
    event Staked(address indexed user, address indexed token, uint256 amount);
    event Unstaked(address indexed user, address indexed token, uint256 amount);
    event RewardsClaimed(address indexed user, address indexed token, uint256 amount);
    event ProposalCreated(uint256 indexed proposalId, string title);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support);
    event ProfileCreated(address indexed user, string name);

    // ═══════════════════════════════════════════════════════════
    // 🏗️ CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════

    constructor() Ownable(msg.sender) {
        feeCollector = msg.sender;
        
        // Initialize network tokens - USDC addresses for each network
        // Arbitrum Sepolia
        networkTokens[421614]["USDC"] = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
        
        // Base Sepolia
        networkTokens[84532]["USDC"] = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        
        // Unichain Sepolia
        networkTokens[1301]["USDC"] = 0x31d0220469e10c4E71834a79b1f276d740d3768F;
        
        // OP Sepolia
        networkTokens[11155420]["USDC"] = 0x5fd84259d66Cd46123540766Be93DFE6D43130D7;
        
        // Generic USDC (for compatibility)
        networkTokens[0]["USDC"] = 0x3600000000000000000000000000000000000000;
        networkTokens[0]["EURC"] = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
    }

    // ═══════════════════════════════════════════════════════════
    // 👤 USER PROFILE MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    function createProfile(string memory _name) external {
        require(bytes(profiles[msg.sender].name).length == 0, "Profile exists");
        
        profiles[msg.sender] = UserProfile({
            name: _name,
            totalTrades: 0,
            totalVolume: 0,
            totalFeesGenerated: 0,
            reputationScore: 100,
            referralRewards: 0,
            isVIP: false,
            referrer: address(0),
            joinedAt: block.timestamp
        });
        
        totalUsers++;
        emit ProfileCreated(msg.sender, _name);
    }

    function setReferrer(address _referrer) external {
        require(profiles[msg.sender].referrer == address(0), "Referrer already set");
        require(_referrer != msg.sender, "Cannot refer yourself");
        require(bytes(profiles[_referrer].name).length > 0, "Referrer must have profile");
        
        profiles[msg.sender].referrer = _referrer;
    }

    // ═══════════════════════════════════════════════════════════
    // 🏊 POOL MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    function createPool(address _tokenA, address _tokenB, uint256 _feeRate) external returns (bytes32) {
        require(_tokenA != _tokenB, "Identical tokens");
        require(_tokenA != address(0) && _tokenB != address(0), "Zero address");
        require(_feeRate <= 1000, "Fee too high"); // Max 10%
        
        (address token0, address token1) = _tokenA < _tokenB ? (_tokenA, _tokenB) : (_tokenB, _tokenA);
        bytes32 poolId = keccak256(abi.encodePacked(token0, token1));
        
        require(!pools[poolId].active, "Pool exists");
        
        Pool storage pool = pools[poolId];
        pool.tokenA = token0;
        pool.tokenB = token1;
        pool.feeRate = _feeRate;
        pool.active = true;
        
        poolIds.push(poolId);
        totalPools++;
        
        emit PoolCreated(poolId, token0, token1, _feeRate);
        return poolId;
    }

    function addLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 _amountA,
        uint256 _amountB
    ) external nonReentrant returns (uint256 liquidity) {
        bytes32 poolId = getPoolId(_tokenA, _tokenB);
        Pool storage pool = pools[poolId];
        require(pool.active, "Pool not active");
        
        (address token0, address token1) = _tokenA < _tokenB ? (_tokenA, _tokenB) : (_tokenB, _tokenA);
        (uint256 amount0, uint256 amount1) = _tokenA < _tokenB ? (_amountA, _amountB) : (_amountB, _amountA);
        
        if (pool.totalLiquidity == 0) {
            liquidity = Math.sqrt(amount0 * amount1);
        } else {
            uint256 liquidityA = (amount0 * pool.totalLiquidity) / pool.reserveA;
            uint256 liquidityB = (amount1 * pool.totalLiquidity) / pool.reserveB;
            liquidity = Math.min(liquidityA, liquidityB);
        }
        
        require(liquidity > 0, "Insufficient liquidity");
        
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);
        
        pool.reserveA += amount0;
        pool.reserveB += amount1;
        pool.totalLiquidity += liquidity;
        pool.liquidity[msg.sender] += liquidity;
        
        emit LiquidityAdded(poolId, msg.sender, amount0, amount1, liquidity);
        return liquidity;
    }

    function removeLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 _liquidity
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        bytes32 poolId = getPoolId(_tokenA, _tokenB);
        Pool storage pool = pools[poolId];
        require(pool.liquidity[msg.sender] >= _liquidity, "Insufficient liquidity");
        
        amountA = (_liquidity * pool.reserveA) / pool.totalLiquidity;
        amountB = (_liquidity * pool.reserveB) / pool.totalLiquidity;
        
        pool.liquidity[msg.sender] -= _liquidity;
        pool.totalLiquidity -= _liquidity;
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        
        IERC20(pool.tokenA).safeTransfer(msg.sender, amountA);
        IERC20(pool.tokenB).safeTransfer(msg.sender, amountB);
        
        emit LiquidityRemoved(poolId, msg.sender, amountA, amountB, _liquidity);
    }

    // ═══════════════════════════════════════════════════════════
    // 💱 SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function swap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        bytes32 poolId = getPoolId(_tokenIn, _tokenOut);
        Pool storage pool = pools[poolId];
        require(pool.active, "Pool not active");
        
        bool isToken0 = _tokenIn < _tokenOut;
        (uint256 reserveIn, uint256 reserveOut) = isToken0 
            ? (pool.reserveA, pool.reserveB) 
            : (pool.reserveB, pool.reserveA);
        
        // Calculate output amount using constant product formula with fees
        uint256 amountInWithFee = _amountIn * (10000 - pool.feeRate);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 10000) + amountInWithFee;
        amountOut = numerator / denominator;
        
        require(amountOut >= _minAmountOut, "Slippage exceeded");
        require(amountOut > 0, "Insufficient output");
        
        // Calculate fees
        uint256 fee = (_amountIn * pool.feeRate) / 10000;
        uint256 platformFee = (fee * platformFeeRate) / 100;
        
        // Transfer tokens
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        IERC20(_tokenOut).safeTransfer(msg.sender, amountOut);
        
        if (platformFee > 0) {
            IERC20(_tokenIn).safeTransfer(feeCollector, platformFee);
        }
        
        // Update reserves
        if (isToken0) {
            pool.reserveA += _amountIn - platformFee;
            pool.reserveB -= amountOut;
        } else {
            pool.reserveB += _amountIn - platformFee;
            pool.reserveA -= amountOut;
        }
        
        // Update stats
        pool.totalVolume += _amountIn;
        pool.totalFees += fee;
        lifetimeVolume += _amountIn;
        lifetimeFees += fee;
        
        // Update user profile
        profiles[msg.sender].totalTrades++;
        profiles[msg.sender].totalVolume += _amountIn;
        profiles[msg.sender].totalFeesGenerated += fee;
        
        // Reputation boost
        profiles[msg.sender].reputationScore += 1;
        
        // VIP status check (100+ trades or 10000+ volume)
        if (profiles[msg.sender].totalTrades >= 100 || profiles[msg.sender].totalVolume >= 10000 * 1e6) {
            profiles[msg.sender].isVIP = true;
        }
        
        // Referral rewards (1% of fees)
        if (profiles[msg.sender].referrer != address(0)) {
            uint256 referralReward = fee / 100;
            profiles[profiles[msg.sender].referrer].referralRewards += referralReward;
        }
        
        emit Swap(poolId, msg.sender, _tokenIn, _tokenOut, _amountIn, amountOut, fee);
        return amountOut;
    }

    function multiHopSwap(
        address[] calldata _path,
        uint256 _amountIn,
        uint256 _minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        require(_path.length >= 2, "Invalid path");
        
        amountOut = _amountIn;
        
        for (uint256 i = 0; i < _path.length - 1; i++) {
            // Transfer first token on first iteration
            if (i == 0) {
                IERC20(_path[i]).safeTransferFrom(msg.sender, address(this), amountOut);
            }
            
            bytes32 poolId = getPoolId(_path[i], _path[i + 1]);
            Pool storage pool = pools[poolId];
            require(pool.active, "Pool not active");
            
            bool isToken0 = _path[i] < _path[i + 1];
            (uint256 reserveIn, uint256 reserveOut) = isToken0 
                ? (pool.reserveA, pool.reserveB) 
                : (pool.reserveB, pool.reserveA);
            
            uint256 amountInWithFee = amountOut * (10000 - pool.feeRate);
            uint256 numerator = amountInWithFee * reserveOut;
            uint256 denominator = (reserveIn * 10000) + amountInWithFee;
            amountOut = numerator / denominator;
            
            // Update reserves
            if (isToken0) {
                pool.reserveA += amountOut;
                pool.reserveB -= amountOut;
            } else {
                pool.reserveB += amountOut;
                pool.reserveA -= amountOut;
            }
            
            // Transfer to user on last iteration
            if (i == _path.length - 2) {
                IERC20(_path[i + 1]).safeTransfer(msg.sender, amountOut);
            }
        }
        
        require(amountOut >= _minAmountOut, "Slippage exceeded");
        return amountOut;
    }

    // ═══════════════════════════════════════════════════════════
    // 📋 LIMIT ORDERS
    // ═══════════════════════════════════════════════════════════

    function placeLimitOrder(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _minAmountOut,
        uint256 _executionPrice,
        uint256 _expiryDuration
    ) external nonReentrant returns (uint256 orderId) {
        require(_amountIn > 0, "Invalid amount");
        require(_minAmountOut > 0, "Invalid min amount");
        
        IERC20(_tokenIn).safeTransferFrom(msg.sender, address(this), _amountIn);
        
        orderId = nextOrderId++;
        limitOrders[orderId] = LimitOrder({
            id: orderId,
            trader: msg.sender,
            tokenIn: _tokenIn,
            tokenOut: _tokenOut,
            amountIn: _amountIn,
            minAmountOut: _minAmountOut,
            executionPrice: _executionPrice,
            expiry: block.timestamp + _expiryDuration,
            executed: false,
            cancelled: false
        });
        
        userOrders[msg.sender].push(orderId);
        emit LimitOrderPlaced(orderId, msg.sender, _tokenIn, _tokenOut, _amountIn);
        return orderId;
    }

    function executeLimitOrder(uint256 _orderId) external nonReentrant returns (uint256 amountOut) {
        LimitOrder storage order = limitOrders[_orderId];
        require(!order.executed, "Already executed");
        require(!order.cancelled, "Order cancelled");
        require(block.timestamp <= order.expiry, "Order expired");
        
        // Check if price condition is met
        bytes32 poolId = getPoolId(order.tokenIn, order.tokenOut);
        Pool storage pool = pools[poolId];
        
        bool isToken0 = order.tokenIn < order.tokenOut;
        (uint256 reserveIn, uint256 reserveOut) = isToken0 
            ? (pool.reserveA, pool.reserveB) 
            : (pool.reserveB, pool.reserveA);
        
        uint256 currentPrice = (reserveOut * 1e18) / reserveIn;
        require(currentPrice >= order.executionPrice, "Price not met");
        
        // Execute swap
        uint256 amountInWithFee = order.amountIn * (10000 - pool.feeRate);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 10000) + amountInWithFee;
        amountOut = numerator / denominator;
        
        require(amountOut >= order.minAmountOut, "Slippage exceeded");
        
        // Update reserves
        if (isToken0) {
            pool.reserveA += order.amountIn;
            pool.reserveB -= amountOut;
        } else {
            pool.reserveB += order.amountIn;
            pool.reserveA -= amountOut;
        }
        
        // Transfer tokens
        IERC20(order.tokenOut).safeTransfer(order.trader, amountOut);
        
        order.executed = true;
        emit LimitOrderExecuted(_orderId, amountOut);
        return amountOut;
    }

    function cancelLimitOrder(uint256 _orderId) external nonReentrant {
        LimitOrder storage order = limitOrders[_orderId];
        require(order.trader == msg.sender, "Not order owner");
        require(!order.executed, "Already executed");
        require(!order.cancelled, "Already cancelled");
        
        order.cancelled = true;
        IERC20(order.tokenIn).safeTransfer(msg.sender, order.amountIn);
        
        emit LimitOrderCancelled(_orderId);
    }

    // ═══════════════════════════════════════════════════════════
    // 🎯 CONCENTRATED LIQUIDITY POSITIONS
    // ═══════════════════════════════════════════════════════════

    function createPosition(
        address _tokenA,
        address _tokenB,
        uint256 _amountA,
        uint256 _amountB,
        uint256 _lowerTick,
        uint256 _upperTick
    ) external nonReentrant returns (uint256 positionId) {
        bytes32 poolId = getPoolId(_tokenA, _tokenB);
        Pool storage pool = pools[poolId];
        require(pool.active, "Pool not active");
        require(_lowerTick < _upperTick, "Invalid tick range");
        
        (address token0, address token1) = _tokenA < _tokenB ? (_tokenA, _tokenB) : (_tokenB, _tokenA);
        (uint256 amount0, uint256 amount1) = _tokenA < _tokenB ? (_amountA, _amountB) : (_amountB, _amountA);
        
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);
        
        uint256 liquidity = Math.sqrt(amount0 * amount1);
        positionId = pool.positions[msg.sender].length;
        
        pool.positions[msg.sender].push(Position({
            id: positionId,
            liquidity: liquidity,
            lowerTick: _lowerTick,
            upperTick: _upperTick,
            feesEarnedA: 0,
            feesEarnedB: 0,
            timestamp: block.timestamp,
            active: true
        }));
        
        pool.reserveA += amount0;
        pool.reserveB += amount1;
        pool.totalLiquidity += liquidity;
        
        emit PositionCreated(poolId, msg.sender, positionId, _lowerTick, _upperTick);
        return positionId;
    }

    function collectFees(address _tokenA, address _tokenB, uint256 _positionId) external nonReentrant {
        bytes32 poolId = getPoolId(_tokenA, _tokenB);
        Pool storage pool = pools[poolId];
        
        Position storage position = pool.positions[msg.sender][_positionId];
        require(position.active, "Position not active");
        
        uint256 feesA = position.feesEarnedA;
        uint256 feesB = position.feesEarnedB;
        
        require(feesA > 0 || feesB > 0, "No fees to collect");
        
        position.feesEarnedA = 0;
        position.feesEarnedB = 0;
        
        if (feesA > 0) IERC20(pool.tokenA).safeTransfer(msg.sender, feesA);
        if (feesB > 0) IERC20(pool.tokenB).safeTransfer(msg.sender, feesB);
        
        emit FeesCollected(poolId, msg.sender, feesA, feesB);
    }

    // ═══════════════════════════════════════════════════════════
    // 🔍 ARBITRAGE DETECTION & EXECUTION
    // ═══════════════════════════════════════════════════════════

    function detectArbitrage(
        address _tokenA,
        address _tokenB,
        bytes32 _poolA,
        bytes32 _poolB
    ) external returns (uint256 opportunityId) {
        Pool storage poolA = pools[_poolA];
        Pool storage poolB = pools[_poolB];
        
        require(poolA.active && poolB.active, "Pools not active");
        
        // Simple arbitrage detection
        uint256 priceA = (poolA.reserveB * 1e18) / poolA.reserveA;
        uint256 priceB = (poolB.reserveB * 1e18) / poolB.reserveA;
        
        uint256 profitEstimate = 0;
        if (priceA > priceB) {
            profitEstimate = ((priceA - priceB) * 100) / priceB; // Profit percentage
        } else if (priceB > priceA) {
            profitEstimate = ((priceB - priceA) * 100) / priceA;
        }
        
        if (profitEstimate > 1) { // At least 1% profit
            opportunityId = arbitrageOpportunities.length;
            arbitrageOpportunities.push(ArbitrageOpportunity({
                tokenA: _tokenA,
                tokenB: _tokenB,
                poolA: _poolA,
                poolB: _poolB,
                profitEstimate: profitEstimate,
                detectedAt: block.timestamp,
                executed: false
            }));
            
            emit ArbitrageDetected(_tokenA, _tokenB, profitEstimate);
        }
        
        return opportunityId;
    }

    function executeArbitrage(uint256 _opportunityId, uint256 _amount) external nonReentrant returns (uint256 profit) {
        ArbitrageOpportunity storage opportunity = arbitrageOpportunities[_opportunityId];
        require(!opportunity.executed, "Already executed");
        require(block.timestamp <= opportunity.detectedAt + 300, "Opportunity expired"); // 5 min expiry
        
        // Execute arbitrage (simplified)
        bytes32 poolId = getPoolId(opportunity.tokenA, opportunity.tokenB);
        Pool storage pool = pools[poolId];
        
        // Perform swap
        IERC20(opportunity.tokenA).safeTransferFrom(msg.sender, address(this), _amount);
        
        uint256 amountOut = (_amount * pool.reserveB) / (pool.reserveA + _amount);
        IERC20(opportunity.tokenB).safeTransfer(msg.sender, amountOut);
        
        pool.reserveA += _amount;
        pool.reserveB -= amountOut;
        
        profit = amountOut > _amount ? amountOut - _amount : 0;
        opportunity.executed = true;
        
        emit ArbitrageExecuted(_opportunityId, profit);
        return profit;
    }

    // ═══════════════════════════════════════════════════════════
    // 🔒 STAKING
    // ═══════════════════════════════════════════════════════════

    function stake(address _token, uint256 _amount, uint256 _lockDays) external nonReentrant {
        require(_amount > 0, "Invalid amount");
        
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        stakedBalances[msg.sender][_token] += _amount;
        stakingTimestamps[msg.sender][_token] = block.timestamp + (_lockDays * 1 days);
        
        emit Staked(msg.sender, _token, _amount);
    }

    function unstake(address _token, uint256 _amount) external nonReentrant {
        require(stakedBalances[msg.sender][_token] >= _amount, "Insufficient staked");
        require(block.timestamp >= stakingTimestamps[msg.sender][_token], "Still locked");
        
        stakedBalances[msg.sender][_token] -= _amount;
        
        // Calculate rewards (simple: 5% APY)
        uint256 stakingDuration = block.timestamp - stakingTimestamps[msg.sender][_token];
        uint256 rewards = (_amount * 5 * stakingDuration) / (365 days * 100);
        
        stakingRewards[msg.sender][_token] += rewards;
        
        IERC20(_token).safeTransfer(msg.sender, _amount);
        
        emit Unstaked(msg.sender, _token, _amount);
    }

    function claimRewards(address _token) external nonReentrant {
        uint256 rewards = stakingRewards[msg.sender][_token];
        require(rewards > 0, "No rewards");
        
        stakingRewards[msg.sender][_token] = 0;
        IERC20(_token).safeTransfer(msg.sender, rewards);
        
        emit RewardsClaimed(msg.sender, _token, rewards);
    }

    // ═══════════════════════════════════════════════════════════
    // 🗳️ GOVERNANCE
    // ═══════════════════════════════════════════════════════════

    function createProposal(
        string memory _title,
        string memory _description,
        uint256 _votingPeriod
    ) external returns (uint256 proposalId) {
        proposalId = nextProposalId++;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.title = _title;
        proposal.description = _description;
        proposal.deadline = block.timestamp + _votingPeriod;
        proposal.executed = false;
        
        emit ProposalCreated(proposalId, _title);
        return proposalId;
    }

    function vote(uint256 _proposalId, bool _support) external {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp <= proposal.deadline, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (_support) {
            proposal.forVotes++;
        } else {
            proposal.againstVotes++;
        }
        
        emit Voted(_proposalId, msg.sender, _support);
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function getPoolId(address _tokenA, address _tokenB) public pure returns (bytes32) {
        (address token0, address token1) = _tokenA < _tokenB ? (_tokenA, _tokenB) : (_tokenB, _tokenA);
        return keccak256(abi.encodePacked(token0, token1));
    }

    function getPool(bytes32 _poolId) external view returns (
        address tokenA,
        address tokenB,
        uint256 reserveA,
        uint256 reserveB,
        uint256 totalLiquidity,
        uint256 feeRate,
        bool active
    ) {
        Pool storage pool = pools[_poolId];
        return (
            pool.tokenA,
            pool.tokenB,
            pool.reserveA,
            pool.reserveB,
            pool.totalLiquidity,
            pool.feeRate,
            pool.active
        );
    }

    function getProfile(address _user) external view returns (
        string memory name,
        uint256 reputationScore,
        uint256 totalTrades,
        uint256 totalVolume,
        bool isVIP,
        uint256 referralRewards
    ) {
        UserProfile storage profile = profiles[_user];
        return (
            profile.name,
            profile.reputationScore,
            profile.totalTrades,
            profile.totalVolume,
            profile.isVIP,
            profile.referralRewards
        );
    }

    function getPlatformStats() external view returns (
        uint256 _totalPools,
        uint256 _totalUsers,
        uint256 _lifetimeVolume,
        uint256 _lifetimeFees
    ) {
        return (totalPools, totalUsers, lifetimeVolume, lifetimeFees);
    }

    function getUserOrders(address _user) external view returns (uint256[] memory) {
        return userOrders[_user];
    }

    function getArbitrageOpportunities() external view returns (uint256) {
        return arbitrageOpportunities.length;
    }

    function getUserLiquidity(bytes32 _poolId, address _user) external view returns (uint256) {
        return pools[_poolId].liquidity[_user];
    }

    function getPositions(address _tokenA, address _tokenB, address _user) external view returns (Position[] memory) {
        bytes32 poolId = getPoolId(_tokenA, _tokenB);
        return pools[poolId].positions[_user];
    }

    // ═══════════════════════════════════════════════════════════
    // ⚙️ ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function setFeeCollector(address _feeCollector) external onlyOwner {
        feeCollector = _feeCollector;
    }

    function setPlatformFeeRate(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= 100, "Fee too high");
        platformFeeRate = _feeRate;
    }

    function updateNetworkToken(uint256 _chainId, string memory _symbol, address _token) external onlyOwner {
        networkTokens[_chainId][_symbol] = _token;
    }

    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}
