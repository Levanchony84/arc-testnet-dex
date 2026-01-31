// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IToken {
    function mint(address to, uint256 amount) external;
}

contract HPPart2 {
    address public owner;
    address public part1Address;
    
    mapping(address => mapping(address => uint256)) public stakes;
    mapping(address => mapping(address => uint256)) public borrows;
    mapping(address => mapping(address => uint256)) public collateral;
    mapping(address => uint256) public farmingRewards;
    mapping(address => uint256) public yieldBalance;
    mapping(string => uint256) public proposals;
    mapping(string => mapping(address => bool)) public votes;
    mapping(address => bool) public autoCompoundEnabled;
    mapping(address => address) public referrers;
    
    event Staked(address indexed user, address token, uint256 amount);
    event Unstaked(address indexed user, address token, uint256 amount);
    event Borrowed(address indexed user, address token, uint256 amount);
    event Repaid(address indexed user, address token, uint256 amount);
    event CollateralDeposited(address indexed user, address token, uint256 amount);
    event CollateralWithdrawn(address indexed user, address token, uint256 amount);
    event YieldClaimed(address indexed user, uint256 amount);
    event YieldFarmed(address indexed user, uint256 amount);
    event ProposalCreated(string proposalId, string description);
    event Voted(string proposalId, address indexed voter, bool support);
    event AutoCompoundEnabled(address indexed user);
    event AutoCompounded(address indexed user, uint256 amount);
    event ReferrerSet(address indexed user, address indexed referrer);
    event ZappedIn(address indexed user, address token, uint256 amount);
    
    constructor(address _part1Address) {
        owner = msg.sender;
        part1Address = _part1Address;
    }
    
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    
    function stake(address token, uint256 amount) public {
        require(amount > 0, "Zero");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        stakes[msg.sender][token] += amount;
        emit Staked(msg.sender, token, amount);
    }
    
    function unstake(address token, uint256 amount) public {
        require(stakes[msg.sender][token] >= amount, "Insufficient");
        stakes[msg.sender][token] -= amount;
        IERC20(token).transfer(msg.sender, amount);
        emit Unstaked(msg.sender, token, amount);
    }
    
    function stakingReward(address user, address token) public view returns (uint256) {
        return (stakes[user][token] * 5) / 100;
    }
    
    function claimStakingReward(address token) public {
        uint256 reward = stakingReward(msg.sender, token);
        if (reward > 0) {
            IToken(token).mint(msg.sender, reward);
        }
    }
    
    function depositCollateral(address token, uint256 amount) public {
        require(amount > 0, "Zero");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        collateral[msg.sender][token] += amount;
        emit CollateralDeposited(msg.sender, token, amount);
    }
    
    function withdrawCollateral(address token, uint256 amount) public {
        require(collateral[msg.sender][token] >= amount, "Insufficient");
        require(isSafeToWithdraw(msg.sender, token, amount), "Unsafe");
        collateral[msg.sender][token] -= amount;
        IERC20(token).transfer(msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, token, amount);
    }
    
    function borrow(address token, uint256 amount) public {
        require(amount > 0, "Zero");
        uint256 requiredCollateral = (amount * 150) / 100;
        require(collateral[msg.sender][token] >= requiredCollateral, "Insufficient collateral");
        borrows[msg.sender][token] += amount;
        IToken(token).mint(msg.sender, amount);
        emit Borrowed(msg.sender, token, amount);
    }
    
    function repay(address token, uint256 amount) public {
        require(borrows[msg.sender][token] >= amount, "Over-repay");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        borrows[msg.sender][token] -= amount;
        emit Repaid(msg.sender, token, amount);
    }
    
    function isSafeToWithdraw(address user, address token, uint256 amount) public view returns (bool) {
        uint256 remainingCollateral = collateral[user][token] - amount;
        uint256 borrowed = borrows[user][token];
        return remainingCollateral >= (borrowed * 150) / 100;
    }
    
    function optimizeYield(address token, uint256 amount) public {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        farmingRewards[msg.sender] += (amount * 10) / 100;
        yieldBalance[msg.sender] += amount;
        emit YieldFarmed(msg.sender, amount);
    }
    
    function claimYield() public {
        uint256 reward = farmingRewards[msg.sender];
        require(reward > 0, "No yield");
        farmingRewards[msg.sender] = 0;
        emit YieldClaimed(msg.sender, reward);
    }
    
    function enableAutoCompound() public {
        autoCompoundEnabled[msg.sender] = true;
        emit AutoCompoundEnabled(msg.sender);
    }
    
    function autoCompound() public {
        require(autoCompoundEnabled[msg.sender], "Not enabled");
        uint256 reward = farmingRewards[msg.sender];
        if (reward > 0) {
            farmingRewards[msg.sender] = 0;
            yieldBalance[msg.sender] += reward;
            emit AutoCompounded(msg.sender, reward);
        }
    }
    
    function createProposal(string memory proposalId, string memory description, uint256 duration) public {
        proposals[proposalId] = block.timestamp + duration;
        emit ProposalCreated(proposalId, description);
    }
    
    function vote(string memory proposalId, bool support) public {
        require(proposals[proposalId] > block.timestamp, "Expired");
        require(!votes[proposalId][msg.sender], "Voted");
        votes[proposalId][msg.sender] = support;
        emit Voted(proposalId, msg.sender, support);
    }
    
    function setReferrer(address referrer) public {
        require(referrers[msg.sender] == address(0), "Set");
        require(referrer != msg.sender, "Self");
        referrers[msg.sender] = referrer;
        emit ReferrerSet(msg.sender, referrer);
    }
    
    function zapIn(address token, uint256 amount, address tokenA, address tokenB) public {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        emit ZappedIn(msg.sender, token, amount);
    }
    
    function getStake(address user, address token) public view returns (uint256) {
        return stakes[user][token];
    }
    
    function getBorrow(address user, address token) public view returns (uint256) {
        return borrows[user][token];
    }
    
    function getCollateral(address user, address token) public view returns (uint256) {
        return collateral[user][token];
    }
    
    // ADDED: getUserStats function
    function getUserStats(address user) public view returns (uint256, uint256, uint256, uint256, uint256) {
        uint256 totalStaked = 0;
        uint256 totalBorrowed = 0;
        uint256 totalCollat = 0;
        // Note: We can't easily aggregate across all tokens without tracking them
        // So we return 0s for now - this matches the interface expected by interact script
        return (totalStaked, totalBorrowed, totalCollat, 0, 0);
    }
}
