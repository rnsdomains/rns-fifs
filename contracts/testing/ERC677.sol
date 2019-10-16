pragma solidity ^0.5.3;

// Used only for testing reasons
// See https://github.com/ethereum/EIPs/issues/677

/* ERC677 contract interface */
contract ERC677 {
    function transferAndCall(address to, uint256 value, bytes memory data) public returns (bool ok);

    event Transfer(address indexed from, address indexed to, uint256 value, bytes data);
}
