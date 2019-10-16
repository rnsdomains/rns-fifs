pragma solidity ^0.5.3;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./testing/TokenDeed.sol";

contract RSKOwner is ERC721 {
    address private previousRegistrar;
    mapping (uint256 => uint) public expirationTime;

    modifier onlyPreviousRegistrar {
        require(msg.sender == previousRegistrar, "Only previous registrar.");
        _;
    }

    constructor (address _previousRegistrar) public {
        previousRegistrar = _previousRegistrar;
    }

    function acceptRegistrarTransfer(bytes32 label, TokenDeed deed, uint) public onlyPreviousRegistrar {
        uint256 tokenId = uint256(label);
        expirationTime[tokenId] = deed.expirationDate();
        _mint(deed.owner(), tokenId);
        deed.closeDeed(1000);
    }
}
