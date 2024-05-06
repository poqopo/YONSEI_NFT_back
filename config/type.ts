import { RowDataPacket } from "mysql2/promise";

export interface Params {
    address: string;
    tokenuri: string;
  }

  
export interface UserInfo extends RowDataPacket {
    userAddress: string
    studentNumber: string
    maxMintableNumber: number
    ownedNFTNumber: number
    friendAddress : string
    major : string
}

export interface NFT extends RowDataPacket {
  txId : string
  ownerAddress : string
  major : string
  // nftName : string //이거 NFT 테이블에서 nftName 칼럼 추가해야 함
  tokenURI : string
  tokenId : string
  collectionAddress : string
}

export interface NFTInfo extends RowDataPacket {
  major: string
  tokenURI: string
  nftName: string
  description: string
}

