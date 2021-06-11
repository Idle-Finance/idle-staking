// SPDX-License-Identifier: Apache-2.0

pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';

import './FeeExchanger.sol';
import '../interface/IFeeDistributor.sol';

/**
 * @title Fee Exchanger implementation using Sushiswap
 * @author Asaf Silman
 * @dev This contract is upgradable and should be deployed using Openzeppelin upgrades
 * @notice Exchanges fees for `outputToken` and forwards to `outputAddress`
 */
contract SushiswapExchanger is FeeExchanger, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;
    
    // Sushiswap router is implmenented using the uniswap interface
    IUniswapV2Router02 private _sushiswapRouter;

    string constant _name = "Sushiswap Exchanger";

    /**
     * @notice Initialises the Sushiswap Exchanger contract.
     * @dev Most of the initialisation is done as part of the `FeeExchanger` initialisation.
     * @dev This method sets the internal sushiswap router address.
     * @dev This method can only be called once.
     * @param routerAddress The address of the sushiswap router.
     * @param inputToken The token which the protocol fees are generated in. This should set to the WETH address.
     * @param outputToken The token which this contract will exchange fees into.
     * @param outputAddress The address where fees will be redirected to.
     */
    function initialize(IUniswapV2Router02 routerAddress, IERC20 inputToken, IERC20 outputToken, address outputAddress) public initializer {
        FeeExchanger.__FeeExchanger_init(inputToken, outputToken, outputAddress);

        _sushiswapRouter = routerAddress;
    }

    /**
     * @notice Exchanges fees on sushiswap
     * @dev This method validates the minAmountOut was transfered to the output address.
     * @dev The expiration time is hardcoded to 1800 seconds, or 30 minutes.
     * @dev This method can only be called by an approved exchanger, see FeeExchanger.sol for more info.
     * @param amountIn The input amount of fees to swap.
     * @param minAmountOut The minimum output amount of tokens to receive after the swap has executed.
     */
    function exchange(uint256 amountIn, uint256 minAmountOut) nonReentrant isExchanger external override returns (uint256) {
        require(FeeExchanger._inputToken.balanceOf(address(this)) >= amountIn, "FE: AMOUNT IN");
        
        // Define swap path
        address[] memory path = new address[](2);
        path[0] = address(FeeExchanger._inputToken);
        path[1] = address(FeeExchanger._outputToken);

        // Approve input token for swapping
        FeeExchanger._inputToken.safeIncreaseAllowance(address(_sushiswapRouter), amountIn);
        
        uint256 balance0 = _outputToken.balanceOf(address(this));
        
        // Swap tokens using sushi
        _sushiswapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          amountIn,
          minAmountOut, 
          path,
          address(this),
          block.timestamp + 1800
        );

        uint256 amountOut = FeeExchanger._outputToken.balanceOf(address(this)) - balance0;
        require(amountOut >= minAmountOut, "FE: MIN AMOUNT OUT");

        // Approve output token to call `burn` on feeDistributor
        FeeExchanger._outputToken.safeIncreaseAllowance(address(FeeExchanger._outputAddress), amountOut);
        IFeeDistributor(FeeExchanger._outputAddress).burn(address(FeeExchanger._outputToken));

        emit TokenExchanged(FeeExchanger._inputToken, FeeExchanger._outputToken, amountIn, amountOut, _name);

        return amountOut;
    }
}
