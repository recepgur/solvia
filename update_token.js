import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from 'fs';

async function main() {
  try {
    console.log("Loading keypair...");
    const keypairData = JSON.parse(fs.readFileSync("/home/ubuntu/.config/solana/id.json", "utf8"));
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

    console.log("Connecting to Solana...");
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const metaplex = new Metaplex(connection);
    metaplex.use(keypairIdentity(keypair));

    console.log("Finding token...");
    const mint = new PublicKey("7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ");
    const nft = await metaplex.nfts().findByMint({ mintAddress: mint });

    console.log("Current metadata:", nft);
    
    console.log("Updating metadata...");
    const { response } = await metaplex.nfts().update({
      nftOrSft: nft,
      name: "Solvio",
      symbol: "SOLV",
      uri: "https://raw.githubusercontent.com/recepgur/solvia/main/metadata.json",
      sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
      tokenStandard: nft.tokenStandard,
      isMutable: true,
      primarySaleHappened: false,
      creators: nft.creators || [],
      collection: nft.collection,
      uses: nft.uses,
      collectionDetails: nft.collectionDetails,
      ruleSet: nft.ruleSet,
      json: {
        name: "Solvio",
        symbol: "SOLV",
        description: "Solvio is a fully decentralized messaging, video calling, and voice calling platform built on the Solana blockchain.",
        external_url: "https://www.solvio.network",
        image: "https://bafybeiav42qdb3yw3wf4dnqxwuudxvlqfmndy4slumpihw3ok6vsrqvmu4.ipfs.w3s.link/solivo.png",
        seller_fee_basis_points: nft.json.seller_fee_basis_points,
        attributes: nft.json.attributes,
        properties: nft.json.properties
      }
    });

    console.log("Update successful!");
    console.log("Transaction signature:", response.signature);
  } catch (error) {
    console.error("Error:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

main();
