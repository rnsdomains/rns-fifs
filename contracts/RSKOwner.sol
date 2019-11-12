pragma solidity ^0.5.3;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/access/Roles.sol";
import "./testing/TokenDeed.sol";
import "./testing/AbstractRNS.sol";

contract RSKOwner is ERC721, Ownable {
    using Roles for Roles.Role;
    Roles.Role registrars;

    uint public migrationDeadline = 0;
    address private previousRegistrar;
    AbstractRNS private rns;
    bytes32 private rootNode;

    mapping (uint256 => uint) public expirationTime;

    event ExpirationChanged(uint256 tokenId, uint expirationTime);

    modifier onlyPreviousRegistrar {
        require(msg.sender == previousRegistrar, "Only previous registrar.");
        _;
    }

    modifier onlyRegistrar {
        require(registrars.has(msg.sender), "Only registrar.");
        _;
    }

    modifier registrationLive {
        require(now >= migrationDeadline, "Registration not available.");
        _;
    }

    constructor (
        address _previousRegistrar,
        uint migrationTime,
        AbstractRNS _rns,
        bytes32 _rootNode
    ) public {
        previousRegistrar = _previousRegistrar;
        migrationDeadline = now.add(migrationTime);
        rns = _rns;
        rootNode = _rootNode;
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        require(expirationTime[tokenId] > now, "ERC721: owner query for nonexistent token");
        return super.ownerOf(tokenId);
    }

    function available(uint256 tokenId) public view returns(bool) {
        return expirationTime[tokenId] < now;
    }

    // Auction migration
    function acceptRegistrarTransfer(bytes32 label, TokenDeed deed, uint) external onlyPreviousRegistrar {
        uint256 tokenId = uint256(label);
        expirationTime[tokenId] = deed.expirationDate();
        _mint(deed.owner(), tokenId);
        deed.closeDeed(1000);
    }

    // Registrar role
    function addRegistrar(address registrar) external onlyOwner {
        registrars.add(registrar);
    }

    function isRegistrar(address registrar) external view returns (bool) {
        return registrars.has(registrar);
    }

    function removeRegistrar(address registrar) external onlyOwner {
        registrars.remove(registrar);
    }

    // Registration
    function register(bytes32 label, address tokenOwner, uint duration) external onlyRegistrar registrationLive {
        uint256 tokenId = uint256(label);

        require(available(tokenId), "Not available");

        uint newExpirationTime = now.add(duration);
        expirationTime[tokenId] = newExpirationTime;
        emit ExpirationChanged(tokenId, newExpirationTime);

        if (_exists(tokenId))
            _burn(tokenId);

        _mint(tokenOwner, tokenId);

        rns.setSubnodeOwner(rootNode, label, tokenOwner);
    }

    // After expiration
    function removeExpired(uint256[] calldata tokenIds) external {
        uint256 tokenId;
        for (uint i = 0; i < tokenIds.length; i++) {
            tokenId = tokenIds[i];

            if (_exists(tokenId) && available(tokenId)) {
                expirationTime[tokenId] = now + 1 days;

                _burn(tokenId);

                bytes32 label = bytes32(tokenId);
                rns.setSubnodeOwner(rootNode, label, address(0));

                expirationTime[tokenId] = 0;
            }
        }
    }
}
