pragma solidity ^0.5.3;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/// @title First-in first-served registrar
/// @notice You can use this contract to register .rsk names in RNS.
/// First make a commitment of the name to be registered, wait 1
/// minute, and proceed to register the name.
/// @dev This contract has permission to register in RSK Owner
contract FIFSRegistrar is Ownable {
    using SafeMath for uint256;

    mapping (bytes32 => uint) private commitmentRevealTime;
    uint public minCommitmentAge = 1 minutes;

    /// @notice Create a commitment for register action
    /// @dev Don't use this method on-chain when commiting
    /// @param label keccak256 of the name to be registered
    /// @param nameOwner Owner of the name to be registered
    /// @param secret Secret to protect the name to be registered
    /// @return The commitment hash
    function makeCommitment (bytes32 label, address nameOwner, bytes32 secret) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(label, nameOwner, secret));
    }

    /// @notice Commit before registring a name
    /// @dev A valid commitment can be calculated using makeCommitment off-chain
    /// @param commitment A valid commitment hash
    function commit(bytes32 commitment) external {
        require(commitmentRevealTime[commitment] < 1, "Existent commitment");
        commitmentRevealTime[commitment] = now.add(minCommitmentAge);
    }

    /// @notice Ensure the commitment is ready to be revealed
    /// @param commitment Commitment to be queried
    /// @return Wether the commitment can be revealed or not
    function canReveal(bytes32 commitment) public view returns (bool) {
        uint revealTime = commitmentRevealTime[commitment];
        return 0 < revealTime && revealTime <= now;
    }

    /// @notice Registers a .rsk name in RNS
    /// @dev This method must be called after commiting
    /// @param name The name to register
    /// @param nameOwner The owner of the name to regiter
    /// @param secret The secret used to make the commitment
    /// param Time to register in years
    function register(string calldata name, address nameOwner, bytes32 secret, uint /*duration*/) external view {
        bytes32 label = keccak256(abi.encodePacked(name));
        bytes32 commitment = makeCommitment(label, nameOwner, secret);
        require(canReveal(commitment), "No commitment found");
    }

    /// @notice Change required commitment maturity
    /// @dev Only owner
    /// @param newMinCommitmentAge The new maturity required
    function setMinCommitmentAge (uint newMinCommitmentAge) external onlyOwner {
        minCommitmentAge = newMinCommitmentAge;
    }

    function price (string memory /*name*/, uint /*expires*/, uint duration) public pure returns(uint) {
        if (duration == 1) return 2 * (10**18);
        if (duration == 2) return 4 * (10**18);
        else {
            uint base = 4 * (10 ** 18);
            return base.add(duration.sub(2).mul(10**18));
        }
    }
}
