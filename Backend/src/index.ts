import { Prisma, PrismaClient } from '@prisma/client'
import express, { NextFunction } from 'express'
import { Request, Response } from 'express'
import abi from '../prisma/contracts/FundManagerAbi'
import Web3, { EventLog } from 'web3'
import { formatUnits } from 'ethers/lib/utils'
import { recoverPersonalSignature } from '@metamask/eth-sig-util'
const cors = require('cors');
const INFURA_KEY = "f95a379a71ae4fd6a1755bc9e3ce51ed"; //f95a379a71ae4fd6a1755bc9e3ce51ed
const JSON_RPC_URL = `https://sepolia.infura.io/v3/${INFURA_KEY}`;
const web3 = new Web3(JSON_RPC_URL);

const prisma = new PrismaClient()
const app = express()

const OWNER_PRIVATE_KEY = "8ec2d0c180526d2bebaba8f7cebb4b512218b9f97b77355a53eb7e06c3c40e6c"
const FUND_MANAGER_ADDRESS = '0xb5145b577c437d8fd9373071bb2c77d1ce0cc9b4'
const TOKEN_ADDRESS = '0xd8f557ab68891bd4d69fe8e5080b1b8340c33fc1'
const TOKEN_DECIMALS = 18
const SIGN_MESSAGE = "BOOT_CAMP_2024_PROJECT"



declare module 'express-serve-static-core' {
  interface Request {
    address: string
  }
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
      orderBy:{
        id: 'desc'
      }
    })
    res.json(funds)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

//Scope logged in users

const fundManagerContract = new web3.eth.Contract(abi, FUND_MANAGER_ADDRESS);
const isAdmin = async (address:string)=>{
  const owner = await fundManagerContract.methods.owner().call({ from: address })
  return address.toLowerCase() === owner.toLowerCase()
}

const validateSignature = (req:Request, res:Response, next:NextFunction) => {
  try {
    const signature = req.headers['signature'] as string

    if (!signature) {
      return res.status(400).json({ error: 'Signature headers are required' })
    }
    const recoveredAddress = recoverPersonalSignature({ data: SIGN_MESSAGE, signature: signature })
    req.address = recoveredAddress
    next()
  } catch (error) {
    console.error('Error validating signature:', error)
    return res.status(401).json({ error: 'Invalid signature' })
  }
}
app.use(validateSignature)

app.get('/investments', async (req: Request, res: Response) => {
  const address = req['address'] as string

  try {
    const user = await prisma.user.findUnique({
      where: { address },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userInvestments = await prisma.userInvestment.findMany({
      where: { userId: user.id },
    })
    const investments = await prisma.investment.findMany({
      where: {
        id: {
          in: userInvestments.map((userInvestment) => userInvestment.investmentId),
        },
      },
    })
    const funds = await prisma.fund.findMany()

    const responseInvestments = userInvestments.map((userInvestment) => {
      const investment = investments.find((fund) => fund.id === userInvestment.investmentId)
      const fund = funds.find((fund) => fund.id === investment?.fundId)
      return {
        ...userInvestment,
        investment,
        fund,
      }
    })

    res.json(responseInvestments)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/user-info', async (req: Request, res: Response) => {
  const address = req['address'] as string
  const isAdminUser = await isAdmin(address)
  try {
    //use upsert to create a new user if not found
    let user = await prisma.user.upsert({
      where: { address },
      update: {
        isAdmin: isAdminUser
      },
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
  const address = req['address'] as string
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


app.post('/create-fund', async (req: Request, res: Response) => {
  const address = req['address'] as string
  const name = req.body['name'] as string
  const description = req.body['description'] as string
  try {
    const user = await prisma.user.findUnique({
      where: { address },
    })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    if(! await isAdmin(address)){
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

    const signedTx = await web3.eth.accounts.signTransaction(tx, OWNER_PRIVATE_KEY)
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
    const decodedLog = getDecodedLogs(receipt)
    const fundId = decodedLog?.fundId as BigInt
    const fund = await prisma.fund.create({
      data: {
        name,
        description,
        image: '',
        txHash: receipt.transactionHash.toString(),
        fundContractId: `${Number(fundId)}`,
        isCreating: false
      },
      })
      res.json({ fund })
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

const fetchPastEvents = async () => {
  try {
    const contract = new web3.eth.Contract(abi, FUND_MANAGER_ADDRESS)

    // Get the last processed block number from the database
    const syncState = await prisma.syncState.findFirst()
    const fromBlock = syncState ? syncState.lastBlock + 1 : 0
  
    const pastEvents = await contract.getPastEvents('Invested', {
      fromBlock,
      toBlock: 'latest',
    }) as EventLog[]
  
    for (const event of pastEvents) {
      const { user: userAddress, fundId: contractFundId, amount } = event.returnValues as {
        fundId: string
        amount: bigint
        user: string
      }
      try {
        const transactionHash = event.transactionHash?.toLowerCase()
        if(!transactionHash){
          continue
        }
        const user = await prisma.user.findUnique({
          where: { address: userAddress?.toLowerCase() },
        })
  
        if (!user) {
          continue
        }
  
        const fund = await prisma.fund.findFirst({
          where: { fundContractId: `${Number(contractFundId)}` },
        })
  
        if (!fund) {
          continue
        }

        const investmentInfo = await prisma.investment.findUnique({
          where: { userId_fundId: { userId: user.id, fundId: fund.id } },
        })

        if(investmentInfo?.id){
          const userInvestment = await prisma.userInvestment.findFirst({
            where: { userId: user.id, investmentId: investmentInfo.id, txHash: transactionHash },
          })
          
  
          if(userInvestment){
            continue
          }
        }

        const investment = await prisma.investment.upsert({
          where: { userId_fundId: { userId: user.id, fundId: fund.id } },
          update: { amount: {increment:Number(formatUnits(amount, TOKEN_DECIMALS))} },
          create: {
            userId: user.id,
            fundId: fund.id,
            amount: Number(formatUnits(amount, TOKEN_DECIMALS)),
          },
        })

        await prisma.userInvestment.upsert({
          where: { userId_investmentId_txHash: { userId: user.id, investmentId: investment.id, txHash: transactionHash  } },
          update: { amount: Number(formatUnits(amount, TOKEN_DECIMALS)) },
          create: {
            userId: user.id,
            investmentId: investment.id,
            txHash: transactionHash,
            amount: Number(formatUnits(amount, TOKEN_DECIMALS)),
          },
        })
        
        await prisma.fund.update({
          where: { id: fund.id },
          data: { totalInvestment: {
            increment: Number(formatUnits(amount, TOKEN_DECIMALS))
          }},
        })
  
        await prisma.syncState.upsert({
          where: { id: 1 },
          update: { lastBlock: Number(event.blockNumber )},
          create: { lastBlock: Number(event.blockNumber) },
        })
  
      } catch (error) {
        throw new Error('Error creating investment with event data: ' + error?.toString())
      }
    } 
  } catch (error) {
    console.error('Error fetching past events:', error)
  }
}

const resetDBBeforeSync = async () => {
  await prisma.investment.deleteMany()
  await prisma.userInvestment.deleteMany()
  await prisma.syncState.deleteMany()
  const funds = await prisma.fund.findMany()
  for (const fund of funds) {
    await prisma.fund.update({
      where: {id: fund.id },
      data: {
        totalInvestment: 0,
      }
    })
  }
}
//resetDBBeforeSync()

setInterval(fetchPastEvents, 10000)

// Periodically process the queue
//setInterval(processQueue, 5000)

const server = app.listen(3008, () =>
  console.log(`
🚀 Server ready at: http://localhost:3008
⭐️ See sample requests: http://pris.ly/e/ts/rest-express#3-using-the-rest-api`),
)
