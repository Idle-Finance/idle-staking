// SPDX-License-Identifier: Apache-2.0

pragma solidity =0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import '../feeExchanger/FeeExchanger.sol';

/**
 * Do not use this contract
 *
 * This contract is used exclusively for testing purposes
 */

contract MockFeeExchanger is FeeExchanger {
    function initialize(IERC20Upgradeable inputToken, IERC20Upgradeable outputToken, address feeDistributor) public initializer {
        FeeExchanger.__FeeExchanger_init(inputToken, outputToken, feeDistributor);
    }

    function exchange(uint256 amountIn, uint256 minAmountOut) onlyExchanger external override returns (uint256) {
        return 0;
    }
}
