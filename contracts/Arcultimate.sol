// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ArcUltimate
 * @dev უდედისმტყვნელესი DEX + NFT Marketplace + GameFi + DAO
 * 
 * ფუნქციები:
 * - NFT Minting & Trading with DeFi integration
 * - NFT Staking for yield
 * - NFT Fractionalization (NFT → Tokens)
 * - NFT Lottery & Auctions
 * - Dynamic NFT rarity & leveling
 * - Liquidity pools with NFT rewards
 * - Cross-NFT swaps
 * - Governance with NFT voting power
 * - Achievement system
 * - Referral rewards
 */
contract ArcUltimate is ERC721Enumerable, Ownable, ReentrancyGuard {
    
    // ═══════════════════════════════════════════════════════════
    // State Variables
    // ═══════════════════════════════════════════════════════════
    
    uint256 private _tokenIdCounter;
    uint256 public platformFee = 250; // 2.5%
    
    // NFT Metadata
    struct NFT {
        string name;
        string metadata;
        uint256 price;
        uint256 royalty; // basis points (500 = 5%)
        address creator;
        string rarity; // Common, Rare, Epic, Legendary, Mythic
        uint256 level;
        uint256 experience;
        uint256 mintedAt;
        bool isListed;
        bool isFractionalized;
    }
    
    // NFT Staking
    struct StakeInfo {
        uint256 tokenId;
        uint256 stakedAt;
        uint256 lockDuration;
        uint256 rewards;
    }
    
    // Liquidity Pool
    struct Pool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalShares;
        uint256 feeRate;
        bool active;
    }
    
    // User Profile
    struct Profile {
        string name;
        uint256 reputation;
        uint256 totalTrades;
        uint256 totalVolume;
        bool verified;
        bool vipStatus;
        uint256 nftsMinted;
        uint256 nftsOwned;
        uint256 achievementScore;
        address referrer;
    }
    
    // Auction
    struct Auction {
        uint256 tokenId;
        address seller;
        uint256 startPrice;
        uint256 currentBid;
        address highestBidder;
        uint256 endTime;
        bool active;
    }
    
    // Lottery
    struct Lottery {
        uint256 prizePool;
        uint256 ticketPrice;
        uint256 endTime;
        address[] participants;
        address winner;
        bool active;
    }
    
    // Governance Proposal
    struct Proposal {
        string title;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 endTime;
        bool executed;
        mapping(address => bool) hasVoted;
    }
    
    // Achievements
    enum Achievement {
        FIRST_NFT,
        COLLECTOR_10,
        COLLECTOR_50,
        TRADER_100,
        LIQUIDITY_KING,
        STAKING_MASTER,
        GOVERNANCE_ACTIVE,
        REFERRAL_CHAMPION
    }
    
    // Mappings
    mapping(uint256 => NFT) public nfts;
    mapping(uint256 => address) public listings;
    mapping(address => Profile) public profiles;
    mapping(address => mapping(uint256 => StakeInfo)) public stakes;
    mapping(address => mapping(address => Pool)) public pools;
    mapping(bytes32 => address) public lpTokens;
    mapping(address => mapping(address => uint256)) public userShares;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => Lottery) public lotteries;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(Achievement => bool)) public achievements;
    mapping(address => uint256) public referralRewards;
    mapping(uint256 => mapping(address => uint256)) public fractionBalances;
    
    uint256 public auctionCounter;
    uint256 public lotteryCounter;
    uint256 public proposalCounter;
    
    // Events
    event ProfileCreated(address indexed user, string name);
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string name, string rarity);
    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event NFTStaked(address indexed user, uint256 indexed tokenId, uint256 lockDuration);
    event NFTUnstaked(address indexed user, uint256 indexed tokenId, uint256 rewards);
    event NFTLevelUp(uint256 indexed tokenId, uint256 newLevel);
    event NFTFractionalized(uint256 indexed tokenId, uint256 shares);
    event PoolCreated(address indexed tokenA, address indexed tokenB);
    event LiquidityAdded(address indexed user, address tokenA, address tokenB, uint256 amountA, uint256 amountB);
    event Swapped(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event AuctionCreated(uint256 indexed auctionId, uint256 indexed tokenId, uint256 startPrice);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event LotteryCreated(uint256 indexed lotteryId, uint256 ticketPrice);
    event LotteryWon(uint256 indexed lotteryId, address indexed winner, uint256 prize);
    event ProposalCreated(uint256 indexed proposalId, string title);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support);
    event AchievementUnlocked(address indexed user, Achievement achievement);
    event ReferralRewarded(address indexed referrer, address indexed referred, uint256 reward);
    
    // ═══════════════════════════════════════════════════════════
    // Constructor
    // ═══════════════════════════════════════════════════════════
    
    constructor() ERC721("Arc Ultimate NFT", "ARCNFT") Ownable(msg.sender) {
        _tokenIdCounter = 1;
    }
    
    // ═══════════════════════════════════════════════════════════
    // Profile Functions
    // ═══════════════════════════════════════════════════════════
    
    function createProfile(string memory _name) external {
        require(bytes(profiles[msg.sender].name).length == 0, "Profile exists");
        
        profiles[msg.sender] = Profile({
            name: _name,
            reputation: 100,
            totalTrades: 0,
            totalVolume: 0,
            verified: false,
            vipStatus: false,
            nftsMinted: 0,
            nftsOwned: 0,
            achievementScore: 0,
            referrer: address(0)
        });
        
        emit ProfileCreated(msg.sender, _name);
    }
    
    function setReferrer(address _referrer) external {
        require(_referrer != msg.sender, "Cannot refer yourself");
        require(profiles[msg.sender].referrer == address(0), "Referrer already set");
        
        profiles[msg.sender].referrer = _referrer;
    }
    
    // ═══════════════════════════════════════════════════════════
    // NFT Core Functions
    // ═══════════════════════════════════════════════════════════
    
    function mintNFT(
        string memory _name,
        string memory _metadata,
        uint256 _price,
        uint256 _royalty,
        string memory _rarity
    ) external returns (uint256) {
        require(_royalty <= 1000, "Royalty too high"); // Max 10%
        
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);
        
        nfts[tokenId] = NFT({
            name: _name,
            metadata: _metadata,
            price: _price,
            royalty: _royalty,
            creator: msg.sender,
            rarity: _rarity,
            level: 1,
            experience: 0,
            mintedAt: block.timestamp,
            isListed: false,
            isFractionalized: false
        });
        
        profiles[msg.sender].nftsMinted++;
        profiles[msg.sender].nftsOwned++;
        
        // Check achievements
        _checkAchievement(msg.sender, Achievement.FIRST_NFT);
        if (profiles[msg.sender].nftsMinted >= 10) {
            _checkAchievement(msg.sender, Achievement.COLLECTOR_10);
        }
        
        emit NFTMinted(tokenId, msg.sender, _name, _rarity);
        return tokenId;
    }
    
    function listNFT(uint256 _tokenId, uint256 _price) external {
        require(ownerOf(_tokenId) == msg.sender, "Not owner");
        require(!nfts[_tokenId].isListed, "Already listed");
        
        nfts[_tokenId].price = _price;
        nfts[_tokenId].isListed = true;
        listings[_tokenId] = msg.sender;
        
        emit NFTListed(_tokenId, _price);
    }
    
    function buyNFT(uint256 _tokenId, address _paymentToken) external payable nonReentrant {
        require(nfts[_tokenId].isListed, "Not for sale");
        
        NFT memory nft = nfts[_tokenId];
        address seller = listings[_tokenId];
        uint256 price = nft.price;
        
        // Calculate fees
        uint256 platformCut = (price * platformFee) / 10000;
        uint256 royaltyCut = (price * nft.royalty) / 10000;
        uint256 sellerAmount = price - platformCut - royaltyCut;
        
        // Process payment
        if (_paymentToken == address(0)) {
            require(msg.value >= price, "Insufficient payment");
            
            payable(seller).transfer(sellerAmount);
            payable(nft.creator).transfer(royaltyCut);
            payable(owner()).transfer(platformCut);
            
        } else {
            IERC20(_paymentToken).transferFrom(msg.sender, seller, sellerAmount);
            IERC20(_paymentToken).transferFrom(msg.sender, nft.creator, royaltyCut);
            IERC20(_paymentToken).transferFrom(msg.sender, owner(), platformCut);
        }
        
        // Transfer NFT
        _transfer(seller, msg.sender, _tokenId);
        
        nfts[_tokenId].isListed = false;
        delete listings[_tokenId];
        
        // Update profiles
        profiles[seller].totalTrades++;
        profiles[msg.sender].totalTrades++;
        profiles[seller].totalVolume += price;
        profiles[msg.sender].totalVolume += price;
        profiles[msg.sender].nftsOwned++;
        
        // Referral reward
        if (profiles[msg.sender].referrer != address(0)) {
            uint256 referralReward = platformCut / 2;
            referralRewards[profiles[msg.sender].referrer] += referralReward;
            emit ReferralRewarded(profiles[msg.sender].referrer, msg.sender, referralReward);
        }
        
        // Check achievements
        if (profiles[msg.sender].totalTrades >= 100) {
            _checkAchievement(msg.sender, Achievement.TRADER_100);
        }
        
        emit NFTSold(_tokenId, seller, msg.sender, price);
    }
    
    // ═══════════════════════════════════════════════════════════
    // NFT Staking & Leveling
    // ═══════════════════════════════════════════════════════════
    
    function stakeNFT(uint256 _tokenId, uint256 _lockDays) external {
        require(ownerOf(_tokenId) == msg.sender, "Not owner");
        require(stakes[msg.sender][_tokenId].stakedAt == 0, "Already staked");
        
        stakes[msg.sender][_tokenId] = StakeInfo({
            tokenId: _tokenId,
            stakedAt: block.timestamp,
            lockDuration: _lockDays * 1 days,
            rewards: 0
        });
        
        emit NFTStaked(msg.sender, _tokenId, _lockDays);
        _checkAchievement(msg.sender, Achievement.STAKING_MASTER);
    }
    
    function unstakeNFT(uint256 _tokenId) external {
        StakeInfo storage stakeInfo = stakes[msg.sender][_tokenId];
        require(stakeInfo.stakedAt > 0, "Not staked");
        require(block.timestamp >= stakeInfo.stakedAt + stakeInfo.lockDuration, "Still locked");
        
        // Calculate rewards (simple: 1 per day)
        uint256 daysStaked = (block.timestamp - stakeInfo.stakedAt) / 1 days;
        uint256 rewards = daysStaked * 1e18;
        
        // Add experience
        nfts[_tokenId].experience += daysStaked * 10;
        _checkLevelUp(_tokenId);
        
        delete stakes[msg.sender][_tokenId];
        
        emit NFTUnstaked(msg.sender, _tokenId, rewards);
    }
    
    function _checkLevelUp(uint256 _tokenId) private {
        NFT storage nft = nfts[_tokenId];
        uint256 requiredExp = nft.level * 100;
        
        if (nft.experience >= requiredExp) {
            nft.level++;
            nft.experience -= requiredExp;
            emit NFTLevelUp(_tokenId, nft.level);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // NFT Fractionalization
    // ═══════════════════════════════════════════════════════════
    
    function fractionalizeNFT(uint256 _tokenId, uint256 _shares) external {
        require(ownerOf(_tokenId) == msg.sender, "Not owner");
        require(!nfts[_tokenId].isFractionalized, "Already fractionalized");
        require(_shares >= 100 && _shares <= 10000, "Invalid shares");
        
        nfts[_tokenId].isFractionalized = true;
        fractionBalances[_tokenId][msg.sender] = _shares;
        
        emit NFTFractionalized(_tokenId, _shares);
    }
    
    function buyFraction(uint256 _tokenId, uint256 _amount, address _paymentToken) external payable {
        require(nfts[_tokenId].isFractionalized, "Not fractionalized");
        // Implementation: Transfer fraction tokens
    }
    
    // ═══════════════════════════════════════════════════════════
    // DEX Functions (Liquidity Pools & Swaps)
    // ═══════════════════════════════════════════════════════════
    
    function createPool(address _tokenA, address _tokenB) external {
        require(_tokenA != _tokenB, "Same token");
        require(pools[_tokenA][_tokenB].tokenA == address(0), "Pool exists");
        
        pools[_tokenA][_tokenB] = Pool({
            tokenA: _tokenA,
            tokenB: _tokenB,
            reserveA: 0,
            reserveB: 0,
            totalShares: 0,
            feeRate: 30, // 0.3%
            active: true
        });
        
        emit PoolCreated(_tokenA, _tokenB);
    }
    
    function addLiquidity(
        address _tokenA,
        address _tokenB,
        uint256 _amountA,
        uint256 _amountB
    ) external nonReentrant {
        Pool storage pool = pools[_tokenA][_tokenB];
        require(pool.active, "Pool not active");
        
        IERC20(_tokenA).transferFrom(msg.sender, address(this), _amountA);
        IERC20(_tokenB).transferFrom(msg.sender, address(this), _amountB);
        
        uint256 shares;
        if (pool.totalShares == 0) {
            shares = _sqrt(_amountA * _amountB);
        } else {
            shares = _min(
                (_amountA * pool.totalShares) / pool.reserveA,
                (_amountB * pool.totalShares) / pool.reserveB
            );
        }
        
        pool.reserveA += _amountA;
        pool.reserveB += _amountB;
        pool.totalShares += shares;
        userShares[msg.sender][_tokenA] += shares;
        
        emit LiquidityAdded(msg.sender, _tokenA, _tokenB, _amountA, _amountB);
        _checkAchievement(msg.sender, Achievement.LIQUIDITY_KING);
    }
    
    function swap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _minOut
    ) external nonReentrant returns (uint256) {
        Pool storage pool = pools[_tokenIn][_tokenOut];
        require(pool.active, "Pool not active");
        
        uint256 amountInWithFee = (_amountIn * (10000 - pool.feeRate)) / 10000;
        uint256 amountOut = (amountInWithFee * pool.reserveB) / (pool.reserveA + amountInWithFee);
        
        require(amountOut >= _minOut, "Slippage too high");
        
        IERC20(_tokenIn).transferFrom(msg.sender, address(this), _amountIn);
        IERC20(_tokenOut).transfer(msg.sender, amountOut);
        
        pool.reserveA += _amountIn;
        pool.reserveB -= amountOut;
        
        profiles[msg.sender].totalTrades++;
        profiles[msg.sender].totalVolume += _amountIn;
        
        emit Swapped(msg.sender, _tokenIn, _tokenOut, _amountIn, amountOut);
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════
    // Auction System
    // ═══════════════════════════════════════════════════════════
    
    function createAuction(uint256 _tokenId, uint256 _startPrice, uint256 _duration) external {
        require(ownerOf(_tokenId) == msg.sender, "Not owner");
        
        uint256 auctionId = auctionCounter++;
        
        auctions[auctionId] = Auction({
            tokenId: _tokenId,
            seller: msg.sender,
            startPrice: _startPrice,
            currentBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + _duration,
            active: true
        });
        
        emit AuctionCreated(auctionId, _tokenId, _startPrice);
    }
    
    function placeBid(uint256 _auctionId) external payable {
        Auction storage auction = auctions[_auctionId];
        require(auction.active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value > auction.currentBid, "Bid too low");
        
        // Refund previous bidder
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.currentBid);
        }
        
        auction.currentBid = msg.value;
        auction.highestBidder = msg.sender;
        
        emit BidPlaced(_auctionId, msg.sender, msg.value);
    }
    
    function endAuction(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp >= auction.endTime, "Auction ongoing");
        require(auction.active, "Already ended");
        
        auction.active = false;
        
        if (auction.highestBidder != address(0)) {
            _transfer(auction.seller, auction.highestBidder, auction.tokenId);
            payable(auction.seller).transfer(auction.currentBid);
            
            emit AuctionEnded(_auctionId, auction.highestBidder, auction.currentBid);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // Lottery System
    // ═══════════════════════════════════════════════════════════
    
    function createLottery(uint256 _ticketPrice, uint256 _duration) external {
        uint256 lotteryId = lotteryCounter++;
        
        lotteries[lotteryId].ticketPrice = _ticketPrice;
        lotteries[lotteryId].endTime = block.timestamp + _duration;
        lotteries[lotteryId].active = true;
        
        emit LotteryCreated(lotteryId, _ticketPrice);
    }
    
    function buyLotteryTicket(uint256 _lotteryId) external payable {
        Lottery storage lottery = lotteries[_lotteryId];
        require(lottery.active, "Lottery not active");
        require(msg.value >= lottery.ticketPrice, "Insufficient payment");
        
        lottery.participants.push(msg.sender);
        lottery.prizePool += msg.value;
    }
    
    function drawLottery(uint256 _lotteryId) external {
        Lottery storage lottery = lotteries[_lotteryId];
        require(block.timestamp >= lottery.endTime, "Lottery ongoing");
        require(lottery.active, "Already drawn");
        require(lottery.participants.length > 0, "No participants");
        
        lottery.active = false;
        
        uint256 winnerIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % lottery.participants.length;
        lottery.winner = lottery.participants[winnerIndex];
        
        payable(lottery.winner).transfer(lottery.prizePool);
        
        emit LotteryWon(_lotteryId, lottery.winner, lottery.prizePool);
    }
    
    // ═══════════════════════════════════════════════════════════
    // Governance (DAO)
    // ═══════════════════════════════════════════════════════════
    
    function createProposal(string memory _title, string memory _description, uint256 _votingPeriod) external {
        uint256 proposalId = proposalCounter++;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.title = _title;
        proposal.description = _description;
        proposal.endTime = block.timestamp + _votingPeriod;
        
        emit ProposalCreated(proposalId, _title);
    }
    
    function vote(uint256 _proposalId, bool _support) external {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp < proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        // Voting power = NFTs owned
        uint256 votingPower = balanceOf(msg.sender);
        require(votingPower > 0, "No voting power");
        
        if (_support) {
            proposal.votesFor += votingPower;
        } else {
            proposal.votesAgainst += votingPower;
        }
        
        proposal.hasVoted[msg.sender] = true;
        
        emit Voted(_proposalId, msg.sender, _support);
        _checkAchievement(msg.sender, Achievement.GOVERNANCE_ACTIVE);
    }
    
    // ═══════════════════════════════════════════════════════════
    // Achievement System
    // ═══════════════════════════════════════════════════════════
    
    function _checkAchievement(address _user, Achievement _achievement) private {
        if (!achievements[_user][_achievement]) {
            achievements[_user][_achievement] = true;
            profiles[_user].achievementScore += 100;
            emit AchievementUnlocked(_user, _achievement);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // View Functions
    // ═══════════════════════════════════════════════════════════
    
    function getProfile(address _user) external view returns (
        string memory name,
        uint256 reputation,
        uint256 totalTrades,
        uint256 totalVolume,
        bool verified,
        bool vipStatus
    ) {
        Profile memory profile = profiles[_user];
        return (profile.name, profile.reputation, profile.totalTrades, profile.totalVolume, profile.verified, profile.vipStatus);
    }
    
    function getNFTInfo(uint256 _tokenId) external view returns (NFT memory) {
        return nfts[_tokenId];
    }
    
    function getUserNFTs(address _user) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(_user);
        uint256[] memory tokenIds = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_user, i);
        }
        
        return tokenIds;
    }
    
    // ═══════════════════════════════════════════════════════════
    // Utility Functions
    // ═══════════════════════════════════════════════════════════
    
    function _sqrt(uint256 x) private pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
    
    // Admin functions
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Fee too high");
        platformFee = _fee;
    }
    
    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
