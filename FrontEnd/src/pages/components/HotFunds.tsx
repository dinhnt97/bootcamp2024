import { useEffect, useState } from 'react';
import styles from '../../styles/Home.module.css';
import axios from 'axios';
import { getFunds, getInvests } from '../../action';
import { TOKEN_NAME, useUser } from '../hooks';
import { useHomeContext } from '..';

type HotFundItemProps = {
    fundInfo : Fund
}
type UserInvestmentItemProps = {
    investment : Investment
  }
const HotFundItem = ({ fundInfo }: HotFundItemProps) => (
    <div className={styles.fundItem}>
      <div className={styles.fundDetails}>
        <h3>{fundInfo.name}</h3>
        <h3>{fundInfo.description}</h3>
        <p>Total Invested: {fundInfo.totalInvestment} ${TOKEN_NAME}</p>
      </div>
    </div>
  )

  const UserInvestmentItem = ({ investment }: UserInvestmentItemProps) => (
    <div className={styles.userInvestmentItem} >
      <div className={styles.userInvestmentDetails}>
        <h3>{investment.fund.name}</h3>
        <h4>{investment.fund.description}</h4>
        <p>Your Invested: {investment.amount} ${TOKEN_NAME}</p>
        <p>Your Total Invested: {investment.investment.amount} ${TOKEN_NAME}</p>
        <h4 onClick={()=>open(`https://sepolia.etherscan.io/tx/${investment.txHash}`)}>txHash: {`${investment.txHash.slice(0, 3)}..${investment.txHash.slice(-3)}`}</h4>
      </div>
    </div>
  );
  
  const HotFunds = () =>{
    const [funds, setFunds] = useState<Fund[]>([]);
    const [investments, setInvestments] = useState<Investment[]>([]);
    const {isLoginSuccess} = useHomeContext()
    useEffect(()=>{
      console.log(isLoginSuccess)
        if(isLoginSuccess){
            getInvests().then((response)=>{
                setInvestments(response.slice(0,4));
            })
        }else{
            getFunds().then((response)=>{
                setFunds(response.slice(0,4));
            })
        }
    },[isLoginSuccess])
    return (
      <div>
        <h3>{investments.length > 0 ? "Your Investments":"Hot Fund"}</h3>
        <div className={styles.grid}>
       {
        investments.length > 0 ?
        investments.map((investment, index) => {
            return (
                <UserInvestmentItem
                key={index}
                investment={investment}
                />)
        }):
        funds.map((fund, index) => (
            <HotFundItem
              key={fund.id}
              fundInfo={fund}
            />
          ))
       }
      </div>
      </div>
      
    );
  }

  export default HotFunds;