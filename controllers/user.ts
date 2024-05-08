import express, { Request, Response, NextFunction, response } from "express";
import pool from "../config/database";
import { FieldPacket } from "mysql2/promise";
import { UserInfo, Params, NFTInfo,  NFT } from "../config/type";

export default class UserController {

  async getUserByAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { userAddress } = req.query;
      const conn = await pool(); // 데이터베이스 연결을 비동기로 처리

      const [results]: [UserInfo[], FieldPacket[]] = await conn.query<UserInfo[]>(
        `SELECT * 
        FROM userInfo 
        WHERE userAddress = ?`
      , [userAddress]);

      conn.end();
      return res.status(200).json({ results });
    } catch (error : any) {
      console.error('Error while writing NFT info:', error.message); // 콘솔에 에러 메시지 출력
      next(error);
      return res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
    }
  }

  async getUserByNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentNumber } = req.query;
      const conn = await pool(); // 데이터베이스 연결을 비동기로 처리
  
      const [results]: [UserInfo[], FieldPacket[]] = await conn.query<UserInfo[]>(
        `SELECT * 
        FROM userInfo 
        WHERE studentNumber = ?`
      , [studentNumber]);

      conn.end();
      return res.status(200).json({ results });
    } catch (error : any) {
      console.error('Error while writing NFT info:', error.message); // 콘솔에 에러 메시지 출력
      next(error);
      return res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
    }
  }

  async addNewUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userAddress, studentNumber, major } = req.body; 
      const conn = await pool();
  
      const [userInfos] : [UserInfo[], FieldPacket[]] = await conn.query<UserInfo[]>(
        `SELECT * 
        FROM userInfo 
        WHERE studentNumber = ?`
      , [studentNumber]);

      if (userInfos.length > 1) {
        return res.status(500).json({result: "2개 이상 있으면 안 되는데... 이상한데...?"}); // 일단 status code 뭐로 할지 몰라서 500대로...
      }
      if (userInfos.length === 1 && userInfos[0].studentNumber === studentNumber) {
        return res.status(403).json({result : "이미 사용된 학번입니다."});
      }
      if (userInfos.length === 1 && userInfos[0].userAddress === userAddress) {
        return res.status(403).json({result : "이미 사용된 지갑 주소입니다."});
      }
  
      await conn.query<NFTInfo[]>(
        `INSERT INTO userInfo
        (userAddress, studentNumber, maxMintableNumber, ownedNFTNumber, friendAddress, major)
        VALUES(?, ?, 1, 0, ?, ?);`
      , [userAddress, studentNumber, null, major]); // userInfo 추가 쿼리
  
      conn.end();
      return res.status(200).json({ result : "SUCCESS" });
    } catch (error : any) {
      console.error('Error while writing userinfo:', error.message); // 콘솔에 에러 메시지 출력
      next(error);
      return res.status(403).json({ result: "FAIL", message: error.message }); // 클라이언트에게 에러 메시지 전송
    }
  }
  
  async registerFriend(req: Request, res: Response, next: NextFunction) {
    try {
      const conn = await pool();
      const { userAddress, friendStudentNumber } = req.body;

      // friendStudentNumber 학번 규격 맞는지 체크 -> 이건 FE에서 검토 후 보내기??
  
      // 자신의 user info 체크
      const [myUserInfoResult]: [UserInfo[], FieldPacket[]] = await conn.query<UserInfo[]>(
        `SELECT * 
        FROM userInfo 
        WHERE userAddress = ?`
      , [userAddress]);

      const myUserInfo = myUserInfoResult[0]
      if (myUserInfo === undefined) {
        return res.status(403).json({result : "USER 등록이 안된 사용자입니다."})
      }
      if (myUserInfo.friendAddress !== null) {
        return res.status(403).json({result : "이미 친구 이벤트에 참여하였습니다."})
      }
      if (myUserInfo.studentNumber === friendStudentNumber) {
        return res.status(403).json({result : "나의 학번입니다."})
      }
  
      // 친구의 user info 체크
      const [friendUserInfoResult]: [UserInfo[], FieldPacket[]] = await conn.query<UserInfo[]>(
        `SELECT * 
        FROM userInfo 
        WHERE studentNumber = ?`
      , [friendStudentNumber]);

      const friendUserInfo = friendUserInfoResult[0]
      if (friendUserInfo === undefined) {
        return res.status(403).json({result : "친구가 USER 등록이 안 되었습니다."})
      }
      if (friendUserInfo.friendAddress !== null) {
        return res.status(403).json({result : "친구가 이미 친구 이벤트에 참여하였습니다."})
      }

      // 독팜희를 분양했는지 체크
      const [myNFTs]: [NFT[], FieldPacket[]] = await conn.query<NFT[]>(
        `SELECT *
        FROM NFTs
        WHERE ownerAddress = ?`
      , [myUserInfo.userAddress]);

      if (myNFTs.length === 0) {
        return res.status(403).json({result : "나의 독팜희가 없습니다. 새로 독팜희를 분양하세요."})
      }

      const [friendNFTs]: [NFT[], FieldPacket[]] = await conn.query<NFT[]>(
        `SELECT *
        FROM NFTs
        WHERE ownerAddress = ?`
      , [friendUserInfo.userAddress]);

      if (friendNFTs.length === 0) {
        return res.status(403).json({result : "친구의 독팜희가 없습니다. 새로 독팜희를 분양하라고 하세요."})
      }
  
      // 내가 가진 NFT와 친구가 가진 NFT 중에서 같은 NFT가 있는지 확인
      const [sameNFTsResults]: [UserInfo[], FieldPacket[]] = await conn.query<UserInfo[]>(
        `SELECT myNFTs.tokenURI, myNFTs.ownerAddress, friendNFTs.ownerAddress
        FROM NFTs myNFTs
        JOIN NFTs friendNFTs ON myNFTs.tokenURI = friendNFTs.tokenURI AND myNFTs.ownerAddress != friendNFTs.ownerAddress
        JOIN userInfo myInfo ON myInfo.userAddress = myNFTs.ownerAddress
        JOIN userInfo friendInfo ON friendInfo.userAddress = friendNFTs.ownerAddress
        WHERE myInfo.userAddress = ? AND friendInfo.studentNumber = ?`
      , [myUserInfo.userAddress, friendStudentNumber]);

      if (sameNFTsResults.length === 0) {
        return res.status(403).json({ result: "친구와 겹치는 NFT가 없습니다." });
      }

      // 내 userInfo에 친구를 friend로 등록
      await conn.query<UserInfo[]>(
        `UPDATE userInfo 
        SET friendAddress = ? 
        WHERE userAddress = ?`
      , [friendUserInfo.userAddress, myUserInfo.userAddress]);

      // 친구 userInfo에 나를 friend로 등록
      await conn.query<UserInfo[]>(
        `UPDATE userInfo 
        SET friendAddress = ? 
        WHERE userAddress = ?`
      , [myUserInfo.userAddress, friendUserInfo.userAddress]);

      conn.end();
      return res.status(200).json({ result : "이벤트 참여 완료!"});
    } catch (error: any) {
      next(error);
      return res.status(800).json({ result: "FAIL", message: error.message });
    }
  }
}



