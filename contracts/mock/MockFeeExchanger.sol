pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '../feeExchanger/FeeExchanger.sol';

/**
 * Do not use this contract
 *
 * This contract is used exclusively for testing purposes
 */

contract MockFeeExchanger is FeeExchanger {
    function initialize(IERC20 inputToken, IERC20 outputToken, address feeDistributor) public initializer {
        FeeExchanger.__FeeExchanger_init(inputToken, outputToken, feeDistributor);
    }

    function exchange(uint256 amountIn, uint256 minAmountOut) isExchanger external override returns (uint256) {
        return 0;
    }
}
