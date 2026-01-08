# Solana Token Data Scraper

A real-time monitoring and data collection system for newly created tokens on the Solana blockchain. This tool tracks new Raydium liquidity pool creations, fetches token prices, monitors price movements, and stores comprehensive data for analysis.

## Features

- **Real-time Token Detection**: Monitors Solana blockchain for new Raydium liquidity pool creations
- **Price Tracking**: Fetches token prices in SOL from Raydium pools
- **Price Monitoring**: Tracks price changes over configurable time periods (default: 60 seconds)
- **Liquidity Analysis**: Calculates total liquidity pool values and LP token reserves
- **Data Persistence**: Stores all collected data in JSON format for further analysis
- **WebSocket Architecture**: Efficient communication between monitoring and processing components

## Use Cases

- Token launch analysis and research
- Early price action tracking for new tokens
- Liquidity pool monitoring
- Trading opportunity identification
- Historical data collection for market analysis

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Token Discovery (fetchForNewTokens)                     │
│ - Monitors blockchain via WebSocket                     │
│ - Detects new Raydium LP creations                      │
│ - Sends token mints to processing server                │
└──────────────────────┬──────────────────────────────────┘
                       │ WebSocket (port 6789)
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Central Hub (main.py)                                    │
│ - WebSocket server on port 6789                         │
│ - Orchestrates price fetching & monitoring              │
│ - Processes and stores data                             │
└───────────┬──────────┬──────────────────────────────────┘
            │          │
    ┌───────┘          └────────┐
    ▼                           ▼
┌──────────────┐        ┌──────────────────┐
│ Price Fetch  │        │ Liquidity Fetch  │
│ (getPrice)   │        │ (getLiquidity)   │
└──────────────┘        └──────────────────┘
            │                   │
            └─────────┬─────────┘
                      ▼
            ┌──────────────────┐
            │ Data Storage     │
            │ (logs/data.json) │
            └──────────────────┘
```

## Prerequisites

- **Python 3.10+**
- **Node.js 20+**
- **npm or yarn**
- **Solana RPC endpoint** (optional - uses public endpoint by default)
- **Shyft API key** (required - free tier available)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd dataScraperSolana
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Optional - for better performance, get from Helius, QuickNode, or Alchemy
RPC_ENDPOINT=https://api.mainnet-beta.solana.com

# Optional
RPC_WEBSOCKET_ENDPOINT=wss://api.mainnet-beta.solana.com

# Required - Get free API key at: https://shyft.to/
SHYFT_API_KEY=your_shyft_api_key_here

# Optional - defaults to localhost
SOCKET_ADDRESS=localhost
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

If `requirements.txt` doesn't exist, install manually:

```bash
pip install websocket-server aiofiles
```

### 4. Install Node.js dependencies

```bash
# Install dependencies for token monitoring
cd fetchForNewTokens
npm install
cd ..

# Install dependencies for price fetching
cd getPrice
npm install
cd ..

# Install dependencies for liquidity data
cd getLiquidityFromMint
npm install
cd ..
```

## Configuration

### Get Your Free API Keys

1. **Shyft API Key** (Required):
   - Visit https://shyft.to/
   - Sign up for a free account
   - Get your API key from the dashboard
   - Add it to `.env` as `SHYFT_API_KEY`

2. **RPC Endpoint** (Optional but Recommended):
   - **Helius**: https://helius.com (2M free requests/month)
   - **QuickNode**: https://quicknode.com (free tier available)
   - **Alchemy**: https://alchemy.com (free tier available)
   - Add it to `.env` as `RPC_ENDPOINT`

### Adjust Monitoring Duration

By default, the system monitors each token for 60 seconds. To change this, edit `main.py`:

```python
# Line 225 - change the time_to_wait_in_seconds parameter
await process_token(token, time_to_wait_in_seconds=120)  # Monitor for 2 minutes
```

## Usage

### Running with Docker (Recommended)

```bash
docker-compose up
```

### Running Manually

You need to run two processes:

**Terminal 1 - Start the main processing server:**

```bash
python main.py
```

**Terminal 2 - Start the token monitoring service:**

```bash
cd fetchForNewTokens
npm run monitor
```

### What Happens

1. The monitoring service (`fetchForNewTokens`) watches the Solana blockchain for new Raydium LP creations
2. When a new token is detected, it sends the token mint address to the main server via WebSocket
3. The main server (`main.py`):
   - Fetches the initial token price in SOL
   - Calculates initial liquidity value
   - Monitors the price for 60 seconds (configurable)
   - Records price at multiple timestamps
   - Calculates final liquidity value
   - Stores all data to `logs/data.json`

## Output Format

Data is stored in `logs/data.json` with the following structure:

```json
[
  {
    "mint": "TokenMintAddress...",
    "initial_price_LP": 1234.56,
    "final_price": 1456.78,
    "prices": {
      "0.0": 0.00001234,
      "5.123": 0.00001456,
      "10.234": 0.00001567,
      "60.123": 0.00001678
    }
  }
]
```

### Fields Explained

- `mint`: Token mint address
- `initial_price_LP`: Initial total liquidity pool value
- `final_price`: Final total liquidity pool value after monitoring period
- `prices`: Dictionary of timestamps (seconds since start) and token prices in SOL

## Project Structure

```
dataScraperSolana/
├── main.py                      # Main orchestration server (WebSocket server on port 6789)
├── fetchForNewTokens/           # Blockchain monitoring service
│   ├── fetchForTokens.ts        # Watches for new Raydium LP creations
│   ├── constants.ts             # Solana connection configuration
│   └── package.json
├── getPrice/                    # Price fetching service
│   ├── fetchPrices.ts           # Gets token price from Raydium pools
│   └── package.json
├── getLiquidityFromMint/        # Liquidity calculation service
│   ├── get-pools-by-token.js    # Queries pool data via GraphQL
│   ├── getLiquidityFromID.js    # Calculates LP token metrics
│   └── package.json
├── logs/
│   └── data.json                # Collected token data
├── docker-compose.yml           # Docker orchestration
├── Dockerfile                   # Container image definition
├── .env.example                 # Environment variables template
└── README.md
```

## Troubleshooting

### "SHYFT_API_KEY is required" Error

Make sure you've:
1. Created a `.env` file in the project root
2. Added your Shyft API key: `SHYFT_API_KEY=your_key_here`
3. The `.env` file is in the correct location

### WebSocket Connection Failed

- Ensure `main.py` is running before starting `fetchForNewTokens`
- Check that port 6789 is not in use: `lsof -i :6789`
- Verify `SOCKET_ADDRESS` in `.env` matches your setup

### RPC Rate Limiting

If you're hitting rate limits with the public Solana RPC:
1. Sign up for a free RPC provider (Helius, QuickNode, Alchemy)
2. Add your RPC endpoint to `.env` as `RPC_ENDPOINT`

### No Tokens Being Detected

- Check your Solana RPC connection is working
- Verify the Raydium fee account address is still valid in `fetchForNewTokens/constants.ts`
- New tokens may not be created frequently - be patient

## Performance Notes

- The system spawns Node.js subprocesses for each price check, which is inefficient for high-frequency monitoring
- For production use, consider refactoring to use persistent connections
- Public RPC endpoints have rate limits - use a dedicated RPC provider for better reliability

## Security

- **Never commit `.env` files** to version control
- The `.gitignore` file is configured to exclude sensitive files
- Rotate API keys regularly
- Use dedicated API keys for production environments

## Contributing

This is a prototype project. Key areas for improvement:

1. Replace subprocess calls with persistent Node.js processes
2. Add comprehensive error handling
3. Implement structured logging
4. Add unit tests
5. Create a web dashboard for data visualization
6. Add database support (PostgreSQL/MongoDB) instead of JSON files
7. Implement circuit breakers for API calls

## License

[Add your license here]

## Disclaimer

This tool is for educational and research purposes. Cryptocurrency trading carries significant risks. Always do your own research before making any investment decisions. The authors are not responsible for any financial losses incurred through the use of this software.

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section above

## API Credits

- **Solana**: https://solana.com
- **Raydium**: https://raydium.io
- **Shyft**: https://shyft.to
