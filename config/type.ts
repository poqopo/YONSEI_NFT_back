import { RowDataPacket } from "mysql2/promise";

export interface Params {
    address: string;
    tokenuri: string;
  }

  
export interface userInfo extends RowDataPacket {
    address: string
    studentNumber: string
    maxMintCount: number
    nftCount: number
    friend : string
    participateEvent : number
    claim : number
}

export interface nftInfo extends RowDataPacket {
  major: string
  baseURI: string
  nftCount: number
}

export interface claimInfo extends RowDataPacket {
  claim : number
}

export interface friendInfo extends RowDataPacket {
  address: string
  studentNumber: string
  friend : string
  participateEvent : number
  claim : number
}

