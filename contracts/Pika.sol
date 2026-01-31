// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Pika is ERC721, ERC721Enumerable, Ownable {
    IERC20 public usdc;
    uint256 public mintFee = 1 * 10**6; // 1 USDC (6 decimals)
    uint256 private _tokenIdCounter;

    // Staking mapping
    mapping(uint256 => address) public stakedOwners;
    mapping(address => uint256[]) public stakedTokens;

    constructor(string memory name_, string memory symbol_, address usdcAddress) ERC721(name_, symbol_) Ownable(msg.sender) {
        usdc = IERC20(usdcAddress);
    }

    function mint(uint256 quantity) public {
        require(quantity > 0, "Quantity must be positive");
        uint256 totalFee = mintFee * quantity;
        usdc.transferFrom(msg.sender, address(this), totalFee);
        for (uint256 i = 0; i < quantity; i++) {
            _tokenIdCounter++;
            _safeMint(msg.sender, _tokenIdCounter);
        }
    }

    function safeMint(address to) public {
        usdc.transferFrom(msg.sender, address(this), mintFee);
        _tokenIdCounter++;
        _safeMint(to, _tokenIdCounter);
    }

    function burn(uint256 tokenId) public {
        _requireOwned(tokenId);
        _burn(tokenId);
    }

    function stake(uint256 tokenId) public {
        _requireOwned(tokenId);
        approve(address(this), tokenId);
        safeTransferFrom(msg.sender, address(this), tokenId);
        stakedOwners[tokenId] = msg.sender;
        stakedTokens[msg.sender].push(tokenId);
    }

    function stakeMultiple(uint256[] calldata tokenIds) public {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            stake(tokenIds[i]);
        }
    }

    function unstake(uint256 tokenId) public {
        require(stakedOwners[tokenId] == msg.sender, "Not staked owner");
        _transfer(address(this), msg.sender, tokenId);
        delete stakedOwners[tokenId];
        for (uint256 i = 0; i < stakedTokens[msg.sender].length; i++) {
            if (stakedTokens[msg.sender][i] == tokenId) {
                stakedTokens[msg.sender][i] = stakedTokens[msg.sender][stakedTokens[msg.sender].length - 1];
                stakedTokens[msg.sender].pop();
                break;
            }
        }
    }

    function unstakeMultiple(uint256[] calldata tokenIds) public {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            unstake(tokenIds[i]);
        }
    }

    function claimRewards() public {
        // Dummy rewards logic, can be expanded
    }

    function claimAllRewards() public {
        // Dummy all rewards, can be expanded
        claimRewards();
    }

    function claimRewardsForToken(uint256 tokenId) public {
        require(stakedOwners[tokenId] == msg.sender, "Not staked owner");
        // Dummy reward for token
    }

    function withdrawUSDC(uint256 amount) public onlyOwner {
        usdc.transfer(owner(), amount);
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}