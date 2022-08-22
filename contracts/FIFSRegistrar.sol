// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "./FIFSRegistrarBase.sol";
import "./PricedContract.sol";

/// @title First-in first-served registrar.
/// @notice You can use this contract to register .rsk names in RNS.
/// @dev This contract has permission to register in RSK Owner.
contract FIFSRegistrar is FIFSRegistrarBase, PricedContract {
    address pool;

    // sha3('register(string,address,bytes32,uint)')
    bytes4 constant REGISTER_SIGNATURE = 0xc2c414c8;

    constructor (
        ERC677 _rif,
        NodeOwner _nodeOwner,
        address _pool,
        AbstractNamePrice _namePrice
    ) public FIFSRegistrarBase(_rif, _nodeOwner) PricedContract(_namePrice) {
        pool = _pool;
    }

    /*
        3. Execute registration via:
            - ERC-20 with approve() + register()
            - ERC-677 with transferAndCall()
        The price of a domain is given by name price contract.
    */

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

        nodeOwner.register(label, nameOwner, duration.mul(365 days));

        return price(name, nodeOwner.expirationTime(uint(label)), duration);
    }
}
