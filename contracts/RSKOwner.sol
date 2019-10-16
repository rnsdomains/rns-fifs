pragma solidity ^0.5.3;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/access/Roles.sol";
import "./testing/TokenDeed.sol";

contract RSKOwner is ERC721, Ownable {
    using Roles for Roles.Role;

    Roles.Role registrars;

    event Register();

    address private previousRegistrar;
    mapping (uint256 => uint) public expirationTime;

    modifier onlyPreviousRegistrar {
        require(msg.sender == previousRegistrar, "Only previous registrar.");
        _;
    }

    modifier onlyRegistrar {
        require(registrars.has(msg.sender), "Only registrar.");
        _;
    }

    constructor (address _previousRegistrar) public {
        previousRegistrar = _previousRegistrar;
    }

    // Auction migration
    function acceptRegistrarTransfer(bytes32 label, TokenDeed deed, uint) public onlyPreviousRegistrar {
        uint256 tokenId = uint256(label);
        expirationTime[tokenId] = deed.expirationDate();
        _mint(deed.owner(), tokenId);
        deed.closeDeed(1000);
    }

    // Registrar role
    function addRegistrar(address registrar) public onlyOwner {
        registrars.add(registrar);
    }

    function isRegistrar(address registrar) public view returns (bool) {
        return registrars.has(registrar);
    }

    function removeRegistrar(address registrar) public onlyOwner {
        registrars.remove(registrar);
    }

    function register() public onlyRegistrar {
        emit Register();
    }
}
