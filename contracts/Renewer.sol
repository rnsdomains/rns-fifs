pragma solidity ^0.5.3;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@ensdomains/ethregistrar/contracts/StringUtils.sol";
import "./testing/ERC677TokenContract.sol";
import "./testing/ERC677Receiver.sol";
import "./NodeOwner.sol";
import "./PricedContract.sol";
import "./AbstractNamePrice.sol";
import "./BytesUtils.sol";

/// @title Simple renewer.
/// @notice You can use this contract to renew names registered in Node Owner.
/// @dev This contract has permission to renew in Node Owner.
contract Renewer is PricedContract {
    using SafeMath for uint256;
    using StringUtils for string;
    using BytesUtils for bytes;

    ERC677TokenContract rif;
    NodeOwner nodeOwner;
    address pool;

    // sha3('renew(string,uint)')
    bytes4 constant RENEW_SIGNATURE = 0x14b1a4fc;

    constructor (
        ERC677TokenContract _rif,
        NodeOwner _nodeOwner,
        address _pool,
        AbstractNamePrice _namePrice
    ) public PricedContract(_namePrice) {
        rif = _rif;
        nodeOwner = _nodeOwner;
        pool = _pool;
    }

    // - Via ERC-20
    /// @notice Renews a name in Node Owner.
    /// @dev This method should be called if the owned.
    /// @param name The name to register.
    /// @param duration Time to register in years.
    function renew(string calldata name, uint duration) external {
        uint cost = executeRenovation(name, duration);
        require(rif.transferFrom(msg.sender, pool, cost), "Token transfer failed");
    }

    // - Via ERC-677
    /* Encoding:
        | signature  |  4 bytes      - offset  0
        | duration   | 32 bytes      - offset 4
        | name       | variable size - offset 36
    */

    /// @notice ERC-677 token fallback function.
    /// @dev Follow 'Register encoding' to execute a one-transaction regitration.
    /// @param from token sender.
    /// @param value amount of tokens sent.
    /// @param data data associated with transaction.
    /// @return true if successfull.
    function tokenFallback(address from, uint value, bytes calldata data) external returns (bool) {
        require(msg.sender == address(rif), "Only RIF token");
        require(data.length > 36, "Invalid data");

        bytes4 signature = data.toBytes4(0);

        require(signature == RENEW_SIGNATURE, "Invalid signature");

        uint duration = data.toUint(4);
        string memory name = data.toString(36, data.length.sub(36));

        renewWithToken(name, duration, from, value);

        return true;
    }


    function renewWithToken(string memory name, uint duration, address from, uint amount) private {
        uint cost = executeRenovation(name, duration);
        require(amount >= cost, "Not enough tokens");
        require(rif.transfer(pool, cost), "Token transfer failed");
        if (amount.sub(cost) > 0)
            require(rif.transfer(from, amount.sub(cost)), "Token transfer failed");
    }

    /// @notice Executes renovation abstracted from payment method.
    /// @param name The name to renew.
    /// @param duration Time to renew in years.
    /// @return price Price of the name to register.
    function executeRenovation(string memory name, uint duration) private returns(uint) {
        bytes32 label = keccak256(abi.encodePacked(name));

        nodeOwner.renew(label, duration.mul(365 days));

        return price(name, nodeOwner.expirationTime(uint(label)), duration);
    }
}
