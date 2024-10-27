import { useEffect, useState } from 'react';
import styles from '../../styles/Home.module.css';
import axios from 'axios';
import { getFunds, getInvests } from '../../action';
import { TOKEN_NAME, useUser } from '../hooks';

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
    <div className={styles.userInvestmentItem}>
      <div className={styles.userInvestmentDetails}>
        <h3>{investment.fund.name}</h3>
        <h4>{investment.fund.description}</h4>
        <p>Your Invested: {investment.amount} ${TOKEN_NAME}</p>
      </div>
    </div>
  );
  
  const HotFunds = () =>{
    const [funds, setFunds] = useState<Fund[]>([]);
    const [investments, setInvestments] = useState<Investment[]>([]);
    const {address, isConnected} = useUser()
    useEffect(()=>{
        if(address && isConnected){
            getInvests().then((response)=>{
                setInvestments(response.slice(0,4));
            })
        }else{
            getFunds().then((response)=>{
                setFunds(response.slice(0,4));
            })
        }
    },[address, isConnected])
    return (
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
    );
  }

  export default HotFunds;