pragma solidity ^0.5.3;

/// @title NamePrice interface
/// @author Javier Esses
/// @notice Used to define an interface for name price calculations
contract AbstractNamePrice {
    function price (string calldata name, uint expires, uint duration) external view returns(uint);
}
