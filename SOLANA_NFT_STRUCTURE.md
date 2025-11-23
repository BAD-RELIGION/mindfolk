# Solana NFT Structure and Addresses

## Overview

Solana NFTs are built on top of the **SPL Token Standard** with additional metadata provided by the **Metaplex Token Metadata Program**. This creates a unique structure that differs from Ethereum NFTs.

## Key Components

### 1. **Mint Account** (Mint Address)
- **Purpose**: Each NFT is associated with a unique mint account, which is the source of the token's supply
- **Uniqueness**: Each NFT has its own unique mint address
- **Supply**: NFTs typically have a supply of 1 (unlike fungible tokens)
- **Address Format**: Base58 encoded public key (e.g., `674PmuiDtgKx3uKuJ1B16f9m5L84eFvNwj3xDMvHcbo7`)

### 2. **Token Account** (Token Address)
- **Purpose**: Holds the actual NFT token and is owned by a user's wallet
- **Ownership**: Each wallet has its own token account for each NFT they own
- **Program**: Uses the SPL Token Program (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`)
- **Derivation**: Token accounts are derived from the owner's wallet and the mint address

### 3. **Metadata Account** (Metadata Address)
- **Purpose**: Stores on-chain metadata about the NFT
- **Program**: Metaplex Token Metadata Program
- **Derivation**: Derived from the mint address using a Program Derived Address (PDA)
- **Contains**:
  - Name
  - Symbol
  - URI (pointing to off-chain JSON metadata)
  - Seller fee basis points
  - Creators array
  - Update authority

### 4. **Master Edition Account** (Optional)
- **Purpose**: Defines the NFT as a master edition, allowing for prints or editions
- **Supply Control**: Controls the total supply of editions
- **Derivation**: Also derived from the mint address

## Collection Structure

### Collection Address vs Mint Address

**Important Distinction:**
- **Mint Address**: The unique identifier for a single NFT
- **Collection Address**: A grouping mechanism that links multiple NFTs together

### How Collections Work

Collections in Solana are created using the Metaplex Collection Standard:

1. **Collection NFT**: A special NFT that represents the collection itself
   - Has its own mint address (this is the "collection address")
   - Contains collection-level metadata
   - Example: `4169793782b418e3dbb9fd36b364388ceb63321a743009b9dfc2378392016a0d`

2. **Collection Verification**: Individual NFTs in a collection can be verified against the collection NFT
   - Each NFT's metadata contains a `collection` field
   - This field references the collection's mint address
   - Verification ensures the NFT belongs to the official collection

3. **Fetching NFTs by Collection**:
   - Use the collection's mint address to query for NFTs
   - APIs like Helius DAS use `getAssetsByGroup` with the collection key
   - Filter by `groupKey: "collection"` and `groupValue: <collection-mint-address>`

## Metadata Structure

### On-Chain Metadata (Metadata Account)
```json
{
  "name": "NFT Name",
  "symbol": "SYMBOL",
  "uri": "https://arweave.net/...",  // Points to off-chain JSON
  "seller_fee_basis_points": 500,
  "creators": [...],
  "collection": {
    "verified": true,
    "key": "<collection-mint-address>"
  }
}
```

### Off-Chain Metadata (URI)
```json
{
  "name": "NFT Name",
  "description": "NFT Description",
  "image": "https://...",  // Image URL
  "attributes": [
    {"trait_type": "Background", "value": "Blue"},
    {"trait_type": "Eyes", "value": "Green"}
  ],
  "properties": {...}
}
```

## Address Formats

### Base58 Encoding
- Solana addresses use Base58 encoding
- Similar to Bitcoin addresses but with a different alphabet
- Length: Typically 32-44 characters
- Example: `5nFLSDXsFGcRun4ywpEhQkfQkcGMLb1xVGFr2dtPHzEp`

### Program Derived Addresses (PDAs)
- Metadata and Master Edition addresses are PDAs
- Derived deterministically from:
  - Mint address
  - Program ID (Metaplex)
  - Seeds (specific to metadata or master edition)

## Querying NFTs

### Methods to Fetch NFTs

1. **By Collection** (using Helius DAS API):
   ```javascript
   getAssetsByGroup({
     groupKey: "collection",
     groupValue: "<collection-mint-address>",
     page: 1,
     limit: 1000
   })
   ```

2. **By Wallet**:
   ```javascript
   getAssetsByOwner({
     ownerAddress: "<wallet-address>",
     page: 1,
     limit: 1000
   })
   ```

3. **By Mint Address** (single NFT):
   ```javascript
   getAsset({
     id: "<mint-address>"
   })
   ```

### RPC Methods

1. **getParsedTokenAccountsByOwner**: Get all token accounts for a wallet
2. **getAccountInfo**: Get account data for a specific address
3. **getParsedAccountInfo**: Get parsed account data (for metadata)

## Token Balance (SPL Tokens)

For fungible tokens (like $WOOD), the structure is similar but simpler:

- **Mint Address**: The token's mint (e.g., `674PmuiDtgKx3uKuJ1B16f9m5L84eFvNwj3xDMvHcbo7`)
- **Token Account**: Holds the token balance for a specific wallet
- **Balance**: Stored as a raw amount with decimals
  - Example: 1,000,000,000 raw units = 1 token (if decimals = 9)

### Querying Token Balance

```javascript
connection.getParsedTokenAccountsByOwner(
  walletAddress,
  { mint: tokenMintAddress },
  'confirmed'
)
```

Returns:
```json
{
  "value": [{
    "pubkey": "<token-account-address>",
    "account": {
      "data": {
        "parsed": {
          "info": {
            "mint": "<token-mint-address>",
            "tokenAmount": {
              "amount": "1000000000",
              "decimals": 9,
              "uiAmount": 1.0,
              "uiAmountString": "1"
            }
          }
        }
      }
    }
  }]
}
```

## Best Practices

1. **Always verify collection membership**: Check that NFTs have verified collection metadata
2. **Use DAS API when possible**: Helius DAS API provides a cleaner interface than raw RPC calls
3. **Handle pagination**: Collections can have thousands of NFTs
4. **Cache metadata**: Off-chain metadata can be slow to fetch
5. **Use appropriate RPC endpoints**: Public RPCs are rate-limited; use Helius or other services for production

## Resources

- [Solana Program Library (SPL) Token Standard](https://spl.solana.com/token)
- [Metaplex Token Metadata](https://docs.metaplex.com/programs/token-metadata/)
- [Helius DAS API Documentation](https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)


