// SPDX-License-Identifier: Apache-2.0

pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import './FeeExchanger.sol';

contract SushiswapExchanger is FeeExchanger, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;
    
    IUniswapV2Router02 private _sushiswapRouter;

    string constant _name = "Sushiswap Exchanger";

    function initialize(IUniswapV2Router02 routerAddress, IERC20 inputToken, IERC20 outputToken, address outputAddress) public initializer {
        FeeExchanger.__FeeExchanger_init(inputToken, outputToken, outputAddress);

        _sushiswapRouter = routerAddress;
    }

    function exchange(uint256 amountIn, uint256 minAmountOut) nonReentrant isExchanger external override returns (uint256) {
        require(FeeExchanger._inputToken.balanceOf(address(this)) >= amountIn, "FE: AMOUNT IN");
        
        address[] memory path = new address[](2);
        path[0] = address(FeeExchanger._inputToken);
        path[1] = address(FeeExchanger._outputToken);

        FeeExchanger._inputToken.safeIncreaseAllowance(address(_sushiswapRouter), amountIn);
        uint256 balance0 = _outputToken.balanceOf(FeeExchanger._outputAddress);
        
        _sushiswapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          amountIn,
          minAmountOut, 
          path,
          FeeExchanger._outputAddress,
          block.timestamp + 1800
        );

        uint256 amountOut = FeeExchanger._outputToken.balanceOf(FeeExchanger._outputAddress) - balance0;
        require(amountOut >= minAmountOut, "FE: MIN AMOUNT OUT");

        emit TokenExchanged(FeeExchanger._inputToken, FeeExchanger._outputToken, amountIn, amountOut, _name);

        return amountOut;
    }
}
