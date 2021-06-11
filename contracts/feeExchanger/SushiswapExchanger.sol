pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import './FeeExchanger.sol';

contract SushiswapExchanger is FeeExchanger, ReentrancyGuardUpgradeable {
    IUniswapV2Router02 private _sushiswapRouter;

    string constant _name = "Sushiswap Exchanger";

    function initialize(IUniswapV2Router02 routerAddress, IERC20 inputToken, IERC20 outputToken, address feeDistributor) public initializer {
        FeeExchanger.__FeeExchanger_init(inputToken, outputToken, feeDistributor);

        _sushiswapRouter = routerAddress;
    }

    function exchange(uint256 amountIn, uint256 minAmountOut) nonReentrant isExchanger external override returns (uint256) {
        require(FeeExchanger._inputToken.balanceOf(address(this)) >= amountIn, "FE: AMOUNT IN");
        
        address[] memory path = new address[](2);
        path[0] = address(FeeExchanger._inputToken);
        path[1] = address(FeeExchanger._outputToken);

        uint256 balance0 = _outputToken.balanceOf(address(this));
        
        _sushiswapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          amountIn,
          minAmountOut, 
          path,
          FeeExchanger._outputAddress,
          block.timestamp + 1800
        );

        uint256 amountOut = FeeExchanger._outputToken.balanceOf(address(this)) - balance0;

        require(amountOut > minAmountOut, "FE: MIN AMOUNT OUT");

        emit TokenExchanged(FeeExchanger._inputToken, FeeExchanger._outputToken, amountIn, amountOut, _name);

        return amountOut;
    }
}
