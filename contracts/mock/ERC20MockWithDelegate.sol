// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

// interfaces
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// mock contract emulating 
contract ERC20MockWithDelegate is ERC20 {
  mapping (address => address) internal _delegates;

  constructor(
    string memory name,
    string memory symbol,
    uint256 _creatorSupply
  )
    ERC20(name, symbol) {
    _mint(address(this), 10**24); // 1,000,000
    _mint(msg.sender, _creatorSupply);
  }

  function delegate(address _delegatee) external {
    _delegates[msg.sender] = _delegatee;
  }

  function delegates(address delegator) external view returns (address) {
    return _delegates[delegator];
  }
}