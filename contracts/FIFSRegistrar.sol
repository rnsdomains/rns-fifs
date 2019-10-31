pragma solidity ^0.5.3;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract FIFSRegistrar is Ownable {
    using SafeMath for uint256;

    mapping (bytes32 => uint) private commitmentRevealTime;
    uint public minCommitmentAge = 1 minutes;

    function makeCommitment (bytes32 label, address _owner, bytes32 secret) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(label, _owner, secret));
    }

    function commit(bytes32 commitment) public {
        commitmentRevealTime[commitment] = now.add(minCommitmentAge);
    }

    function canReveal(bytes32 commitment) public view returns (bool) {
        uint revealTime = commitmentRevealTime[commitment];
        return 0 < revealTime && revealTime <= now;
    }

    function register(string memory name, address _owner, bytes32 secret, uint duration) public {
        bytes32 label = keccak256(abi.encodePacked(name));
        bytes32 commitment = makeCommitment(label, _owner, secret);
        require(canReveal(commitment), "No commitment found");
    }

    function setMinCommitmentAge (uint newMinCommitmentAge) public onlyOwner {
        minCommitmentAge = newMinCommitmentAge;
    }
}
