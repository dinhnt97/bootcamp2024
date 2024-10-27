import { useEffect, useState } from "react";
import { useAccount, useAccountEffect, useSignMessage, useWriteContract, useReadContracts, useWaitForTransactionReceipt } from "wagmi";
import { getUserInfo } from "../../action";
import erc20Abi from "../contract/erc20TokenAbi";
import fundManagerAbi from "../contract/FundManagerAbi";
import { useCallback, useMemo } from "react";
import { MaxUint256 } from 'ethers';

const SIGN_MESSAGE = "BOOT_CAMP_2024_PROJECT";
export const FUND_CONTRACT_ADDRESS = "0xa75556C5b07e88119d7979761D00b8a55A1Bc315";
export const ERC20_TOKEN_ADDRESS = "0xd8f557Ab68891bd4d69fe8e5080b1b8340C33fC1";
export const TOKEN_NAME = "BCP24";

export const useUser = ()=>{
    const { address, isConnected } = useAccount();
    const {signMessageAsync} = useSignMessage();

    useEffect(() => {
        if(address && isConnected){
            const user = localStorage.getItem("user")
            const signature = localStorage.getItem("signature") 
            if(user !== address || !signature){
                onLogin(address);
            }
        }
    }, [address, isConnected]);
  
    const onLogin = async (address:`0x${string}`) => {
      try {
        const signature = await signMessageAsync({message:SIGN_MESSAGE});
        localStorage.setItem("user", address);
        localStorage.setItem("signature", signature);
        const data = await getUserInfo();
        console.log(data);
      } catch (error) {
        console.log(error);
      }
     
    }
  
    useAccountEffect({
      onDisconnect() {
        localStorage.removeItem("user");
        localStorage.removeItem("signature");
      },
    });
    return {address, isConnected}
}

export const useERC20Token = (userAddress?:`0x${string}`, spenderAddress?:string ) => {
    const { writeContractAsync,  } = useWriteContract()
    const {data, isLoading} = useReadContracts({
        contracts: [
            {
                address: ERC20_TOKEN_ADDRESS,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [userAddress],
            },{
                address: ERC20_TOKEN_ADDRESS,
                abi: erc20Abi,
                functionName: 'allowance',
                args: [userAddress, spenderAddress],
            }
        ]
    })
    const [balance, allowance] = data || [] as {result: bigint}[]

    const isAllowToSend = useCallback((amount: bigint) => {
        if (typeof allowance?.result === 'bigint') {
            return allowance?.result > amount;
        }
        return false;
    }, [allowance?.result])

    const onApprove = useCallback(async (approvalAddress:string, amount?: bigint) => {
        try {
            await writeContractAsync({
                address: ERC20_TOKEN_ADDRESS,
                abi: erc20Abi,
                functionName: 'approve',
                args: [approvalAddress, amount || MaxUint256],
            })
            return true;
        } catch (error) {
            return false;
        }       
    }, [allowance?.result])

    return {balance: balance?.result, allowance: allowance?.result, isAllowToSend, isLoading, onApprove}
}

export const useInvest = ()=>{
    const { data: hash, writeContract,} = useWriteContract()
    const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })
    const account = useAccount();

    const {isAllowToSend, isLoading, onApprove} = useERC20Token(account.address, FUND_CONTRACT_ADDRESS)

    const onInvest = async (fundId: string, amount:bigint) => {
        try { 
            if(!isAllowToSend(BigInt(amount))){
                await onApprove(FUND_CONTRACT_ADDRESS)
            }else{
                writeContract({
                    address: FUND_CONTRACT_ADDRESS,
                    abi: fundManagerAbi,
                    functionName: 'invest',
                    args: [BigInt(fundId), BigInt(amount.toString())],
                })
            }
          } catch (error) {
            console.error('Error investing in fund:', error);
          }   
    }
    return {onInvest, isLoading, isConfirming, isConfirmed}
}