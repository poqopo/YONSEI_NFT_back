import { RowDataPacket } from "mysql2/promise";

export interface Params {
    address: string;
    tokenuri: string;
  }

  
export interface userInfo extends RowDataPacket {
    userAddress: string
    studentNumber: string
    maxMintableNumber: number
    ownedNFTNumber: number
    friendAddress : string
    major : string
}

export interface nft extends RowDataPacket {
  tokenURI : string
  nftName : string
  description : string
}

export interface nftInfo extends RowDataPacket {
  major: string
  baseURI: string
  nftCount: number
}

export interface claimInfo extends RowDataPacket {
  claim : number
}

