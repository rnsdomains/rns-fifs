pragma solidity ^0.5.3;

import "@ensdomains/ethregistrar/contracts/StringUtils.sol";

contract StringUtilsMock {
    using StringUtils for string;

    function test (string calldata input) external pure returns(uint) {
        return input.strlen();
    }
}
