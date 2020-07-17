pragma solidity ^0.5.3;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title NodeOwner interface
/// @notice Defines an interface for the NodeOwner implementation.
contract AbstractNodeOwner is IERC721 {
    function available (uint256 tokenId) public view returns(bool);
    function reclaim(uint256 tokenId, address newOwner) external;
    function removeExpired(uint256[] calldata tokenIds) external;
}
