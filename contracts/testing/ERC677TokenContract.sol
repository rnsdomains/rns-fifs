pragma solidity ^0.5.3;

// Used only for testing reasons

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "./ContractReceiver.sol";
import "./ERC677.sol";

contract ERC677TokenContract is ERC677, ERC20, ERC20Detailed {

    constructor(address initialAccount, uint256 initialBalance) ERC20Detailed("RIF Token", "RIF", 18) public {
        _mint(initialAccount, initialBalance);
    }

    function transferAndCall(address to, uint256 value, bytes memory data) public returns (bool) {
        super.transfer(to, value);

        ContractReceiver(to).tokenFallback(msg.sender, value, data);

        emit Transfer(msg.sender, to, value, data);

        return true;
    }
}
