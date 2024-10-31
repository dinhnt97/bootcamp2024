import { useEffect, useState } from "react";
import { useAccount, useAccountEffect, useSignMessage, useWriteContract, useReadContracts, useWaitForTransactionReceipt,useDisconnect  } from "wagmi";
import { getUserInfo } from "../../action";
import erc20Abi from "../contract/erc20TokenAbi";
import fundManagerAbi from "../contract/FundManagerAbi";
import { useCallback, useMemo } from "react";
import { MaxUint256 } from 'ethers';

const SIGN_MESSAGE = "BOOT_CAMP_2024_PROJECT";
export const FUND_CONTRACT_ADDRESS = "0xb5145b577c437d8fd9373071bb2c77d1ce0cc9b4";
export const ERC20_TOKEN_ADDRESS = "0xd8f557Ab68891bd4d69fe8e5080b1b8340C33fC1";
export const TOKEN_NAME = "BCP24";


export const useUser = ()=>{

    const { address, isConnected } = useAccount();
    const {disconnect} = useDisconnect();
    const {signMessageAsync} = useSignMessage();

    const [signature, setSignature] = useState<string | null>(null); 
    const [isLoginSuccess, setIsLoginSuccess] = useState<boolean>(false);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);



    const onLogin = async (address: `0x${string}`) => {
      try {
        const user = localStorage.getItem("user")
        let signature = localStorage.getItem("signature") 
        if((!user || !signature) && address){
            signature = await signMessageAsync({message:SIGN_MESSAGE});
            localStorage.setItem("user", address);
            localStorage.setItem("signature", signature);
        }
        const data = await getUserInfo();
        setIsAdmin(data.isAdmin);
        setSignature(signature);
        setIsLoginSuccess(true);
        if(!user){
            window.alert(`Welcome ${data.address}`);
        }
      } catch (error) {
        disconnect();
        window.alert(`Login fail: ${error}`);
      }
    }

    useEffect(()=>{
        const getLocalInfo = async ()=>{
            const user = localStorage.getItem("user")
            let signature = localStorage.getItem("signature") 
            if(user && signature){
                setSignature(signature);
                setIsLoginSuccess(true);
                const data = await getUserInfo();
            }
        }
        getLocalInfo()
    },[isConnected])

  
    useAccountEffect({
        onConnect(data) {
            if(data.address){
                onLogin(data.address);
            }
        },
        onDisconnect() {
            localStorage.removeItem("user");
            localStorage.removeItem("signature");
            setSignature(null);
            setIsLoginSuccess(false);
        },
    });
    return {address, isConnected, isLoginSuccess, signature, isAdmin}
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
    const { data: hash, writeContractAsync,} = useWriteContract()
    const account = useAccount();
    const [isConfirming, setIsConfirming] = useState<boolean>(false);

    const {isAllowToSend, isLoading, onApprove} = useERC20Token(account.address, FUND_CONTRACT_ADDRESS)

    const onInvest = async (fundId: string, amount:bigint) => {
        try { 
            if(!isAllowToSend(BigInt(amount))){
                await onApprove(FUND_CONTRACT_ADDRESS)
            }else{
                setIsConfirming(true);
                await writeContractAsync({
                    address: FUND_CONTRACT_ADDRESS,
                    abi: fundManagerAbi,
                    functionName: 'invest',
                    args: [BigInt(fundId), BigInt(amount.toString())],
                })
                window.alert('Investment is handled by blockchain network');
            }
          } catch (error) {
            window.alert('Error investing in fund:', error);
          } finally {
            setIsConfirming(false);
          }
    }
    return {onInvest, isLoading, isConfirming}
}