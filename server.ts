//express를 import 한다. JavaScript에서는 'const express = require('express')'가 일반적이다.
import express, { Request, Response, NextFunction } from "express";
import contractAbi from "./abi.json";
import dotenv from "dotenv";
import Web3 from "web3";
import { FieldPacket } from "mysql2/promise";
import pool from "./config/database";
import { UserInfo, Params, NFTInfo, NFT } from "./config/type";
import UserController from "./controllers/user"
import NFTController from "./controllers/nft";

let path;
switch (process.env.NODE_ENV) {
  case "development":
    path = `~/YONSEI_NFT_back/.env.development`;
    break;
  case "production":
    path = `~/YONSEI_NFT_back/.env.production`;
    break;
  default:
    path = `~/YONSEI_NFT_back/.env.development`;
}
dotenv.config({ path: path })
console.log(process.env.PORT)

const app = express();
const cors = require("cors");
const PORT = process.env.PORT;

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const userController = new UserController();
const nftController = new NFTController();

app.get("/", (req, res, next) => {
  return res.status(200).json({
    message: "Hello from root!",
  });
});

// User API
app.get('/getUserByAddress', userController.getUserByAddress)

app.get('/getUserByNumber', userController.getUserByNumber)

app.post('/addNewUser', userController.addNewUser)

app.post('/editTattoInfo', userController.editTattoInfo)

app.post('/registerFriend', userController.registerFriend)


// NFT API
app.get('/getNFTsByUserAddress', nftController.getNFTsByUserAddress)

app.get('/getNFTInfos', nftController.getNFTInfos)

app.post('/addNFTInfo', nftController.addNFTInfo)

app.post('/mint', nftController.mint)

// Error middle ware
app.use((req: Request<{}, {}, {}, Params>, res: Response, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

//서버 가동 시 실행하는 동작이다.
app.listen(PORT, () => console.log("server running..", PORT));
