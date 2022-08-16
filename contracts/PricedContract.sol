// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AbstractNamePrice.sol";

contract PricedContract is Ownable {
    AbstractNamePrice public namePrice;

    event NamePriceChanged(AbstractNamePrice contractAddress);

    constructor(AbstractNamePrice _namePrice) {
        namePrice = _namePrice;
    }

    /// @notice Change price contract
    /// @dev Only owner
    /// @param newNamePrice The new maturity required
    function setNamePrice(AbstractNamePrice newNamePrice) external onlyOwner {
        namePrice = newNamePrice;
        emit NamePriceChanged(newNamePrice);
    }

    /// @notice Price of a name in RIF
    /// @param duration Time to register the name
    /// @return cost in RIF
    function price (string memory name, uint expires, uint duration) public view returns(uint) {
        return namePrice.price(name, expires, duration);
    }
}
