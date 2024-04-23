//express를 import 한다. JavaScript에서는 'const express = require('express')'가 일반적이다.
import express, { Request, Response } from "express";
import contractAbi from "./abi.json";
import dotenv from "dotenv";
import Web3 from "web3";
dotenv.config();

interface Params {
  address: string;
  tokenuri: string;
}

const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 3001;

app.use(cors());

// https://sepolia.infura.io/v3/
// https://polygon-mainnet.infura.io/v3/
const web3 = new Web3(
  `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_KEY}`
);
const privateKey = process.env.PRIVATE_KEY as string;
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(privateKey);
let nonce: number;
(async () => {
  try {
    nonce = Number(await web3.eth.getTransactionCount(account.address));
    console.log("Nonce obtained at startup:", nonce);
  } catch (error) {
    console.error("Error obtaining nonce:", error);
  }
})();

async function viewNFTOwner() {
  try {
    const nftContract = new web3.eth.Contract(
      contractAbi,
      "0x7ab8afeaae5eb08ca118562080c048e41272a585"
    );

    const result = await nftContract.methods.ownerOf(0).call();
    return result;
  } catch (e) {
    console.log(e);
    return e;
  }
}

async function makeNFT(address: string, uri: string, _nonce: string) {
  try {
    const nftContract = new web3.eth.Contract(
      contractAbi,
      // "0x5E110fa7AF046E93f4c8BFF4eE82e7Aaa74c4eeB"
      "0xf46C5bdA488f911A7a59f14b0bb3bc5916098233"
    );
    const gas = await nftContract.methods
      .safeMint(address, uri)
      .estimateGas({ from: account.address });
    const gasPrice = await web3.eth.getGasPrice();

    await nftContract.methods.safeMint(address, uri).send({
      from: account.address,
      gas: `0x${gas.toString(16)}`,
      gasPrice: `0x${Math.floor(parseInt(gasPrice.toString()) * 1.2).toString(
        16
      )}`,
      nonce: _nonce,
    });

    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

app.get("/", (req, res, next) => {
  return res.status(200).json({
    message: "Hello from root!",
  });
});

app.get(
  "/makeNFT",
  async (req: Request<{}, {}, {}, Params>, res: Response, next) => {
    try {
      if (req.query.address)
        await makeNFT(
          req.query.address,
          req.query.tokenuri,
          nonce.toString()
        ).then((result) => {
          res.status(200);
          res.send(result);
        });
      console.log("Minted", nonce);
      nonce += 1;
    } catch (error: any) {
      // Handle errors
      console.error(error);
      res.status(500);
      res.json({ error: error.message });
    }
  }
);

app.get(
  "/viewNFT",
  async (req: Request<{}, {}, {}, Params>, res: Response, next) => {
    try {
      // Get native balance

      viewNFTOwner().then((result) => {
        res.status(200);
        res.send(result);
      });
    } catch (error: any) {
      // Handle errors
      console.error(error);
      res.status(500);
      res.json({ error: error.message });
    }
  }
);

app.use((req: Request<{}, {}, {}, Params>, res: Response, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

//서버 가동 시 실행하는 동작이다.
app.listen(PORT, () => console.log("server running..", PORT));
