import { ConnectButton,  } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import {useAccount, useAccountEffect, useSignMessage} from 'wagmi';
import { getUserInfo, onCreateFund } from '../action';
import axios from 'axios';
import { createContext, useContext, useEffect, useState } from 'react';
import HotFunds from './components/HotFunds';
import ListFunds from './components/ListFunds';
import { useUser } from './hooks';


const HomeProvider = createContext<{
  isConnected: boolean,
  address?: `0x${string}`,
  signature: string|null,
  isLoginSuccess: boolean
  isAdmin: boolean
}>({
  isConnected: false,
  signature: null,
  isLoginSuccess: false,
  isAdmin: false
})

const HomeProviderContext = ({children}) => {
  const {address, isConnected, isLoginSuccess, signature, isAdmin} = useUser()
  return(
    <HomeProvider.Provider value={{
      isConnected,
      address,
      signature,
      isLoginSuccess,
      isAdmin
    }}>
      {children}
    </HomeProvider.Provider>
  )
}

export const useHomeContext = () => {
  return useContext(HomeProvider)
}

const Home: NextPage = () => {
  return (
    <HomeProviderContext>
      <div className={styles.container}>
      <main className={styles.main}>
        <ConnectWalletButton />
        <AdminCreateFundScope/>
        <HotFunds />
        <ListFunds/>
      </main>

      <footer className={styles.footer}>
        <a href="https://rainbow.me" rel="noopener noreferrer" target="_blank">
          Made with ❤️ by your frens at 🌈
        </a>
      </footer>
    </div>
    </HomeProviderContext>
  );
};

const AdminCreateFundScope = () => {
  const [name, setName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const {isAdmin} = useHomeContext()
  const createFund = async ()=>{
    try {
      setIsCreating(true)
      await onCreateFund(name, description)
      setIsCreating(false)
      window.alert("Fund Created")
    } catch (error) {
      window.alert(`Create Fund Fail: ${error}`)
    }
  }
  if(!isAdmin){
    return null
  }
  return(
    <div >
      <h3>Create Fund (Admin Scope)</h3>
      <input type="text" placeholder="Fund Name" onChange={(evt)=>{
          setName(evt.target.value)
      }}/>
      <input type="text" placeholder="Fund Description" onChange={(evt)=>{
        setDescription(evt.target.value)
      }}/>
      <button type="submit" onClick={createFund}>{isCreating?"Creating":"Create"}</button>
    </div>
  )
}

const ConnectWalletButton = () => {
  const {isLoginSuccess} = useHomeContext()

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          isLoginSuccess;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button onClick={openConnectModal} type="button">
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button onClick={openChainModal} type="button">
                    Wrong network
                  </button>
                );
              }

              return (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={openChainModal}
                    style={{ display: 'flex', alignItems: 'center' }}
                    type="button"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 12, height: 12 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button onClick={openAccountModal} type="button">
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ''}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  )
}
export default Home;
