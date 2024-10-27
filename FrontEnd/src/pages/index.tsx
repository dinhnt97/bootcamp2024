import { ConnectButton,  } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import {useAccount, useAccountEffect, useSignMessage} from 'wagmi';
import { getUserInfo } from '../action';
import axios from 'axios';
import { useEffect, useState } from 'react';
import HotFunds from './components/HotFunds';
import ListFunds from './components/ListFunds';
import { useUser } from './hooks';


const Home: NextPage = () => {
  const {isConnected} = useUser()
  
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <ConnectButton />
        <HotFunds />
        <ListFunds/>
      </main>

      <footer className={styles.footer}>
        <a href="https://rainbow.me" rel="noopener noreferrer" target="_blank">
          Made with ❤️ by your frens at 🌈
        </a>
      </footer>
    </div>
  );
};

type FundItemProps = {
  image: string;
  name: string;
  totalInvest: string;
}

const FundItem = ({ image, name, totalInvest }: FundItemProps) => (
  <div className={styles.fundItem}>
    <img src={image} alt={name} className={styles.image} />
    <div className={styles.fundDetails}>
      <h3>{name}</h3>
      <p>Total Invested: {totalInvest}</p>
      <button className={styles.joinButton}>Join</button>
    </div>
  </div>
);

type UserInvestmentItemProps = {
  avatar: string;
  name: string;
  amount: string;
}

const UserInvestmentItem = ({ avatar, name, amount }: UserInvestmentItemProps) => (
  <div className={styles.userInvestmentItem}>
    <img src={avatar} alt={name} className={styles.avatar} />
    <div className={styles.userInvestmentDetails}>
      <h3>{name}</h3>
      <p>Amount Invested: {amount}</p>
    </div>
  </div>
);

export default Home;
