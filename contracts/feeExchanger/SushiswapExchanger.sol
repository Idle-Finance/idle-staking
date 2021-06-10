pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import './FeeExchanger.sol';

contract SushiswapExchanger is FeeExchanger, ReentrancyGuardUpgradeable {
    IUniswapV2Router02 private _sushiswapRouter;

    function initialize(IUniswapV2Router02 routerAddress_, IERC20 inputToken_, IERC20 outputToken_, address feeDistributor_) public initializer {
        FeeExchanger.initialize(inputToken_, outputToken_, feeDistributor_);

        _sushiswapRouter = routerAddress_;
    }

    function exchange(uint256 amountIn, uint256 minAmountOut) nonReentrant isExchanger external override returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = address(_inputToken);
        path[1] = address(_outputToken);

        uint256 balance0 = _outputToken.balanceOf(address(this));
        
        _sushiswapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          amountIn,
          minAmountOut, 
          path,
          _feeDistributor,
          block.timestamp + 1800
        );

        uint256 amountOut = _outputToken.balanceOf(address(this)) - balance0;

        require(amountOut > minAmountOut, "FE: MIN AMOUNT OUT");

        emit TokenExchanged(_inputToken, _outputToken, amountIn, amountOut);

        return amountOut;
    }
}
