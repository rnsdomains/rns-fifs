pragma solidity ^0.5.3;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./testing/ERC677TokenContract.sol";
import "./RSKOwner.sol";
import "./PricedContract.sol";
import "./AbstractNamePrice.sol";
import "@ensdomains/ethregistrar/contracts/StringUtils.sol";

/// @title First-in first-served registrar
/// @notice You can use this contract to register .rsk names in RNS.
/// First make a commitment of the name to be registered, wait 1
/// minute, and proceed to register the name.
/// @dev This contract has permission to register in RSK Owner
contract FIFSRegistrar is PricedContract {
    using SafeMath for uint256;
    using StringUtils for string;

    mapping (bytes32 => uint) private commitmentRevealTime;
    uint public minCommitmentAge = 1 minutes;

    uint public minLength = 5;

    ERC677TokenContract rif;
    RSKOwner rskOwner;
    address pool;

    constructor (
        ERC677TokenContract _rif,
        RSKOwner _rskOwner,
        address _pool,
        AbstractNamePrice _namePrice
    ) public PricedContract(_namePrice) {
        rif = _rif;
        rskOwner = _rskOwner;
        pool = _pool;
    }

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
    /// @param duration Time to register in years
    function register(string calldata name, address nameOwner, bytes32 secret, uint duration) external {
        uint cost = executeRegistration(name, nameOwner, secret, duration);
        require(rif.transferFrom(msg.sender, pool, cost), "Token transfer failed");
    }

    /// @notice Change required commitment maturity
    /// @dev Only owner
    /// @param newMinCommitmentAge The new maturity required
    function setMinCommitmentAge (uint newMinCommitmentAge) external onlyOwner {
        minCommitmentAge = newMinCommitmentAge;
    }

    /// @notice Change disbaled names
    /// @dev Only owner
    /// @param newMinLength The new minimum length enabled
    function setMinLength (uint newMinLength) external onlyOwner {
        minLength = newMinLength;
    }

    /// @notice Executes registration without any payments.
    /// @dev This method is used to abstract from payment method.
    /// @param name The name to register
    /// @param nameOwner The owner of the name to regiter
    /// @param secret The secret used to make the commitment
    /// @param duration Time to register in years
    /// @return price Price of the name to register
    function executeRegistration (string memory name, address nameOwner, bytes32 secret, uint duration) private returns (uint) {
        bytes32 label = keccak256(abi.encodePacked(name));

        require(name.strlen() >= minLength, "Short names not available");

        bytes32 commitment = makeCommitment(label, nameOwner, secret);
        require(canReveal(commitment), "No commitment found");
        commitmentRevealTime[commitment] = 0;

        rskOwner.register(label, nameOwner, duration.mul(365 days));

        return price(name, rskOwner.expirationTime(uint(label)), duration);
    }
}
