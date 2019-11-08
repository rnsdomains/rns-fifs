pragma solidity ^0.5.3;

import "./AbstractNamePrice.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract PricedContract is Ownable {
    AbstractNamePrice public namePrice;

    event NamePriceChanged(AbstractNamePrice contractAddress);

    constructor(AbstractNamePrice _namePrice) public Ownable() {
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