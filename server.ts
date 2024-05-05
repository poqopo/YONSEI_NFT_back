//express를 import 한다. JavaScript에서는 'const express = require('express')'가 일반적이다.
import express, { Request, Response, NextFunction } from "express";
import contractAbi from "./abi.json";
import dotenv from "dotenv";
import Web3 from "web3";
import { FieldPacket } from "mysql2/promise";
import pool from "./config/database";
import { userInfo, Params, nftInfo, friendInfo } from "./config/type";

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
      // "0x5E110fa7AF046E93f4c8BFF4eE82e7Aaa74c4eeB"
      "0xf46C5bdA488f911A7a59f14b0bb3bc5916098233"
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
    const { address } = req.query;
    const conn = await pool(); // 데이터베이스 연결을 비동기로 처리
    const query = `SELECT * FROM MYYONSEINFT.user WHERE address = ?`

    const [results]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(query, [address]);
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
    const query = `SELECT * FROM MYYONSEINFT.user WHERE studentNumber = ?`

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
    const { address } = req.query;
    const conn = await pool(); // 데이터베이스 연결을 비동기로 처리
    const query = `SELECT * FROM MYYONSEINFT.NFTs WHERE address = ?`

    const [results]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(query, [address]);

    res.status(200).json({ results });
} catch (error : any) {
  console.error('Error while writing NFT info:', error.message); // 콘솔에 에러 메시지 출력
  res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
  next(error);
}
});

app.get('/getEventUsers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conn = await pool(); // 데이터베이스 연결을 비동기로 처리
    const query = `SELECT * FROM MYYONSEINFT.user WHERE participateEvent = 1`

    const [results]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(query);

    res.status(200).json({ results });
} catch (error : any) {
  console.error('Error while calling User info:', error.message); // 콘솔에 에러 메시지 출력
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
    const { major, baseURI, nftCount } = req.body; 
    const conn = await pool();
    const query = `INSERT INTO MYYONSEINFT.NFTInfo (major, baseURI, nftCount)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
    baseURI = VALUES(baseURI), nftCount = VALUES(nftCount);`
    await conn.query<nftInfo[]>(query, [major, baseURI, nftCount]); // 파라미터화된 쿼리 사용

    res.status(200).json({ result : "SUCCESS" });
  } catch (error : any) {
    console.error('Error while writing NFT info:', error.message); // 콘솔에 에러 메시지 출력
    res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
    next(error);
  }
});


app.post('/tattooClaim', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conn = await pool();
    const { address } = req.body;
    const checkQuery = `SELECT * FROM MYYONSEINFT.user WHERE address = '${address}'`
    const [result]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(checkQuery);

    if (result.length > 0) {
      if (result[0].participateEvent === 1 ) {
        if (result[0].claim === 1) {
          res.status(803).json({ result: "ALREADY CLAIMED!" })
        } else {
          const query = `UPDATE MYYONSEINFT.user SET claim = 1 WHERE address = ?`;
          await conn.query(query, [address]);
          res.status(200).json({ result: "SUCCESS" })
        }
      } else {
        res.status(802).json({ result: "YOU DIDN'T PARTICIPATE EVENT" })
      }
    } else {
      res.status(801).json({ result: "YOU DIDN'T MINT NFT" })
    }
  } catch (error: any) {
    console.error('Error while writing NFT info:', error.message);
    res.status(800).json({ result: "FAIL", message: error.message })
    next(error);
  }

});

app.post('/mint', async (req: Request, res: Response, next: NextFunction) => {
  try {
      const conn = await pool();
      const { address, major, studentNumber } = req.body;

      // Check Valid Address
      if (address.length !== 42) {
          return res.status(400).json({result : "NOT VALID ADDRESS"});
      }

      const userQuery = `SELECT maxMintCount, nftCount FROM MYYONSEINFT.user WHERE address = ?`
      const [userResults] : [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(userQuery, [address]);

      // Check MaxCap
      if (userResults.length !== 0 && userResults[0].nftCount >= userResults[0].maxMintCount) {
          return res.status(403).json({result : "이미 팜희가 너무 많아요!"});
      }

      // Check studentNumber
      const studentQuery = `SELECT * FROM MYYONSEINFT.user WHERE studentNumber = ?`
      const [studentResults] : [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(studentQuery, [studentNumber]);
      if (studentResults.length !== 0  && studentResults[0].address !== address) {
        return res.status(403).json({result : "이미 사용된 학번입니다."});
    }

      const majorQuery = `SELECT * FROM MYYONSEINFT.NFTInfo WHERE major = ?`
      const [results] : [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(majorQuery, [major]);

      // Check VALID MAJOR
      if (results.length === 0) {
          return res.status(404).json({result : "해당 학과는 준비중입니다."});
      }
      const info = results[0];
      let nftId = getRandom(info.nftCount);
      // const tokenuri = `${info.baseURI}/${nftId}.json`;
      const tokenuri = `${info.baseURI}/1.json`;


      try {
        makeNFT(address, tokenuri, nonce.toString()).then(async (result : any) =>{
          const tx = result.logs[0].transactionHash
          const nftQuery = `INSERT INTO MYYONSEINFT.NFTs
          (txId, address, major, tokenURI, createdAt)
          VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP);`;
          await conn.query(nftQuery, [tx, address, major, tokenuri]);
            if(userResults.length === 0) {
              try {
                const userQuery = `INSERT INTO MYYONSEINFT.user (
                  address, 
                  studentNumber, 
                  maxMintCount, 
                  claim, 
                  nftCount, 
                  friend, 
                  participateEvent
              ) VALUES ( ?, ?, 1, 0, 1, '', 0 )`
                 await conn.query(userQuery, [address, studentNumber]);
                 return res.status(200).json({ result : "SUCCESS", url : tokenuri});
  
              } catch(e) {
                return res.status(405).json({ result : "ERROR가 발생하였습니다."});
              }
            } else {
              const userQuery = `UPDATE MYYONSEINFT.user SET nftCount = ${userResults[0].nftCount +1 } WHERE address=?;`
              await conn.query(userQuery, [address]);
              return res.status(200).json({ result : "분양 성공!"});
            }
        });
        console.log("Minted", nonce);
        nonce += 1;
      } catch (error: any) {
        console.error(error);
        res.status(500).json({ result: "SOMETHING WRONG IN TRANSACTION" });
    }



  } catch (error: any) {
    console.error(error);
    res.status(500).json({ result: "SOMETHING WRONG IN TRANSACTION" });
}
});

app.post('/findFriend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conn = await pool();
    const { address, friendNumber } = req.body;

    //CHECK Do NOT HAVE FRIEND
    const meQuery = `SELECT friend FROM user WHERE address = ?`;

    // 쿼리 실행 및 결과 타입 명시
    const [meResult]: [friendInfo[], FieldPacket[]] = await conn.query<friendInfo[]>(meQuery, [address]);
    
    // 결과 배열에서 첫 번째 요소의 friend 속성 접근
    if (meResult.length === 0) {
      return res.status(403).json({result : "USER 등록이 안된 사용자입니다."})
    }
    if (meResult[0].friend !== null) {
      return res.status(403).json({result : "이미 친구 이벤트에 참가하셨습니다."})
    }

        //CHECK Do NOT HAVE FRIEND
    const friendQuery = `SELECT friend FROM user WHERE studentNumber = ?`;

        // 쿼리 실행 및 결과 타입 명시
    const [freindResult]: [friendInfo[], FieldPacket[]] = await conn.query<friendInfo[]>(friendQuery, [friendNumber]);

        // 결과 배열에서 첫 번째 요소의 friend 속성 접근
    if (freindResult.length === 0) {
      return res.status(403).json({result : "친구가 USER 등록이 안되었습니다."})
    }
    if (freindResult[0].friend !== null) {
      return res.status(403).json({result : "친구가 이미 친구 이벤트에 참가하셨습니다."})
    }

    const checkQuery = `SELECT a.tokenURI FROM NFTs a
      JOIN NFTs b ON a.tokenURI = b.tokenURI AND a.address != b.address
      JOIN user me ON me.address = a.address
      JOIN user friend ON friend.address = b.address
      WHERE me.address = ? AND friend.studentNumber = ?;`
    const [results]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(checkQuery, [address, friendNumber]);
    if (results.length > 0) {
      try {
        const meQuery = `UPDATE user AS me JOIN user AS friend ON friend.studentNumber = ?
         SET me.friend = friend.address WHERE me.address = ?`
        await conn.query<userInfo[]>(meQuery, [friendNumber, address]);

        const friendQuery = `UPDATE user AS me JOIN user AS friend ON friend.studentNumber = ?
         SET friend.friend = me.address WHERE me.address = ?;`
        await conn.query<userInfo[]>(friendQuery, [friendNumber, address]);
        return res.status(200).json({ result : "이벤트 참여 완료!."});
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
