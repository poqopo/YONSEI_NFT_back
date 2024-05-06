import express, { Request, Response, NextFunction, response } from "express";
import pool from "../config/database";
import { FieldPacket } from "mysql2/promise";
import { UserInfo, Params, NFTInfo, NFT } from "../config/type";
import dotenv from "dotenv";
import Web3 from "web3";
import contractAbi from "../abi.json";

dotenv.config();

function getRandom(max : number) {
  return Math.floor(Math.random() * (max) + 1);
}

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

async function makeNFT(address: string, uri: string, _nonce: string) {
  try {
    const nftContract = new web3.eth.Contract(
      contractAbi,
      process.env.CONTRACT
    );
    const gas = await nftContract.methods
      .safeMint(address, uri)
      .estimateGas({ from: account.address });
    const gasPrice = await web3.eth.getGasPrice();

    const result = await nftContract.methods.safeMint(address, uri).send({
      from: account.address,
      gas: `0x${gas.toString(16)}`,
      gasPrice: `0x${Math.floor(parseInt(gasPrice.toString()) * 1.2).toString(
        16
      )}`,
      nonce: _nonce,
    });

    return result;
  } catch (e) {
    console.log(e);
    return e;
  }
}


export default class NFTController {
  async getNFTsByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userAddress } = req.query;
      const conn = await pool(); // 데이터베이스 연결을 비동기로 처리
  
      const [results]: [NFT[], FieldPacket[]] = await conn.query<NFT[]>(
        `SELECT NFTs.tokenURI, NFTInfo.nftName, NFTInfo.description 
        FROM MYYONSEINFT.NFTs
        JOIN MYYONSEINFT.NFTInfo 
        ON NFTs.tokenURI = NFTInfo.tokenURI 
        WHERE NFTs.ownerAddress = ?;`
      , [userAddress]);
  
      res.status(200).json({ results });
    } catch (error : any) {
      console.error('Error while writing NFT info:', error.message); // 콘솔에 에러 메시지 출력
      res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
      next(error);
    }
  }
  
  async getNFTInfos(req: Request, res: Response, next: NextFunction) {
    try {
      const conn = await pool(); // 데이터베이스 연결을 비동기로 처리
  
      const [results]: [NFTInfo[], FieldPacket[]] = await conn.query<NFTInfo[]>(
        `SELECT * 
        FROM MYYONSEINFT.NFTInfo;`
      );
  
      res.status(200).json({ results });
    } catch (error : any) {
      console.error('Error while calling User info:', error.message); // 콘솔에 에러 메시지 출력
      res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
      next(error);
    }
  }

  async addNFTInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { major, tokenURI, nftName, description } = req.body; 
      const conn = await pool();

      await conn.query<NFTInfo[]>(
        `INSERT INTO MYYONSEINFT.NFTInfo (major, tokenURI, nftName, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        tokenURI = VALUES(tokenURI), nftName = VALUES(nftName), description= VALUES(description);`
      , [major, tokenURI, nftName, description]); // 파라미터화된 쿼리 사용

      res.status(200).json({ result : "SUCCESS" });
    } catch (error : any) {
      console.error('Error while writing NFT info:', error.message); // 콘솔에 에러 메시지 출력
      res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
      next(error);
    }
  }

  async mint(req: Request, res: Response, next: NextFunction) {
    try {
      const conn = await pool();
      const { userAddress, major } = req.body;
      // const { userAddress, major } = req.query;

      console.log("userAddress", userAddress)
      // Check Valid userAddress
      if (userAddress.length !== 42) {
          return res.status(400).json({result : "NOT VALID ADDRESS"});
      }

      const [userResults] : [UserInfo[], FieldPacket[]] = await conn.query<UserInfo[]>(
        `SELECT maxMintableNumber, ownedNFTNumber 
        FROM MYYONSEINFT.userInfo 
        WHERE userAddress = ?`
      , [userAddress]);

      // Check MaxCap
      if (userResults.length !== 0 && userResults[0].ownedNFTNumber >= userResults[0].maxMintableNumber) {
          return res.status(403).json({result : "이미 팜희가 너무 많아요!"});
      }

      const [results] : [NFTInfo[], FieldPacket[]] = await conn.query<NFTInfo[]>(
        `SELECT * 
        FROM MYYONSEINFT.NFTInfo 
        WHERE major = ?`
      , [major]);

      // Check VALID MAJOR
      if (results.length === 0) {
          return res.status(404).json({result : "해당 학과는 준비중입니다."});
      }
      const nftCount = results.length
      let nftId = getRandom(nftCount);
      const tokenuri = results[nftId-1].tokenURI;

      try {
        makeNFT(userAddress, tokenuri, nonce.toString()).then(async (result : any) =>{
          const tx = result.logs[0].transactionHash
          const tokenId = (Number(result.events.Transfer.returnValues.tokenId))

          await conn.query(
            `INSERT INTO MYYONSEINFT.NFTs
            (txId, ownerAddress, major, tokenURI, createdAt, tokenId, collectionAddress)
            VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?);`
          , [tx, userAddress, major, tokenuri, tokenId, process.env.CONTRACT]);
          try{

            await conn.query(
              `UPDATE MYYONSEINFT.userInfo 
              SET ownedNFTNumber = ${userResults[0].ownedNFTNumber +1 } 
              WHERE userAddress=?;`
            , [userAddress]);
            return res.status(200).json({ result : "SUCCESS", url : tokenuri});
          }catch(e) {
            return res.status(405).json({ result : "유저 정보를 업데이트 하는 중 ERROR가 발생하였습니다."});
          }
        });
        console.log("Minted", nonce);
        nonce += 1;
      } catch (error: any) {
        console.error(error);
        return res.status(500).json({ result: "SOMETHING WRONG IN TRANSACTION" });
      }

    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ result: "SOMETHING WRONG" });
    }
  }

}