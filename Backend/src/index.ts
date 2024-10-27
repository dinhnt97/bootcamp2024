import { Prisma, PrismaClient } from '@prisma/client'
import express, { NextFunction } from 'express'
import { bufferToHex, ecrecover, pubToAddress, hashPersonalMessage } from 'ethereumjs-util'
import { Request, Response } from 'express'
import abi from '../prisma/contracts/FundManagerAbi'
import Web3 from 'web3'
import { formatUnits } from 'ethers/lib/utils'
const cors = require('cors');
const INFURA_KEY = "f95a379a71ae4fd6a1755bc9e3ce51ed"; //f95a379a71ae4fd6a1755bc9e3ce51ed
const JSON_RPC_URL = `https://sepolia.infura.io/v3/${INFURA_KEY}`;
const web3 = new Web3(JSON_RPC_URL);

const prisma = new PrismaClient()
const app = express()

const OWNER_ADDRESS = '0x09d0a2963d27b27c234b3637c528ecb9356b8867'
const OWNER_PRIVATE_KEY = "8ec2d0c180526d2bebaba8f7cebb4b512218b9f97b77355a53eb7e06c3c40e6c"
const FUND_MANAGER_ADDRESS = '0xa75556c5b07e88119d7979761d00b8a55a1bc315'
const TOKEN_ADDRESS = '0xd8f557ab68891bd4d69fe8e5080b1b8340c33fc1'
const TOKEN_DECIMALS = 18

const fundManagerContract = new web3.eth.Contract(abi, FUND_MANAGER_ADDRESS);

const isAdmin = (address:string)=>{
  return address.toLowerCase() === OWNER_ADDRESS.toLowerCase()
}
app.use(express.json())
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from this origin
}));

//Scope non logged in users

app.get('/funds', async (req: Request, res: Response) => {
  try {
    const funds = await prisma.fund.findMany({
      where: {
        isCreating: false
      },
    })
    res.json(funds)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

//Scope logged in users

const validateSignature = (req:Request, res:Response, next:NextFunction) => {
  try {
    const signature = req.headers['signature'] as string
  
    if (!signature) {
      return res.status(400).json({ error: 'Address and signature headers are required' })
    }
  
    const message = "BOOT_CAMP_2024_PROJECT"
    const msgBuffer = Buffer.from(message)
    const msgHash = hashPersonalMessage(msgBuffer)
    const signatureBuffer = Buffer.from(signature.slice(2), 'hex')
    const r = signatureBuffer.slice(0, 32)
    const s = signatureBuffer.slice(32, 64)
    let v = signatureBuffer[64]
    
    if(v < 27){
      v += 27
    }


  
    const pubKey = ecrecover(msgHash, v, r, s)
    const recoveredAddress = bufferToHex(pubToAddress(pubKey))
    console.log('Recovered address:', recoveredAddress)
    req.headers['address'] = recoveredAddress
  
    next()
  } catch (error) {
    console.error('Error validating signature:', error)
    return res.status(401).json({ error: 'Invalid signature' })
  }
}
app.use(validateSignature)

app.get('/investments', async (req: Request, res: Response) => {
  const address = req.headers['address'] as string

  try {
    const user = await prisma.user.findUnique({
      where: { address },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const investments = await prisma.investment.findMany({
      where: { userId: user.id },
    })
    const funds = await prisma.fund.findMany({
      where: {
        id: {
          in: investments.map((investment) => investment.fundId),
        },
      },
    })

    const responseInvestments = investments.map((investment) => {
      const fund = funds.find((fund) => fund.id === investment.fundId)
      return {
        ...investment,
        fund,
      }
    })

    res.json(responseInvestments)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/user-info', async (req: Request, res: Response) => {
  const address = req.headers['address'] as string
  try {
    //use upsert to create a new user if not found
    let user = await prisma.user.upsert({
      where: { address },
      update: {},
      create: {
        address,
        avatar: ''
      },
    })
    res.json(user)
  } catch (error) {
    console.error('Error getting user info:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/update-user', async (req: Request, res: Response) => {
  const address = req.headers['address'] as string
  const { avatar } = req.body

  try {
    const user = await prisma.user.update({
      where: { address },
      data: { avatar },
    })

    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

const txCreateFundQueue: string[] = []
app.post('/create-fund', async (req: Request, res: Response) => {
  const address = req.headers['address'] as string
  const name = req.body['name'] as string
  const description = req.body['description'] as string

  try {
    const user = await prisma.user.findUnique({
      where: { address },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if(!isAdmin(address)){
      return res.status(403).json({ error: 'You cannot create fund' })
    }
    const nonce = await web3.eth.getTransactionCount(address)
    const gas = await fundManagerContract.methods.createFund(name, TOKEN_ADDRESS).estimateGas({ from: address })
    const gasPrice = await web3.eth.getGasPrice()
    const tx = {
      from: address,
      to: FUND_MANAGER_ADDRESS,
      nonce: nonce,
      gas: gas,
      gasPrice: gasPrice,
      data: fundManagerContract.methods.createFund(name, TOKEN_ADDRESS).encodeABI()
    }

    const signedTx = await web3.eth.accounts.signTransaction(tx, OWNER_PRIVATE_KEY) // Replace with the private key of the address
    const sentTx = web3.eth.sendSignedTransaction(signedTx.rawTransaction)

    sentTx.on('transactionHash', async (transactionHash) => {
      try {
        const fund = await prisma.fund.create({
          data: {
            name,
            description,
            image: '',
            txHash: transactionHash,
            fundContractId: "",
            isCreating: true
          },
          })
          txCreateFundQueue.push(transactionHash)
          res.json({ fund, transactionHash })
      } catch (error) {
        res.status(500).json({ error: 'Error creating fund' })
      }
    }).catch((error) => {
      console.error('Error sending transaction:', error)
      res.status(500).json({ error: 'Error sending transaction'})
    })
  } catch (error) {
    console.error('Error creating fund:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/invest', async (req: Request, res: Response) => {
  const address = req.headers['address'] as string
  const { fundId, amount } = req.body

  try {
    const user = await prisma.user.findUnique({
      where: { address },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
    })

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' })
    }

    const userInvestmentNumber = await fundManagerContract.methods.userInvestments(user.address, fund.fundContractId).call({ from: address })
    const fundOnchainInfo = await fundManagerContract.methods.funds(fund.fundContractId).call({ from: address })


    const updatedFund = await prisma.fund.update({
      where: { id: fund.id },
      data: { totalInvestment: Number(formatUnits(fundOnchainInfo.totalInvestment, TOKEN_DECIMALS)) },
    })
    
    const investment = await prisma.investment.upsert({
      where: { userId_fundId: { userId: user.id, fundId: fund.id } },
      update: { amount: Number(formatUnits(userInvestmentNumber, TOKEN_DECIMALS)) },
      create: {
        userId: user.id,
        fundId: fund.id,
        amount,
      },
    })

    res.json({
      ...investment,
      fund: updatedFund,
    })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

const getDecodedLogs = (receipt:any) => {
  try {
    const eventAbi = abi.find(item => item.name === 'FundCreated')
    if (!eventAbi) {
      throw new Error('Event ABI for FundCreated not found')
    }
    const eventSignature = web3.eth.abi.encodeEventSignature(eventAbi)
    const log = receipt.logs.find((log:any) => log.topics && log.topics[0] === eventSignature)
    if (!log) {
      throw new Error('Log not found')
    }
    if (!log.data) {
      throw new Error('Log data is undefined')
    }
    if (!log.topics) {
      throw new Error('Log topics are undefined')
    }
    const decodedLog = web3.eth.abi.decodeLog(eventAbi.inputs, log.data, log.topics.slice(1))
    return decodedLog
  } catch (error) {
    console.error('Error getting decoded logs:', error)
  }
}

const processQueue = async () => {
    while (txCreateFundQueue.length > 0) {
      const txHash = txCreateFundQueue.shift()
      if(!txHash) break
      try {   
        const receipt = await web3.eth.getTransactionReceipt(txHash)
        if (receipt && receipt.status) {
          console.log('Transaction receipt:', receipt)
  
          const decodedLog = getDecodedLogs(receipt)
          
          if (!decodedLog) {
            throw new Error('Decoded log not found')
          }
          const fundId = decodedLog.fundId as BigInt
  
          if(fundId){
            await prisma.fund.update({
              where: { txHash: receipt.transactionHash },
              data: { isCreating: false, fundContractId: `${Number(fundId)}` },
            })
          }
          console.log('Fund updated with fundId:', fundId)
        } else {
          // If the transaction is not yet mined, push it back to the queue
          txCreateFundQueue.push(txHash)
        }
      } catch (error) {
        // If there's an error, push the transaction back to the queue
        txCreateFundQueue.push(txHash)
        console.error('Error processing transaction:', error)
      }
    }
}
  
  // Periodically process the queue
setInterval(processQueue, 5000)

const server = app.listen(3008, () =>
  console.log(`
🚀 Server ready at: http://localhost:3008
⭐️ See sample requests: http://pris.ly/e/ts/rest-express#3-using-the-rest-api`),
)
