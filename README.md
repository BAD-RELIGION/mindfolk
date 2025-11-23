# NFT Gallery

A beautiful NFT gallery website to browse and explore NFTs from any Solana collection. Built with the same style as the Mindfolk website.

## Features

- Browse NFTs from any Solana collection
- **Connect Solana wallets** (Phantom, Solflare, Backpack, Magic Eden)
- **View NFTs from your connected wallet**
- Responsive grid layout
- Search and filter NFTs by name, mint address, or attributes
- Detailed NFT modal view
- Load more NFTs with pagination
- Beautiful UI matching the Mindfolk website style

## Setup

### 1. Copy Required Assets

You'll need to copy the following files/folders from the reference Mindfolk website:

#### Fonts
Copy these files from `E:\Tralha\Stuff\crypto design\MY MINDFOLK\New Mindfolk website\fonts\`:
- `hipeless_brush-webfont.woff`
- `hipeless_brush-webfont.woff2`
- `dirty_brush-webfont.woff`
- `dirty_brush-webfont.woff2`

Place them in the `fonts/` folder of this project.

#### Images
Copy these files from `E:\Tralha\Stuff\crypto design\MY MINDFOLK\New Mindfolk website\img\`:
- `mfwhite.png` (navbar logo - white version)
- `mfblack.png` (navbar logo - black version for scrolled state)
- `mfbackground.png` (hero section background)

Place them in the `img/` folder of this project.

### 2. API Configuration (Optional)

For better performance, you can configure a Helius API key:

1. Get a free API key from [Helius.dev](https://www.helius.dev/)
2. Open `js/gallery.js`
3. Set your API key:
   ```javascript
   const CONFIG = {
     HELIUS_API_KEY: 'your-api-key-here',
     // ...
   };
   ```

**Note:** 
- The gallery will work without an API key using fallback methods, but functionality may be limited.
- For viewing NFTs from your wallet, a Helius API key is recommended for best performance.
- Wallet connection works without an API key - it will use public RPC endpoints.

## Usage

### Viewing a Collection
1. Open `index.html` in a web browser
2. Enter a Solana collection address in the search bar
3. Click "Load" to fetch and display all NFTs from the collection
4. Use the search box to filter NFTs by name or attributes
5. Click on any NFT card to view detailed information

### Viewing Your Wallet NFTs
1. Click "Connect Wallet" in the navbar
2. Select your wallet (Phantom, Solflare, Backpack, or Magic Eden)
3. Approve the connection in your wallet
4. Click "My NFTs" button to view all NFTs in your connected wallet
5. Your wallet balance and wallet indicator will appear in the navbar

## Collection Address

To find a collection address:
- Magic Eden: Navigate to a collection page, the collection address is in the URL
- Tensor: Similar to Magic Eden
- Or use any Solana collection verification key

## Structure

```
mindfolkgallery/
├── index.html          # Main HTML file
├── css/
│   ├── style.css       # Main styles matching Mindfolk site
│   └── gallery.css     # NFT gallery specific styles
├── js/
│   └── gallery.js      # NFT gallery functionality
├── img/                # Images (copy from reference site)
├── fonts/              # Font files (copy from reference site)
└── README.md           # This file
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Responsive design works on mobile and desktop

## Notes

- The gallery uses demo data if no API is configured
- For production use, configure a proper API endpoint
- Fonts and images must be copied for the full visual experience

