// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
  constructor(
    string memory name,
    string memory symbol,
    uint256 _creatorSupply
  )
    ERC20(name, symbol) {
    _mint(address(this), 10**24); // 1,000,000
    _mint(msg.sender, _creatorSupply);
  }
}