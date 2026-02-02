// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ArcToken
 * @dev Test token for Arc Ultimate system
 * Supports both 6 decimals (USDC/EURC) and 18 decimals (ARC)
 */
contract ArcToken is ERC20 {
    uint8 private _decimals;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _decimals = bytes(symbol).length == 3 ? 6 : 18; // USDC/EURC = 6, others = 18
        _mint(msg.sender, initialSupply);
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
