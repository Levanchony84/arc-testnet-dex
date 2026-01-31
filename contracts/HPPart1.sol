// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Token is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract HPPart1 {
    address public owner;
    address public USDC = 0x3600000000000000000000000000000000000000;
    address public EURC = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;
    address public TCL;
    address public Samsung;
    address public LG;
    
    bool public paused;
    uint256 public txCounter;
    
    mapping(address => mapping(address => mapping(address => uint256))) public liquidityPools;
    mapping(address => mapping(address => uint256)) public reserves;
    mapping(address => mapping(address => address)) public lpTokens;
    mapping(address => mapping(address => uint256)) public lpBalances;
    
    struct UserStats {
        uint256 totalStaked;
        uint256 totalBorrowed;
        uint256 totalCollateral;
        uint256 totalLPBalance;
        uint256 creditScore;
    }
    mapping(address => UserStats) public userStats;
    
    event Swapped(address indexed user, address fromToken, address toToken, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(address indexed user, address tokenA, address tokenB, uint256 amountA, uint256 amountB);
    event LiquidityRemoved(address indexed user, address tokenA, address tokenB, uint256 liquidity);
    event MultiHopSwapped(address indexed user, address[] path, uint256 amountIn);
    
    constructor() {
        owner = msg.sender;
        TCL = address(new Token("TCL Token", "TCL", 1000000));
        Samsung = address(new Token("Samsung Token", "SAM", 1000000));
        LG = address(new Token("LG Token", "LG", 1000000));
    }
    
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    modifier notPaused() { require(!paused, "Paused"); _; }
    
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) public notPaused {
        require(amountIn > 0, "Zero");
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        uint256 amountOut = getSwapAmount(tokenIn, tokenOut, amountIn);
        require(amountOut >= minAmountOut, "Slippage");
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        txCounter++;
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
    
    function getSwapAmount(address tokenIn, address tokenOut, uint256 amountIn) public view returns (uint256) {
        uint256 reserveIn = reserves[tokenIn][tokenOut];
        uint256 reserveOut = reserves[tokenOut][tokenIn];
        if (reserveIn == 0 || reserveOut == 0) return amountIn;
        return (amountIn * 997 * reserveOut) / ((reserveIn * 1000) + (amountIn * 997));
    }
    
    function multiHopSwap(address[] memory path, uint256 amountIn, uint256 minAmountOut) public notPaused {
        require(path.length >= 2, "Invalid");
        uint256 currentAmount = amountIn;
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        for (uint256 i = 0; i < path.length - 1; i++) {
            currentAmount = getSwapAmount(path[i], path[i + 1], currentAmount);
        }
        require(currentAmount >= minAmountOut, "Slippage");
        IERC20(path[path.length - 1]).transfer(msg.sender, currentAmount);
        txCounter++;
        emit MultiHopSwapped(msg.sender, path, amountIn);
    }
    
    function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) public notPaused {
        require(amountA > 0 && amountB > 0, "Zero");
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
        liquidityPools[msg.sender][tokenA][tokenB] += amountA + amountB;
        reserves[tokenA][tokenB] += amountA;
        reserves[tokenB][tokenA] += amountB;
        address lpToken = lpTokens[tokenA][tokenB];
        if (lpToken == address(0)) {
            lpToken = address(new Token("LP", "LP", 0));
            lpTokens[tokenA][tokenB] = lpToken;
        }
        uint256 lpAmount = amountA + amountB;
        Token(lpToken).mint(msg.sender, lpAmount);
        lpBalances[msg.sender][lpToken] += lpAmount;
        userStats[msg.sender].totalLPBalance += lpAmount;
        txCounter++;
        emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA, amountB);
    }
    
    function removeLiquidity(address tokenA, address tokenB, uint256 liquidity) public {
        require(liquidityPools[msg.sender][tokenA][tokenB] >= liquidity, "Insufficient");
        uint256 amountA = liquidity / 2;
        uint256 amountB = liquidity / 2;
        IERC20(tokenA).transfer(msg.sender, amountA);
        IERC20(tokenB).transfer(msg.sender, amountB);
        liquidityPools[msg.sender][tokenA][tokenB] -= liquidity;
        reserves[tokenA][tokenB] -= amountA;
        reserves[tokenB][tokenA] -= amountB;
        address lpToken = lpTokens[tokenA][tokenB];
        if (lpToken != address(0)) lpBalances[msg.sender][lpToken] -= liquidity;
        userStats[msg.sender].totalLPBalance -= liquidity;
        txCounter++;
        emit LiquidityRemoved(msg.sender, tokenA, tokenB, liquidity);
    }
    
    // ADDED: getLPToken function to retrieve LP token address for a pair
    function getLPToken(address tokenA, address tokenB) public view returns (address) {
        return lpTokens[tokenA][tokenB];
    }
    
    function getUserStats(address user) public view returns (uint256, uint256, uint256, uint256, uint256) {
        UserStats memory stats = userStats[user];
        return (stats.totalStaked, stats.totalBorrowed, stats.totalCollateral, stats.totalLPBalance, stats.creditScore);
    }
    
    function pause() public onlyOwner { paused = true; }
    function unpause() public onlyOwner { paused = false; }
    function mintTokens(address token, address to, uint256 amount) public onlyOwner { Token(token).mint(to, amount); }
}
