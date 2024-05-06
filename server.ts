//express를 import 한다. JavaScript에서는 'const express = require('express')'가 일반적이다.
import express, { Request, Response, NextFunction } from "express";
import contractAbi from "./abi.json";
import dotenv from "dotenv";
import Web3 from "web3";
import { FieldPacket } from "mysql2/promise";
import pool from "./config/database";
import { userInfo, Params, nftInfo, friendInfo, nft } from "./config/type";

dotenv.config();

const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


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

function getRandom(max : number)
{
	return Math.floor(Math.random() * (max) + 1);
}

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

app.get("/", (req, res, next) => {
  return res.status(200).json({
    message: "Hello from root!",
  });
});

app.get('/getUserByAddress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userAddress } = req.query;
    const conn = await pool(); // 데이터베이스 연결을 비동기로 처리
    const query = `SELECT * FROM MYYONSEINFT.userInfo WHERE userAddress = ?`

    const [results]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(query, [userAddress]);
    res.status(200).json({ results });
} catch (error : any) {
  console.error('Error while writing NFT info:', error.message); // 콘솔에 에러 메시지 출력
  res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
  next(error);
}
});

app.get('/getUserByNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentNumber } = req.query;
    const conn = await pool(); // 데이터베이스 연결을 비동기로 처리
    const query = `SELECT * FROM MYYONSEINFT.userInfo WHERE studentNumber = ?`

    const [results]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(query, [studentNumber]);

    res.status(200).json({ results });
} catch (error : any) {
  console.error('Error while writing NFT info:', error.message); // 콘솔에 에러 메시지 출력
  res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
  next(error);
}
});

app.get('/getUserNFTs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userAddress } = req.query;
    const conn = await pool(); // 데이터베이스 연결을 비동기로 처리
    const query = `SELECT NFTs.tokenURI, NFTInfo.nftName, NFTInfo.description FROM MYYONSEINFT.NFTs
    JOIN MYYONSEINFT.NFTInfo ON NFTs.tokenURI = NFTInfo.tokenURI WHERE NFTs.ownerAddress = ?;`

    const [results]: [nft[], FieldPacket[]] = await conn.query<nft[]>(query, [userAddress]);

    res.status(200).json({ results });
} catch (error : any) {
  console.error('Error while writing NFT info:', error.message); // 콘솔에 에러 메시지 출력
  res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
  next(error);
}
});

app.get('/getNFTInfos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conn = await pool(); // 데이터베이스 연결을 비동기로 처리
    const query = `SELECT * FROM MYYONSEINFT.NFTInfo;`

    const [results]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(query);

    res.status(200).json({ results });
} catch (error : any) {
  console.error('Error while calling User info:', error.message); // 콘솔에 에러 메시지 출력
  res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
  next(error);
}
});

app.post('/writeNFTInfo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { major, tokenURI, nftName, description } = req.body; 
    const conn = await pool();
    const query = `INSERT INTO MYYONSEINFT.NFTInfo (major, tokenURI, nftName, description)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    tokenURI = VALUES(tokenURI), nftName = VALUES(nftName), description= VALUES(description);`
    await conn.query<nftInfo[]>(query, [major, tokenURI, nftName, description]); // 파라미터화된 쿼리 사용

    res.status(200).json({ result : "SUCCESS" });
  } catch (error : any) {
    console.error('Error while writing NFT info:', error.message); // 콘솔에 에러 메시지 출력
    res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
    next(error);
  }
});

app.post('/addNewUser', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userAddress, studentNumber, major } = req.body; 
    const conn = await pool();

      // Check studentNumber
    const studentQuery = `SELECT * FROM MYYONSEINFT.userInfo WHERE studentNumber = ?`
      const [studentResults] : [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(studentQuery, [studentNumber]);
      if (studentResults.length !== 0  && studentResults[0].address !== userAddress) {
        return res.status(403).json({result : "이미 사용된 학번입니다."});
    }

    const query = `INSERT INTO MYYONSEINFT.userInfo
    (userAddress, studentNumber, maxMintableNumber, ownedNFTNumber, friendAddress, major)
    VALUES(?, ?, 1, 0, '', ?);`
    await conn.query<nftInfo[]>(query, [userAddress, studentNumber, major]); // 파라미터화된 쿼리 사용

    res.status(200).json({ result : "SUCCESS" });
  } catch (error : any) {
    console.error('Error while writing userinfo:', error.message); // 콘솔에 에러 메시지 출력
    res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
    next(error);
  }
});


app.post('/mint', async (req: Request, res: Response, next: NextFunction) => {
  try {
      const conn = await pool();
      const { userAddress, major } = req.body;

      // Check Valid userAddress
      if (userAddress.length !== 42) {
          return res.status(400).json({result : "NOT VALID ADDRESS"});
      }

      const userQuery = `SELECT maxMintableNumber, ownedNFTNumber FROM MYYONSEINFT.userInfo WHERE userAddress = ?`
      const [userResults] : [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(userQuery, [userAddress]);

      // Check MaxCap
      if (userResults.length !== 0 && userResults[0].ownedNFTNumber >= userResults[0].maxMintableNumber) {
          return res.status(403).json({result : "이미 팜희가 너무 많아요!"});
      }

      const majorQuery = `SELECT * FROM MYYONSEINFT.NFTInfo WHERE major = ?`
      const [results] : [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(majorQuery, [major]);

      // Check VALID MAJOR
      if (results.length === 0) {
          return res.status(404).json({result : "해당 학과는 준비중입니다."});
      }
      let nftId = getRandom(results.length);
      const tokenuri = results[nftId-1].tokenURI;

      try {
        makeNFT(userAddress, tokenuri, nonce.toString()).then(async (result : any) =>{
          const tx = result.logs[0].transactionHash
          const tokenId = (Number(result.events.Transfer.returnValues.tokenId))
          const nftQuery = `INSERT INTO MYYONSEINFT.NFTs
          (txId, ownerAddress, major, tokenURI, createdAt, tokenId, collectionAddress)
          VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?);`;
          await conn.query(nftQuery, [tx, userAddress, major, tokenuri, tokenId, process.env.CONTRACT]);
          try{
            const userQuery = `UPDATE MYYONSEINFT.userInfo SET ownedNFTNumber = ${userResults[0].ownedNFTNumber +1 } WHERE userAddress=?;`
            await conn.query(userQuery, [userAddress]);
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
});

app.post('/registerFriend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conn = await pool();
    const { userAddress, friendNumber } = req.body;

    //CHECK Do NOT HAVE FRIEND
    const meQuery = `SELECT * FROM MYYONSEINFT.userInfo WHERE userAddress = ?`;

    // 쿼리 실행 및 결과 타입 명시
    const [meResult]: [friendInfo[], FieldPacket[]] = await conn.query<friendInfo[]>(meQuery, [userAddress]);
    // 결과 배열에서 첫 번째 요소의 friend 속성 접근
    if (meResult.length === 0) {
      return res.status(403).json({result : "USER 등록이 안된 사용자입니다."})
    }
    if (meResult[0].friendAddress !== null) {
      return res.status(403).json({result : "이미 친구 이벤트에 참가하셨습니다."})
    }

        //CHECK Do NOT HAVE FRIEND
    const friendQuery = `SELECT friendAddress FROM userInfo WHERE studentNumber = ?`;

        // 쿼리 실행 및 결과 타입 명시
    const [freindResult]: [friendInfo[], FieldPacket[]] = await conn.query<friendInfo[]>(friendQuery, [friendNumber]);

        // 결과 배열에서 첫 번째 요소의 friend 속성 접근
    if (freindResult.length === 0) {
      return res.status(403).json({result : "친구가 USER 등록이 안되었습니다."})
    }
    if (freindResult[0].friendAddress !== null) {
      return res.status(403).json({result : "친구가 이미 친구 이벤트에 참가하셨습니다."})
    }

    const checkQuery = `
    SELECT a.tokenURI, a.ownerAddress as myAddress, b.ownerAddress as friendAddress
    FROM NFTs a
    JOIN NFTs b ON a.tokenURI = b.tokenURI AND a.ownerAddress != b.ownerAddress
    JOIN userInfo me ON me.userAddress = a.ownerAddress
    JOIN userInfo friend ON friend.userAddress = b.ownerAddress
    WHERE me.userAddress = ? AND friend.studentNumber = ?
  `;
    const [results]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(checkQuery, [userAddress, friendNumber]);
    if (results.length > 0) {
      try {
        const friendUserAddress = results[0].friendAddress;

        const meQuery = `UPDATE userInfo SET friendAddress = ? WHERE userAddress = ?`
        await conn.query<userInfo[]>(meQuery, [friendUserAddress, userAddress]);

        const friendQuery = `UPDATE userInfo SET friendAddress = ? WHERE userAddress = ?`
        await conn.query<userInfo[]>(friendQuery, [userAddress, friendUserAddress]);
        return res.status(200).json({ result : "이벤트 참여 완료!"});
      } catch(e) {
        return res.status(403).json({ result : "ERROR가 발생하였습니다."});
      }
    } else {
      return res.status(403).json({ result: "겹치는 NFT가 없습니다." });
    }
  } catch (error: any) {
    console.error('Error while writing NFT info:', error.message);
    res.status(800).json({ result: "FAIL", message: error.message });
    next(error);
  }

});


app.use((req: Request<{}, {}, {}, Params>, res: Response, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

//서버 가동 시 실행하는 동작이다.
app.listen(PORT, () => console.log("server running..", PORT));
