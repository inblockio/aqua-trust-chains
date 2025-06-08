# AQUA Protocol Trust Chains Generator

A frontend application for generating and validating off-chain trust chains using the AQUA Protocol v3 schema and Ethereum wallets.

## Features

- **Trust Chain Generation**: Create root trust anchors, intermediate delegates, and end entities
- **EIP-191 Signatures**: Cryptographic signatures using Ethereum wallets
- **DNS Registry Integration**: Validate root trust anchors against DNS TXT records
- **Revocation Support**: Generate revocation attestations
- **AQUA.json Validation**: Integration with aqua-js CLI for chain validation

## Architecture

Based on the AQUA Protocol off-chain trust chain architecture document, implementing:

- Three-tier trust hierarchy (Root → Intermediate → End-Entity)
- DNS-based root wallet registry using `aqua._wallet.<domain>` TXT records
- Form and signature revisions following AQUA v3 schema
- Revocation mechanism with dedicated form revisions
- EIP-191 signature validation

## Prerequisites

1. **Node.js v18+**
2. **AQUA JS CLI**: Located at `\wsl.localhost\Ubuntu\home\system-001\aqua-js-cli\dist\aqua.js`
3. **Ethereum Wallet DNS Bridge**: Located at `\wsl.localhost\Ubuntu\home\system-001\ethereum_wallet_dns_bridge`

## Setup

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to the local server URL (typically `http://localhost:5173`)

## Usage

### 1. Root Trust Anchor Generation

1. Navigate to the "Root Trust Anchor" tab
2. Fill in:
   - Root wallet address (0x...)
   - Private key (for signing)
   - DNS domain (e.g., `inblock.io`)
   - Validity period
   - Key usage permissions
3. Click "Generate Root Trust Anchor"
4. The system will automatically validate against DNS registry

### 2. Intermediate Delegate Generation

1. Navigate to the "Intermediate Delegate" tab
2. Provide issuer and subject wallet details
3. Reference the issuer's attestation hash
4. Set delegation permissions
5. Generate the intermediate delegate attestation

### 3. End Entity Generation

1. Navigate to the "End Entity" tab
2. Similar to intermediate, but with `delegate: false`
3. Typically for final users who cannot delegate further

### 4. Revocation

1. Navigate to the "Revocation" tab
2. Specify the revoker wallet and target attestation hash
3. Select revocation reason
4. Generate revocation attestation

### 5. Validation

#### Chain Validation
- Use the "Validate Chain" tab to run AQUA.js validation:
  ```bash
  node \wsl.localhost\Ubuntu\home\system-001\aqua-js-cli\dist\aqua.js verify ./output/chain.aqua.json
  ```

#### DNS Registry Testing
- Test DNS registry functionality with `inblock.io` domain
- View DNS bridge commands for verification and generation

## DNS Registry Integration

### Testing with inblock.io

The application includes integration with the ethereum_wallet_dns_bridge tool:

```bash
# Verify existing DNS record
node \wsl.localhost\Ubuntu\home\system-001\ethereum_wallet_dns_bridge\dist\wallet-tool.js verify inblock.io

# Generate new proof (browser/MetaMask)
node \wsl.localhost\Ubuntu\home\system-001\ethereum_wallet_dns_bridge\dist\wallet-tool.js browser

# Generate proof with private key
node \wsl.localhost\Ubuntu\home\system-001\ethereum_wallet_dns_bridge\dist\wallet-tool.js generate inblock.io <privateKey>
```

### DNS Record Format

- **Name**: `aqua._wallet.<domain.com>`
- **Type**: TXT
- **Value**: `wallet=<address>&timestamp=<ts>&expiration=<exp>&sig=<signature>`

Example for inblock.io:
- **Name**: `aqua._wallet.inblock.io`
- **Value**: `wallet=0x4a79b0d4b8feda7af5902da2d15d73a7e5fdefd4&timestamp=1749215859&expiration=1780751859&sig=0x46f3...`

## File Structure

```
├── index.html                 # Main frontend interface
├── js/
│   ├── trust-chain-generator.js  # Core trust chain generation logic
│   └── dns-registry.js          # DNS registry integration
├── scripts/
│   └── validate-chain.js        # Chain validation utilities
├── output/                    # Generated AQUA.json files
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## Generated Files

All generated trust chains are saved as `.aqua.json` files following the AQUA Protocol v3 schema:

- `root-<hash>.aqua.json` - Root trust anchors
- `intermediate-<hash>.aqua.json` - Intermediate delegates  
- `end-entity-<hash>.aqua.json` - End entity attestations
- `revocation-<hash>.aqua.json` - Revocation attestations

## Validation Commands

The application generates appropriate validation commands for each chain type:

```bash
# Validate specific chain
node scripts/validate-chain.js ./output/chain.aqua.json

# Validate all chains
npm run validate
```

## Security Considerations

- Private keys are used only for signing and not stored
- All signatures use EIP-191 standard
- DNS validation requires DNSSEC for production security
- Timestamp validation ensures record freshness
- Revocation checking is essential for trust validation

## Development

- Built with vanilla JavaScript and ES6 modules
- Uses ethers.js for Ethereum wallet functionality
- Integrates with external AQUA tools via command-line interfaces
- Responsive design for various screen sizes

## Future Enhancements

- On-chain root registries (Ethereum mainnet)
- Policy contract integration
- Post-quantum cryptography support
- Real-time DNS resolution in browser
- Batch validation of trust chains

## License

This project implements the AQUA Protocol specification for off-chain trust chains.