pragma solidity ^0.5.3;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./testing/ERC677TokenContract.sol";
import "./RSKOwner.sol";
import "./PricedContract.sol";
import "./AbstractNamePrice.sol";
import "@ensdomains/ethregistrar/contracts/StringUtils.sol";
import "./testing/ERC677Receiver.sol";
import "./BytesUtils.sol";

/// @title First-in first-served registrar.
/// @notice You can use this contract to register .rsk names in RNS.
/// @dev This contract has permission to register in RSK Owner.
contract FIFSRegistrar is PricedContract, ERC677Receiver {
    using SafeMath for uint256;
    using StringUtils for string;
    using BytesUtils for bytes;

    mapping (bytes32 => uint) private commitmentRevealTime;
    uint public minCommitmentAge = 1 minutes;

    uint public minLength = 5;

    ERC677TokenContract rif;
    RSKOwner rskOwner;
    address pool;

    // sha3('register(string,address,bytes32,uint)')
    bytes4 constant REGISTER_SIGNATURE = 0xc2c414c8;

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

    ///////////////////
    // COMMIT-REVEAL //
    ///////////////////

    /*
        0. Caclulate makeCommitment hash of the domain to be registered (off-chain)
        1. Commit the calculated hash
        2. Wait minCommitmentAge
        3. Execute registration via:
            - ERC-20 with approve() + register()
            - ERC-677 with transferAndCall()
            The price of a domain is given by name price contract.
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

    // 3.

    // - Via ERC-20
    /// @notice Registers a .rsk name in RNS.
    /// @dev This method must be called after commiting.
    /// @param name The name to register.
    /// @param nameOwner The owner of the name to regiter.
    /// @param secret The secret used to make the commitment.
    /// @param duration Time to register in years.
    function register(string calldata name, address nameOwner, bytes32 secret, uint duration) external {
        uint cost = executeRegistration(name, nameOwner, secret, duration);
        require(rif.transferFrom(msg.sender, pool, cost), "Token transfer failed");
    }

    // - Via ERC-677
    /* Encoding:
        | signature  |  4 bytes      - offset  0
        | owner      | 20 bytes      - offset  4
        | secret     | 32 bytes      - offest 24
        | duration   | 32 bytes      - offset 56
        | name       | variable size - offset 88
    */

    /// @notice ERC-677 token fallback function.
    /// @dev Follow 'Register encoding' to execute a one-transaction regitration.
    /// @param from token sender.
    /// @param value amount of tokens sent.
    /// @param data data associated with transaction.
    /// @return true if successfull.
    function tokenFallback(address from, uint value, bytes calldata data) external returns (bool) {
        require(msg.sender == address(rif), "Only RIF token");
        require(data.length > 88, "Invalid data");

        bytes4 signature = data.toBytes4(0);

        require(signature == REGISTER_SIGNATURE, "Invalid signature");

        address nameOwner = data.toAddress(4);
        bytes32 secret = data.toBytes32(24);
        uint duration = data.toUint(56);
        string memory name = data.toString(88, data.length.sub(88));

        registerWithToken(name, nameOwner, secret, duration, from, value);

        return true;
    }

    function registerWithToken(string memory name, address nameOwner, bytes32 secret, uint duration, address from, uint amount) private {
        uint cost = executeRegistration(name, nameOwner, secret, duration);
        require(amount >= cost, "Not enough tokens");
        require(rif.transfer(pool, cost), "Token transfer failed");
        if (amount.sub(cost) > 0)
            require(rif.transfer(from, amount.sub(cost)), "Token transfer failed");
    }

    /// @notice Executes registration abstracted from payment method.
    /// @param name The name to register.
    /// @param nameOwner The owner of the name to regiter.
    /// @param secret The secret used to make the commitment.
    /// @param duration Time to register in years.
    /// @return price Price of the name to register.
    function executeRegistration (string memory name, address nameOwner, bytes32 secret, uint duration) private returns (uint) {
        bytes32 label = keccak256(abi.encodePacked(name));

        require(name.strlen() >= minLength, "Short names not available");

        bytes32 commitment = makeCommitment(label, nameOwner, secret);
        require(canReveal(commitment), "No commitment found");
        commitmentRevealTime[commitment] = 0;

        rskOwner.register(label, nameOwner, duration.mul(365 days));

        return price(name, rskOwner.expirationTime(uint(label)), duration);
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
