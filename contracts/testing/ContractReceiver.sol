pragma solidity ^0.5.3;

// Used only for testing reasons

 /*
 * Contract interface that is working with ERC677 tokens
 */
contract ContractReceiver {
    function tokenFallback(address _from, uint _value, bytes memory _data) public returns(bool);
}

