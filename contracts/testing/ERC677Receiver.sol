pragma solidity ^0.5.3;

contract ERC677Receiver {
    function tokenFallback(address from, uint value, bytes calldata data) external returns (bool);
}
