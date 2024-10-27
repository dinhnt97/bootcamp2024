import { useEffect, useState } from 'react';
import styles from '../../styles/Home.module.css';
import axios from 'axios';
import abi from '../contract/FundManagerAbi';
import { ethers, parseEther,  } from 'ethers';
import { useAccount, useConnect, useWriteContract } from 'wagmi';
import { TOKEN_NAME, useInvest } from '../hooks';
import { getFunds, investFund } from '../../action';

type HotFundItemProps = {
    fundInfo : Fund
}
const FundItem = ({ fundInfo }: HotFundItemProps) => {
    const {onInvest, isConfirmed, isLoading, isConfirming} = useInvest()
    const invest = async () => {
        const amountBigInt = parseEther('1000');
        onInvest(fundInfo.fundContractId, amountBigInt)
    }
    useEffect(()=>{
        if(isConfirmed){
            investFund(fundInfo.id, 1000).then((response)=>{
                console.log(response)
            })
        }
    },[isConfirmed])

    return (
        <div className={styles.fundItem}>
        <img src={"https://picsum.photos/200"} alt={fundInfo.name} className={styles.image} />
        <div className={styles.fundDetails}>
            <h3>{fundInfo.name}</h3>
            <h4>{fundInfo.description}</h4>
            <p>Total Invested: {fundInfo.totalInvestment} ${TOKEN_NAME}</p>
        </div>
        <button className={styles.joinButton} disabled={isConfirming || isLoading} onClick={invest}>
            {isLoading ? 'Loading...' : isConfirming ? 'Confirming...' : 'Join'}
        </button>
        </div>
    )
};
  
  const ListFunds = () =>{
    const [funds, setFunds] = useState<Fund[]>([]);

    
    useEffect(()=>{
        getFunds().then((response)=>{
            setFunds(response);
        })
    },[])
    
    return (
        <div className={styles.list}>
        {funds.map((fund, index) => (
          <FundItem
            key={index}
            fundInfo={fund}
          />
        ))}
      </div>
    );
  }

  export default ListFunds;