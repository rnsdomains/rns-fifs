pragma solidity ^0.5.3;

import "@rsksmart/rns-auction-registrar/contracts/TokenRegistrar.sol";
import "@rsksmart/rns-auction-registrar/contracts/TokenDeed.sol";
import "./NodeOwner.sol";

contract RSKOwner is NodeOwner {
    TokenRegistrar private previousRegistrar;

    modifier onlyPreviousRegistrar {
        require(msg.sender == address(previousRegistrar), "Only previous registrar.");
        _;
    }

    constructor (
        TokenRegistrar _previousRegistrar,
        AbstractRNS _rns,
        bytes32 _rootNode
    ) public NodeOwner(
        _rns,
        _rootNode
    ) {
        previousRegistrar = _previousRegistrar;
    }

    /// @notice Check if a domain is available to be registered.
    /// @dev The name must be registered via account with registrar role.
    /// @dev The name must not be owned in previous registrar.
    /// @param tokenId keccak256 of the domain label.
    /// @return true if the specified domain can be registered.
    function available(uint256 tokenId) public view returns(bool) {
        return (
            super.available(tokenId) &&
            previousRegistrar.state(bytes32(tokenId)) != TokenRegistrar.Mode.Owned
        );
    }

    ///////////////////////
    // AUCTION MIGRATION //
    ///////////////////////

    /*
        A domain registered with previous registrar (auction)
        should be transfered before it can be renewed. If the
        domain is not transfered and it expires, it might be
        registered by someone else.
    */

    /// @notice Accept domain transfer from previous registrar.
    /// @dev Use it via tokenRegistrar.trnasferRegistrars(label).
    /// All locked tokens in Deed are returned.
    /// @param label Accepted domain label.
    /// @param deed Deed contract address holding tokens.
    function acceptRegistrarTransfer(bytes32 label, TokenDeed deed, uint) external onlyPreviousRegistrar {
        uint256 tokenId = uint256(label);
        expirationTime[tokenId] = deed.expirationDate();
        _mint(deed.owner(), tokenId);
        deed.closeDeed(1000);
    }
}
