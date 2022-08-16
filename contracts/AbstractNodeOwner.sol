// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title NodeOwner interface
/// @notice Defines an interface for the NodeOwner implementation.
abstract contract AbstractNodeOwner is IERC721 {
    function available (uint256 tokenId) public virtual view returns(bool);
    function reclaim(uint256 tokenId, address newOwner) external virtual;
    function removeExpired(uint256[] calldata tokenIds) external virtual;
}
