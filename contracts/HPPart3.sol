// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract HPNFT is ERC721 {
    uint256 public tokenIdCounter;
    mapping(uint256 => string) public tokenURIs;
    mapping(uint256 => uint256) public prices;
    mapping(uint256 => bool) public isListed;
    
    event NFTMinted(address indexed to, uint256 tokenId, string metadata);
    event NFTListed(uint256 indexed tokenId, uint256 price);
    
    constructor() ERC721("HPNFT", "HPNFT") {}
    
    function mint(address to, string memory metadata) public returns (uint256) {
        uint256 tokenId = tokenIdCounter++;
        _safeMint(to, tokenId);
        tokenURIs[tokenId] = metadata;
        emit NFTMinted(to, tokenId, metadata);
        return tokenId;
    }
    
    function listForSale(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        prices[tokenId] = price;
        isListed[tokenId] = true;
        emit NFTListed(tokenId, price);
    }
}

contract HPPart3 {
    address public owner;
    address public nftContract;
    
    struct PerpetualPosition {
        uint256 size;
        uint256 leverage;
        uint256 entryPrice;
        bool isLong;
        uint256 margin;
    }
    mapping(address => mapping(uint256 => PerpetualPosition)) public perpetuals;
    mapping(address => uint256) public perpetualCount;
    mapping(address => uint256) public marginBalance;
    
    struct OptionContract {
        uint256 strike;
        uint256 premium;
        uint256 expiry;
        bool isCall;
        bool exercised;
    }
    mapping(address => mapping(uint256 => OptionContract)) public options;
    mapping(address => uint256) public optionCount;
    
    struct Escrow {
        address seller;
        address buyer;
        address token;
        uint256 amount;
        uint256 deadline;
        bool completed;
        bool refunded;
    }
    mapping(uint256 => Escrow) public escrows;
    uint256 public escrowCounter;
    
    struct LimitOrder {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 targetPrice;
        uint256 deadline;
        bool executed;
    }
    mapping(address => mapping(uint256 => LimitOrder)) public limitOrders;
    mapping(address => uint256) public limitOrderCount;
    
    struct PredictionMarket {
        string question;
        uint256 deadline;
        uint256 yesPool;
        uint256 noPool;
        bool resolved;
        bool outcome;
    }
    mapping(uint256 => PredictionMarket) public predictions;
    mapping(uint256 => mapping(address => uint256)) public predictionBets;
    mapping(uint256 => mapping(address => bool)) public predictionSide;
    uint256 public predictionCounter;
    
    struct Lottery {
        uint256 ticketPrice;
        uint256 deadline;
        uint256 prizePool;
        address[] participants;
        address winner;
        bool drawn;
    }
    mapping(uint256 => Lottery) public lotteries;
    uint256 public lotteryCounter;
    
    event MarginDeposited(address indexed user, uint256 amount);
    event PerpetualOpened(address indexed user, uint256 positionId, bool isLong, uint256 leverage);
    event OptionBought(address indexed user, uint256 optionId, bool isCall, uint256 strike);
    event EscrowCreated(uint256 indexed escrowId, address seller, address buyer);
    event LimitOrderPlaced(address indexed user, uint256 orderId);
    event PredictionMarketCreated(uint256 indexed marketId, string question);
    event PredictionPlaced(uint256 indexed marketId, address indexed user, bool side, uint256 amount);
    event LotteryCreated(uint256 indexed lotteryId, uint256 ticketPrice);
    event LotteryTicketBought(uint256 indexed lotteryId, address indexed buyer);
    event FlashLoanExecuted(address indexed user, address token, uint256 amount);
    
    constructor() {
        owner = msg.sender;
        nftContract = address(new HPNFT());
    }
    
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    
    function depositMargin(uint256 amount, address token) public {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        marginBalance[msg.sender] += amount;
        emit MarginDeposited(msg.sender, amount);
    }
    
    function openPerpetualPosition(bool isLong, uint256 size, uint256 leverage) public {
        uint256 requiredMargin = (size * 10000) / leverage;
        require(marginBalance[msg.sender] >= requiredMargin, "Insufficient");
        uint256 positionId = perpetualCount[msg.sender]++;
        perpetuals[msg.sender][positionId] = PerpetualPosition(size, leverage, 1 ether, isLong, requiredMargin);
        marginBalance[msg.sender] -= requiredMargin;
        emit PerpetualOpened(msg.sender, positionId, isLong, leverage);
    }
    
    function closePerpetualPosition(uint256 positionId) public {
        PerpetualPosition storage position = perpetuals[msg.sender][positionId];
        require(position.size > 0, "Not exists");
        marginBalance[msg.sender] += position.margin;
        delete perpetuals[msg.sender][positionId];
    }
    
    function buyOption(bool isCall, uint256 strike, uint256 premium, uint256 expiry, address token) public {
        IERC20(token).transferFrom(msg.sender, address(this), premium);
        uint256 optionId = optionCount[msg.sender]++;
        options[msg.sender][optionId] = OptionContract(strike, premium, expiry, isCall, false);
        emit OptionBought(msg.sender, optionId, isCall, strike);
    }
    
    function exerciseOption(uint256 optionId, address token) public {
        OptionContract storage option = options[msg.sender][optionId];
        require(!option.exercised, "Exercised");
        require(block.timestamp < option.expiry, "Expired");
        option.exercised = true;
        IERC20(token).transfer(msg.sender, option.strike);
    }
    
    function createEscrow(address buyer, address token, uint256 amount, uint256 deadline) public {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        uint256 escrowId = escrowCounter++;
        escrows[escrowId] = Escrow(msg.sender, buyer, token, amount, deadline, false, false);
        emit EscrowCreated(escrowId, msg.sender, buyer);
    }
    
    function completeEscrow(uint256 escrowId) public {
        Escrow storage escrow = escrows[escrowId];
        require(msg.sender == escrow.buyer, "Not buyer");
        require(!escrow.completed && !escrow.refunded, "Processed");
        escrow.completed = true;
        IERC20(escrow.token).transfer(escrow.seller, escrow.amount);
    }
    
    function placeLimitOrder(address tokenIn, address tokenOut, uint256 amountIn, uint256 targetPrice, uint256 deadline) public {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        uint256 orderId = limitOrderCount[msg.sender]++;
        limitOrders[msg.sender][orderId] = LimitOrder(tokenIn, tokenOut, amountIn, targetPrice, deadline, false);
        emit LimitOrderPlaced(msg.sender, orderId);
    }
    
    function createPredictionMarket(string memory question, uint256 duration) public {
        uint256 marketId = predictionCounter++;
        predictions[marketId] = PredictionMarket(question, block.timestamp + duration, 0, 0, false, false);
        emit PredictionMarketCreated(marketId, question);
    }
    
    function placePrediction(uint256 marketId, bool side, uint256 amount, address token) public {
        PredictionMarket storage market = predictions[marketId];
        require(block.timestamp < market.deadline, "Closed");
        require(!market.resolved, "Resolved");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (side) market.yesPool += amount;
        else market.noPool += amount;
        predictionBets[marketId][msg.sender] += amount;
        predictionSide[marketId][msg.sender] = side;
        emit PredictionPlaced(marketId, msg.sender, side, amount);
    }
    
    function createLottery(uint256 ticketPrice, uint256 duration) public {
        uint256 lotteryId = lotteryCounter++;
        lotteries[lotteryId].ticketPrice = ticketPrice;
        lotteries[lotteryId].deadline = block.timestamp + duration;
        emit LotteryCreated(lotteryId, ticketPrice);
    }
    
    function buyLotteryTicket(uint256 lotteryId, address token) public {
        Lottery storage lottery = lotteries[lotteryId];
        require(block.timestamp < lottery.deadline, "Closed");
        require(!lottery.drawn, "Drawn");
        IERC20(token).transferFrom(msg.sender, address(this), lottery.ticketPrice);
        lottery.participants.push(msg.sender);
        lottery.prizePool += lottery.ticketPrice;
        emit LotteryTicketBought(lotteryId, msg.sender);
    }
    
    function mintNFT(string memory metadata) public {
        HPNFT(nftContract).mint(msg.sender, metadata);
    }
    
    function listNFT(uint256 tokenId, uint256 price) public {
        HPNFT(nftContract).listForSale(tokenId, price);
    }
    
    function flashLoan(address token, uint256 amount) public {
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(msg.sender, amount);
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        require(balanceAfter >= balanceBefore + (amount * 9) / 10000, "Not repaid");
        emit FlashLoanExecuted(msg.sender, token, amount);
    }
}
