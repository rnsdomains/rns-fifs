pragma solidity ^0.5.3;

import "./AbstractNamePrice.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/// @title NamePrice contract
/// @author Javier Esses
/// @notice Used to calculate the price in RIF token for a given name and duration
/// @dev Implements AbstractNamePrice interface
contract NamePrice is AbstractNamePrice {
    using SafeMath for uint256;

    /// @author Javi Esses
    /// @notice Calculate name price in RIF token for a given duration
    /// @dev This case is a pure function, but converted to view due the AbstractNamePrice spec
    /// @param duration The duration of the given name ownership in years
    /// @return price in RIF tokens
    function price (string memory /*name*/, uint /*expires*/, uint duration) public view returns(uint) {
        require(duration >=1, "NamePrice: require positive duration");

        if (duration == 1) return 2 * (10**18);
        if (duration == 2) return 4 * (10**18);

        return duration.add(2).mul(10**18);
    }
}
