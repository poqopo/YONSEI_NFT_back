import express, { Request, Response, NextFunction, response } from "express";
import pool from "../config/database";
import { FieldPacket } from "mysql2/promise";
import { userInfo, Params, nftInfo,  nft } from "../config/type";

export default class UserController {

  async getUserByAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { userAddress } = req.query;
      const conn = await pool(); // 데이터베이스 연결을 비동기로 처리
      const query = `
      SELECT * 
      FROM MYYONSEINFT.userInfo 
      WHERE userAddress = ?
      `

      const [results]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(query, [userAddress]);
      res.status(200).json({ results });
    } catch (error : any) {
      console.error('Error while writing NFT info:', error.message); // 콘솔에 에러 메시지 출력
      res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
      next(error);
    }
  }

  async getUserByNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentNumber } = req.query;
      const conn = await pool(); // 데이터베이스 연결을 비동기로 처리
      const query = `
      SELECT * 
      FROM MYYONSEINFT.userInfo 
      WHERE studentNumber = ?
      `
  
      const [results]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(query, [studentNumber]);
      res.status(200).json({ results });
    } catch (error : any) {
      console.error('Error while writing NFT info:', error.message); // 콘솔에 에러 메시지 출력
      res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
      next(error);
    }
  }

  async addNewUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userAddress, studentNumber, major } = req.body; 
      const conn = await pool();
  
        // Check studentNumber
      const studentQuery = `
      SELECT * 
      FROM MYYONSEINFT.userInfo 
      WHERE studentNumber = ?
      `
        const [studentResults] : [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(studentQuery, [studentNumber]);
        if (studentResults.length !== 0  && studentResults[0].address !== userAddress) {
          return res.status(403).json({result : "이미 사용된 학번입니다."});
      }
  
      const query = `
      INSERT INTO MYYONSEINFT.userInfo
      (userAddress, studentNumber, maxMintableNumber, ownedNFTNumber, friendAddress, major)
      VALUES(?, ?, 1, 0, '', ?);`
      await conn.query<nftInfo[]>(query, [userAddress, studentNumber, major]); // 파라미터화된 쿼리 사용
  
      res.status(200).json({ result : "SUCCESS" });
    } catch (error : any) {
      console.error('Error while writing userinfo:', error.message); // 콘솔에 에러 메시지 출력
      res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
      next(error);
    }
  }
  
  async registerFriend(req: Request, res: Response, next: NextFunction) {
    try {
      const conn = await pool();
      const { userAddress, friendNumber } = req.body;
  
      //CHECK Do NOT HAVE FRIEND
      const meQuery = `
      SELECT * 
      FROM MYYONSEINFT.userInfo 
      WHERE userAddress = ?`;
  
      // 쿼리 실행 및 결과 타입 명시
      const [meResult]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(meQuery, [userAddress]);
      // 결과 배열에서 첫 번째 요소의 friend 속성 접근
      if (meResult.length === 0) {
        return res.status(403).json({result : "USER 등록이 안된 사용자입니다."})
      }
      if (meResult[0].friendAddress !== null) {
        return res.status(403).json({result : "이미 친구 이벤트에 참가하셨습니다."})
      }
  
          //CHECK Do NOT HAVE FRIEND
      const friendQuery = `
      SELECT friendAddress 
      FROM userInfo 
      WHERE studentNumber = ?`;
  
          // 쿼리 실행 및 결과 타입 명시
      const [freindResult]: [userInfo[], FieldPacket[]] = await conn.query<userInfo[]>(friendQuery, [friendNumber]);
  
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
  }
}



