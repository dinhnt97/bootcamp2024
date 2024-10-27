// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FundManager is Ownable(address(msg.sender)) {
    struct Fund {
        string name;
        address tokenAddress;
        uint256 totalInvestment;
    }

    Fund[] public funds;
    mapping(address => mapping(uint256 => uint256)) public userInvestments;

    event FundCreated(uint256 fundId, string name, address tokenAddress);
    event Invested(address indexed user, uint256 fundId, uint256 amount);
    event Debug(string message, uint256 fundId, uint256 amount); // Define the Debug event

    function createFund(string memory _name, address _tokenAddress) external onlyOwner {
        funds.push(Fund({
            name: _name,
            tokenAddress: _tokenAddress,
            totalInvestment: 0
        }));
        emit FundCreated(funds.length - 1, _name, _tokenAddress);
    }

    function invest(uint256 _fundId, uint256 _amount) external {
        require(_fundId < funds.length, "Fund does not exist");
        emit Debug("Fund exists", _fundId, _amount);

        Fund storage fund = funds[_fundId];
        IERC20 token = IERC20(fund.tokenAddress);

        require(token.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");
        emit Debug("Token transfer successful", _fundId, _amount);

        fund.totalInvestment += _amount;
        userInvestments[msg.sender][_fundId] += _amount;

        emit Invested(msg.sender, _fundId, _amount);
    }

    function getUserInvestments(address _user) external view returns (uint256[] memory) {
        uint256[] memory investments = new uint256[](funds.length);
        for (uint256 i = 0; i < funds.length; i++) {
            investments[i] = userInvestments[_user][i];
        }
        return investments;
    }
}