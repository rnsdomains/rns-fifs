// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@ensdomains/ethregistrar/contracts/StringUtils.sol";
import "@rsksmart/erc677/contracts/ERC677.sol";
import "@rsksmart/erc677/contracts/IERC677TransferReceiver.sol";
import "./NodeOwner.sol";
import "./AbstractNamePrice.sol";
import "./BytesUtils.sol";


/// @title First-in first-served registrar base.
/// @notice This is an abstract contract. A Registrar can inherit from
/// this contract to implement basic commit-reveal and admin functionality.
/// @dev Inherited contract should have registrar permission in Node Owner.
contract FIFSRegistrarBase is IERC677TransferReceiver, Ownable {
    using SafeMath for uint256;
    using StringUtils for string;
    using BytesUtils for bytes;

    mapping (bytes32 => uint) internal commitmentRevealTime;
    uint public minCommitmentAge = 1 minutes;

    uint public minLength = 5;

    ERC677 rif;
    NodeOwner nodeOwner;

    constructor (
        ERC677 _rif,
        NodeOwner _nodeOwner
    ) public {
        rif = _rif;
        nodeOwner = _nodeOwner;
    }

    ///////////////////
    // COMMIT-REVEAL //
    ///////////////////

    /*
        0. Caclulate makeCommitment hash of the domain to be registered (off-chain)
        1. Commit the calculated hash
        2. Wait minCommitmentAge
        3. Execute registration via inheriting contract.
    */

    // 0.
    /// @notice Create a commitment for register action.
    /// @dev Don't use this method on-chain when commiting.
    /// @param label keccak256 of the name to be registered.
    /// @param nameOwner Owner of the name to be registered.
    /// @param secret Secret to protect the name to be registered.
    /// @return The commitment hash.
    function makeCommitment (bytes32 label, address nameOwner, bytes32 secret) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(label, nameOwner, secret));
    }

    // 1.
    /// @notice Commit before registring a name.
    /// @dev A valid commitment can be calculated using makeCommitment off-chain.
    /// @param commitment A valid commitment hash.
    function commit(bytes32 commitment) external {
        require(commitmentRevealTime[commitment] < 1, "Existent commitment");
        commitmentRevealTime[commitment] = now.add(minCommitmentAge);
    }

    // 2.
    /// @notice Ensure the commitment is ready to be revealed.
    /// @dev This method can be polled to ensure registration.
    /// @param commitment Commitment to be queried.
    /// @return Wether the commitment can be revealed or not.
    function canReveal(bytes32 commitment) public view returns (bool) {
        uint revealTime = commitmentRevealTime[commitment];
        return 0 < revealTime && revealTime <= now;
    }

    /////////////////////
    // REGISTRAR ADMIN //
    /////////////////////

    /// @notice Change required commitment maturity.
    /// @dev Only owner.
    /// @param newMinCommitmentAge The new maturity required.
    function setMinCommitmentAge (uint newMinCommitmentAge) external onlyOwner {
        minCommitmentAge = newMinCommitmentAge;
    }

    /// @notice Change disbaled names.
    /// @dev Only owner.
    /// @param newMinLength The new minimum length enabled.
    function setMinLength (uint newMinLength) external onlyOwner {
        minLength = newMinLength;
    }
}
