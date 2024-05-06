import express, { Request, Response, NextFunction, response } from "express";
import pool from "../config/database";
import { FieldPacket } from "mysql2/promise";
import { userInfo, Params, nftInfo, friendInfo, nft } from "../config/type";

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
}


// app.get('/getUserByAddress', async (req: Request, res: Response, next: NextFunction) => {

// });
