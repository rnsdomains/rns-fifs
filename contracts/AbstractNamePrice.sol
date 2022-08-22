// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

/// @title NamePrice interface
/// @author Javier Esses
/// @notice Defines an interface for name price calculations
abstract contract AbstractNamePrice {
    function price (string calldata name, uint expires, uint duration) virtual external view returns(uint);
}
