// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "./AbstractNamePrice.sol";

/// @title NamePrice contract
/// @author Javier Esses
/// @notice Used to calculate the price in RIF token for a given name and duration
/// @dev Implements AbstractNamePrice interface
contract NamePrice is AbstractNamePrice {
    
    /// @notice Calculate name price in RIF token for a given duration
    /// @dev Is a pure function, but converted to view due the AbstractNamePrice spec
    /// @param duration Duration of the name to register in years
    /// @return price Price in RIF tokens
    function price (string calldata /*name*/, uint /*expires*/, uint duration) external override pure returns(uint) {
        require(duration >= 1, "NamePrice: no zero duration");

        if (duration == 1) return 2 * (10**18);
        if (duration == 2) return 4 * (10**18);

        return (duration+2) * (10**18);
    }
}
