// Wallet Connection Module - Based on reference site implementation
// Global state for wallet - defined before IIFE
let WALLET_STATE = {
  wallet: null,
  provider: null,
  currentWalletName: null,
  balance: 0,
  tokenBalance: 0,
  connected: false,
  listenersBound: false
};

(() => {
  const MAX_ATTEMPTS = 60;
  const RETRY_DELAY_MS = 200;

  function resolveWeb3() {
    if (typeof window === 'undefined') return undefined;
    if (window.solanaWeb3) return window.solanaWeb3;
    if (typeof solanaWeb3 !== 'undefined') return solanaWeb3;
    const script = document.getElementById('solana-web3-script');
    const globalName = script?.getAttribute?.('data-global');
    if (globalName && window[globalName]) return window[globalName];
    if (window.solana?.Web3) return window.solana.Web3;
    return undefined;
  }

  function waitForWeb3(attempt = 0) {
    const web3 = resolveWeb3();
    if (web3) {
      window.solanaWeb3 = web3;
      const run = () => initWalletConnection(web3);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run, { once: true });
      } else {
        run();
      }
      return;
    }
    if (attempt >= MAX_ATTEMPTS) {
      console.error('Solana web3 library failed to load.');
      return;
    }
    setTimeout(() => waitForWeb3(attempt + 1), RETRY_DELAY_MS);
  }

  waitForWeb3();

  function initWalletConnection(web3) {
    // Configuration - Try multiple ways to get API key
    let HELIUS_API_KEY = '';
    if (typeof window !== 'undefined' && window.CONFIG?.HELIUS_API_KEY) {
      HELIUS_API_KEY = (window.CONFIG.HELIUS_API_KEY || '').trim();
    } else if (typeof CONFIG !== 'undefined' && CONFIG?.HELIUS_API_KEY) {
      HELIUS_API_KEY = (CONFIG.HELIUS_API_KEY || '').trim();
    } else if (typeof localStorage !== 'undefined') {
      HELIUS_API_KEY = (localStorage.getItem('helius_api_key') || '').trim();
    }
    
    // Debug: Log where we got the API key from
    if (HELIUS_API_KEY) {
      const source = typeof window !== 'undefined' && window.CONFIG?.HELIUS_API_KEY ? 'window.CONFIG' :
                     typeof CONFIG !== 'undefined' && CONFIG?.HELIUS_API_KEY ? 'CONFIG' :
                     'localStorage';
      console.log(`✓ Found Helius API key from ${source}: ${HELIUS_API_KEY.substring(0, 8)}...`);
    } else {
      console.log('⚠ No Helius API key found at initialization');
    }
    
    // Use Helius RPC if API key is available, otherwise use alternative public RPCs
    let RPC_ENDPOINT;
    if (HELIUS_API_KEY) {
      RPC_ENDPOINT = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    } else {
      // Use multiple fallback RPC endpoints (public endpoints that are more reliable)
      // Try QuickNode public endpoint first, then others
      RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
      // Alternative endpoints we can try: 
      // - 'https://solana-api.projectserum.com' (old, may be deprecated)
      // - 'https://rpc.ankr.com/solana' (public, rate-limited)
      // - 'https://solana-mainnet.g.alchemy.com/v2/demo' (demo endpoint, limited)
    }
    
    // Log the API key status (masked for security)
    const maskedKey = HELIUS_API_KEY ? `${HELIUS_API_KEY.substring(0, 8)}...` : 'none';
    console.log('Initializing Solana connection:', HELIUS_API_KEY ? `Using Helius RPC (key: ${maskedKey})` : 'Using public RPC (no API key found)');
    
    if (!HELIUS_API_KEY || HELIUS_API_KEY.trim() === '') {
      console.warn('⚠ No Helius API key found. Some features may not work.');
      console.warn('   To set your API key, run in console:');
      console.warn('   CONFIG.HELIUS_API_KEY = "your-api-key"');
      console.warn('   Or: localStorage.setItem("helius_api_key", "your-api-key")');
      console.warn('   Then refresh the page.');
    }
    
    const connection = new web3.Connection(RPC_ENDPOINT, 'confirmed');
    
    // Make connection available globally for other scripts
    window.SOLANA_CONNECTION = connection;
    
    // Expose helper functions globally for debugging
    window.checkHeliusApiKey = function() {
      const key = getHeliusApiKey();
      console.log('=== Helius API Key Status ===');
      console.log('Current API key:', key ? `${key.substring(0, 8)}...` : 'NOT SET');
      console.log('Sources checked:');
      console.log('  window.CONFIG?.HELIUS_API_KEY:', typeof window !== 'undefined' ? (window.CONFIG?.HELIUS_API_KEY ? `${window.CONFIG.HELIUS_API_KEY.substring(0, 8)}...` : 'not set') : 'window undefined');
      console.log('  CONFIG?.HELIUS_API_KEY:', typeof CONFIG !== 'undefined' ? (CONFIG?.HELIUS_API_KEY ? `${CONFIG.HELIUS_API_KEY.substring(0, 8)}...` : 'not set') : 'CONFIG undefined');
      console.log('  localStorage.getItem("helius_api_key"):', typeof localStorage !== 'undefined' ? (localStorage.getItem('helius_api_key') ? `${localStorage.getItem('helius_api_key').substring(0, 8)}...` : 'not set') : 'localStorage undefined');
      return key;
    };
    
    window.setHeliusApiKey = function(apiKey) {
      if (!apiKey || typeof apiKey !== 'string') {
        console.error('Invalid API key. Please provide a string.');
        return false;
      }
      apiKey = apiKey.trim();
      
      // Set in all possible locations
      if (typeof window !== 'undefined' && window.CONFIG) {
        window.CONFIG.HELIUS_API_KEY = apiKey;
      }
      if (typeof CONFIG !== 'undefined') {
        CONFIG.HELIUS_API_KEY = apiKey;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('helius_api_key', apiKey);
      }
      
      console.log(`✓ Helius API key set: ${apiKey.substring(0, 8)}...`);
      console.log('   Please refresh the page or reconnect your wallet for changes to take effect.');
      
      // If wallet is connected, try refreshing token balance
      if (WALLET_STATE.connected && WALLET_STATE.wallet) {
        console.log('   Refreshing token balance with new API key...');
        setTimeout(() => refreshTokenBalance(), 500);
      }
      
      return true;
    };

    // Wallet detection - exact copy from reference site
    function getWalletProvider(walletName) {
      switch (walletName) {
        case 'phantom':
          if (window.solana?.isPhantom) return window.solana;
          if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
          return null;
        case 'solflare':
          if (window.solflare) return window.solflare;
          if (window.solana?.isSolflare) return window.solana;
          if (window.solflare?.solana) return window.solflare.solana;
          return null;
        case 'backpack':
          if (window.backpack?.solana) return window.backpack.solana;
          if (window.solana?.isBackpack) return window.solana;
          return null;
        case 'magicEden':
          if (window.magicEden?.solana) return window.magicEden.solana;
          if (window.solana?.isMagicEden) return window.solana;
          return null;
        default:
          return null;
      }
    }

    function detectAvailableWallets() {
      const available = [];
      if (getWalletProvider('phantom')) available.push('phantom');
      if (getWalletProvider('solflare')) available.push('solflare');
      if (getWalletProvider('backpack')) available.push('backpack');
      if (getWalletProvider('magicEden')) available.push('magicEden');
      return available;
    }

    function getWalletDisplayName(walletName) {
      const names = {
        'phantom': 'Phantom',
        'solflare': 'Solflare',
        'backpack': 'Backpack',
        'magicEden': 'Magic Eden'
      };
      return names[walletName] || walletName.charAt(0).toUpperCase() + walletName.slice(1).replace(/([A-Z])/g, ' $1');
    }
    
    function getWalletIcon(walletName) {
      const icons = {
        'phantom': 'fa-solid fa-ghost',
        'solflare': 'fa-solid fa-sun',
        'backpack': 'fa-solid fa-bag-shopping',
        'magicEden': 'fa-solid fa-gem'
      };
      return icons[walletName] || 'fa-solid fa-wallet';
    }
    
    function getWalletLogoUrl(walletName) {
      const logos = {
        'phantom': 'img/wallets/phantom.png',
        'solflare': 'img/wallets/solflare.png',
        'backpack': 'img/wallets/backpack.png',
        'magicEden': 'img/wallets/magiceden.png'
      };
      return logos[walletName] || 'img/wallets/default.png';
    }

    function formatSol(value, decimals = 4) {
      if (!Number.isFinite(value) || value <= 0) return '0';
      return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
      });
    }

    function populateWalletOptions() {
      const walletGrid = document.getElementById('walletGrid');
      if (!walletGrid) return;
      walletGrid.innerHTML = '';
      
      const wallets = [
        { id: 'phantom', name: 'Phantom', color: '#AB9FF2' },
        { id: 'solflare', name: 'Solflare', color: '#FFB800' },
        { id: 'backpack', name: 'Backpack', color: '#FF6B35' },
        { id: 'magicEden', name: 'Magic Eden', color: '#00D4FF' }
      ];
      
      const available = detectAvailableWallets();
      
      wallets.forEach((wallet) => {
        const isAvailable = available.includes(wallet.id);
        const walletCard = document.createElement('button');
        walletCard.className = `wallet-option ${!isAvailable ? 'wallet-option-disabled' : ''}`;
        walletCard.type = 'button';
        walletCard.dataset.walletId = wallet.id;
        walletCard.disabled = !isAvailable;
        
        const logoImg = document.createElement('img');
        logoImg.src = getWalletLogoUrl(wallet.id);
        logoImg.alt = wallet.name;
        logoImg.className = 'wallet-option-logo';
        logoImg.onerror = function() {
          this.style.display = 'none';
          const fallback = this.nextElementSibling;
          if (fallback) fallback.style.display = 'flex';
        };
        
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'wallet-option-icon-fallback';
        fallbackDiv.style.cssText = `display: none; background: linear-gradient(135deg, ${wallet.color}22, ${wallet.color}11); width: 100%; height: 100%; align-items: center; justify-content: center; border-radius: 12px;`;
        fallbackDiv.innerHTML = `<i class="${getWalletIcon(wallet.id)}" style="color: ${wallet.color};"></i>`;
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'wallet-option-icon';
        iconDiv.appendChild(logoImg);
        iconDiv.appendChild(fallbackDiv);
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'wallet-option-content';
        contentDiv.innerHTML = `
          <div class="wallet-option-name">${wallet.name}</div>
          <div class="wallet-option-status">${isAvailable ? 'Detected' : 'Not installed'}</div>
        `;
        
        walletCard.appendChild(iconDiv);
        walletCard.appendChild(contentDiv);
        
        if (isAvailable) {
          const arrow = document.createElement('i');
          arrow.className = 'fa-solid fa-chevron-right wallet-option-arrow';
          walletCard.appendChild(arrow);
          walletCard.addEventListener('click', () => {
            closeWalletModal();
            connectToWallet(wallet.id);
          });
        }
        
        walletGrid.appendChild(walletCard);
      });
    }
    
    function openWalletModal() {
      const walletModal = document.getElementById('walletModal');
      const walletModalBackdrop = document.getElementById('walletModalBackdrop');
      if (!walletModal || !walletModalBackdrop) return;
      populateWalletOptions();
      walletModal.classList.add('wallet-modal-show');
      walletModalBackdrop.classList.add('wallet-modal-backdrop-show');
      document.body.style.overflow = 'hidden';
    }
    
    function closeWalletModal() {
      const walletModal = document.getElementById('walletModal');
      const walletModalBackdrop = document.getElementById('walletModalBackdrop');
      if (!walletModal || !walletModalBackdrop) return;
      walletModal.classList.remove('wallet-modal-show');
      walletModalBackdrop.classList.remove('wallet-modal-backdrop-show');
      document.body.style.overflow = '';
    }
    
    async function connectToWallet(walletId) {
      WALLET_STATE.currentWalletName = walletId;
      connectWallet();
    }

    async function refreshBalance() {
      if (!WALLET_STATE.wallet) return;
      try {
        const lamports = await tryRPCWithFallback(async (conn) => {
          return await conn.getBalance(WALLET_STATE.wallet, 'confirmed');
        }, 'getBalance');
        
        WALLET_STATE.balance = lamports / web3.LAMPORTS_PER_SOL;
        updateWalletIndicator();
        // Also refresh token balance
        refreshTokenBalance();
      } catch (err) {
        console.error('Failed to fetch balance', err);
      }
    }

    // Helper function to get Helius API key dynamically (check multiple sources)
    function getHeliusApiKey() {
      let apiKey = '';
      
      // Check in order of preference (most recent/authoritative first)
      if (typeof window !== 'undefined' && window.CONFIG?.HELIUS_API_KEY) {
        apiKey = window.CONFIG.HELIUS_API_KEY;
      } else if (typeof CONFIG !== 'undefined' && CONFIG?.HELIUS_API_KEY) {
        apiKey = CONFIG.HELIUS_API_KEY;
      } else if (typeof localStorage !== 'undefined') {
        apiKey = localStorage.getItem('helius_api_key') || '';
      } else if (HELIUS_API_KEY) {
        apiKey = HELIUS_API_KEY; // Fallback to closure variable
      }
      
      // Trim whitespace in case user added spaces
      apiKey = (apiKey || '').trim();
      
      return apiKey;
    }

    // Helper function to try RPC call with fallback endpoints
    async function tryRPCWithFallback(rpcCall, description) {
      const endpoints = [];
      
      // Get API key dynamically (in case it was set after initialization)
      const currentApiKey = getHeliusApiKey();
      
      // Add Helius if API key available - this should be first priority
      if (currentApiKey && currentApiKey.trim() !== '') {
        const heliusEndpoint = `https://mainnet.helius-rpc.com/?api-key=${currentApiKey}`;
        endpoints.push(heliusEndpoint);
        console.log(`✓ Using Helius RPC endpoint (key: ${currentApiKey.substring(0, 8)}...)`);
      } else {
        console.warn('⚠ Helius API key not found. Checking sources...');
        console.warn('   window.CONFIG?.HELIUS_API_KEY:', typeof window !== 'undefined' ? window.CONFIG?.HELIUS_API_KEY : 'window undefined');
        console.warn('   CONFIG?.HELIUS_API_KEY:', typeof CONFIG !== 'undefined' ? CONFIG?.HELIUS_API_KEY : 'CONFIG undefined');
        console.warn('   localStorage.getItem("helius_api_key"):', typeof localStorage !== 'undefined' ? localStorage.getItem('helius_api_key') : 'localStorage undefined');
        console.warn('   Please set it: CONFIG.HELIUS_API_KEY = "your-key" or localStorage.setItem("helius_api_key", "your-key")');
      }
      
      // Add alternative public RPC endpoints (these often fail, but we try them as last resort)
      // Note: These are usually rate-limited or require authentication
      endpoints.push(
        'https://api.mainnet-beta.solana.com' // Official public RPC (rate-limited)
      );
      
      for (const endpoint of endpoints) {
        try {
          const testConnection = new web3.Connection(endpoint, 'confirmed');
          const maskedEndpoint = endpoint.replace(/api-key=[^&]+/, 'api-key=***');
          console.log(`Trying ${description} with endpoint:`, maskedEndpoint);
          
          // Add timeout to avoid hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('RPC call timeout')), 10000)
          );
          
          const result = await Promise.race([
            rpcCall(testConnection),
            timeoutPromise
          ]);
          
          if (result !== undefined && result !== null) {
            console.log(`✓ ${description} succeeded with endpoint:`, maskedEndpoint);
            return result;
          }
        } catch (error) {
          const maskedEndpoint = endpoint.replace(/api-key=[^&]+/, 'api-key=***');
          console.warn(`✗ ${description} failed with endpoint ${maskedEndpoint}:`, error.message);
          continue;
        }
      }
      
      // If we get here, all endpoints failed
      // Reuse currentApiKey that was already declared at the top of the function
      if (!currentApiKey || currentApiKey.trim() === '') {
        console.error('❌ All RPC endpoints failed. Please set your Helius API key:');
        console.error('   In browser console: CONFIG.HELIUS_API_KEY = "your-api-key"');
        console.error('   Or: localStorage.setItem("helius_api_key", "your-api-key")');
        console.error('   Then refresh the page.');
      } else {
        console.error('❌ All RPC endpoints failed, including Helius. Please check your API key is valid.');
      }
      
      throw new Error(`All RPC endpoints failed for ${description}`);
    }

    async function refreshTokenBalance() {
      if (!WALLET_STATE.wallet) {
        console.log('No wallet connected, skipping token balance');
        return;
      }
      
      try {
        const TOKEN_MINT = '674PmuiDtgKx3uKuJ1B16f9m5L84eFvNwj3xDMvHcbo7'; // $WOOD token
        const TOKEN_MINT_PUBKEY = new web3.PublicKey(TOKEN_MINT);
        console.log('Fetching token balance for:', TOKEN_MINT);
        console.log('Wallet address:', WALLET_STATE.wallet.toString());
        
        let tokenBalance = 0;
        
        // Method 1: Try getParsedTokenAccountsByOwner with mint filter
        try {
          console.log('Method 1: Using getParsedTokenAccountsByOwner with mint filter...');
          const tokenAccounts = await tryRPCWithFallback(async (conn) => {
            return await conn.getParsedTokenAccountsByOwner(
              WALLET_STATE.wallet,
              {
                mint: TOKEN_MINT_PUBKEY
              },
              'confirmed'
            );
          }, 'getParsedTokenAccountsByOwner (Method 1)');
          
          console.log('Token accounts response:', JSON.stringify(tokenAccounts, null, 2));
          
          if (tokenAccounts && tokenAccounts.value && tokenAccounts.value.length > 0) {
            // Sum up all token accounts for this mint
            for (const accountInfo of tokenAccounts.value) {
              console.log('Processing token account:', accountInfo.pubkey?.toString() || 'unknown');
              
              // Try to extract token amount - the structure should be:
              // accountInfo.account.data.parsed.info.tokenAmount
              const parsed = accountInfo.account?.data?.parsed;
              
              if (parsed && parsed.info) {
                const info = parsed.info;
                
                // Verify this is the correct mint
                const mintAddress = info.mint;
                if (mintAddress && (mintAddress === TOKEN_MINT || mintAddress.toString() === TOKEN_MINT)) {
                  const tokenAmount = info.tokenAmount;
                  
                  if (tokenAmount) {
                    console.log('Token amount object:', JSON.stringify(tokenAmount, null, 2));
                    
                    // Try to get the UI amount (human-readable)
                    let amount = 0;
                    if (tokenAmount.uiAmount !== undefined && tokenAmount.uiAmount !== null) {
                      amount = parseFloat(tokenAmount.uiAmount);
                      console.log('Found uiAmount:', amount);
                    } else if (tokenAmount.uiAmountString) {
                      amount = parseFloat(tokenAmount.uiAmountString);
                      console.log('Found uiAmountString:', amount);
                    } else if (tokenAmount.amount) {
                      // If we have raw amount, need to divide by decimals
                      const decimals = tokenAmount.decimals || 9;
                      console.log('Found raw amount:', tokenAmount.amount, 'decimals:', decimals);
                      const rawAmount = typeof tokenAmount.amount === 'string' 
                        ? BigInt(tokenAmount.amount) 
                        : BigInt(tokenAmount.amount);
                      amount = Number(rawAmount) / Math.pow(10, decimals);
                      console.log('Calculated amount from raw:', amount);
                    }
                    
                    if (amount > 0) {
                      console.log('Extracted amount:', amount);
                      tokenBalance += amount;
                    }
                  } else {
                    console.warn('Token amount not found in account info');
                  }
                } else {
                  console.warn('Mint address mismatch. Expected:', TOKEN_MINT, 'Got:', mintAddress);
                }
              } else {
                console.warn('Could not find parsed account data:', accountInfo);
              }
            }
          } else {
            console.log('Method 1: No token accounts found for this mint');
          }
        } catch (method1Error) {
          console.warn('Method 1 failed:', method1Error);
          
          // Method 2: Get ALL token accounts and filter by mint
          try {
            console.log('Method 2: Getting all token accounts and filtering...');
            const allTokenAccounts = await tryRPCWithFallback(async (conn) => {
              return await conn.getParsedTokenAccountsByOwner(
                WALLET_STATE.wallet,
                {
                  programId: new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
                },
                'confirmed'
              );
            }, 'getAllParsedTokenAccounts');
            
            console.log(`Found ${allTokenAccounts?.value?.length || 0} total token accounts`);
            
            if (allTokenAccounts && allTokenAccounts.value) {
              for (const accountInfo of allTokenAccounts.value) {
                const parsed = accountInfo.account?.data?.parsed;
                
                if (parsed && parsed.info) {
                  const mintAddress = parsed.info.mint;
                  
                  // Check if this matches our token mint
                  if (mintAddress && (mintAddress === TOKEN_MINT || mintAddress.toString() === TOKEN_MINT)) {
                    const tokenAmount = parsed.info.tokenAmount;
                    
                    if (tokenAmount) {
                      let amount = 0;
                      if (tokenAmount.uiAmount !== undefined && tokenAmount.uiAmount !== null) {
                        amount = parseFloat(tokenAmount.uiAmount);
                      } else if (tokenAmount.uiAmountString) {
                        amount = parseFloat(tokenAmount.uiAmountString);
                      }
                      
                      if (amount > 0) {
                        console.log('Method 2: Found $WOOD balance:', amount);
                        tokenBalance += amount;
                      }
                    }
                  }
                }
              }
            }
          } catch (method2Error) {
            console.error('Method 2 also failed:', method2Error);
          }
        }
        
        console.log('Final token balance:', tokenBalance);
        WALLET_STATE.tokenBalance = tokenBalance;
        updateTokenBalanceDisplay();
      } catch (err) {
        console.error('Failed to fetch token balance:', err);
        console.error('Error details:', err.message, err.stack);
        WALLET_STATE.tokenBalance = 0;
        updateTokenBalanceDisplay();
      }
    }

    function updateTokenBalanceDisplay() {
      const display = document.getElementById('tokenBalanceDisplay');
      const amountEl = document.getElementById('tokenBalanceAmount');
      
      if (!display || !amountEl) return;
      
      if (WALLET_STATE.connected && WALLET_STATE.wallet) {
        const balance = WALLET_STATE.tokenBalance || 0;
        amountEl.textContent = balance.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6
        });
        display.style.display = 'block';
      } else {
        display.style.display = 'none';
      }
    }

    function bindProviderEvents() {
      if (!WALLET_STATE.provider || WALLET_STATE.listenersBound || typeof WALLET_STATE.provider.on !== 'function') return;
      
      WALLET_STATE.provider.on('disconnect', () => {
        WALLET_STATE.wallet = null;
        WALLET_STATE.provider = null;
        WALLET_STATE.currentWalletName = null;
        WALLET_STATE.connected = false;
        WALLET_STATE.balance = 0;
        WALLET_STATE.tokenBalance = 0;
        updateWalletUI();
        updateWalletIndicator();
        updateTokenBalanceDisplay();
      });
      
      WALLET_STATE.provider.on('accountChanged', (newAccount) => {
        if (!newAccount) {
          WALLET_STATE.wallet = null;
          WALLET_STATE.provider = null;
          WALLET_STATE.currentWalletName = null;
          WALLET_STATE.connected = false;
          updateWalletUI();
          return;
        }
        try {
          const nextKey = typeof newAccount === 'string' ? newAccount : newAccount?.toString?.();
          if (nextKey) {
            WALLET_STATE.wallet = new web3.PublicKey(nextKey);
            refreshBalance().then(() => {
              refreshTokenBalance();
            }).catch(err => {
              console.warn('Balance refresh failed:', err);
              refreshTokenBalance();
            });
            updateWalletUI();
            updateWalletIndicator();
          }
        } catch (err) {
          console.warn('Account change error', err);
        }
      });
      
      WALLET_STATE.listenersBound = true;
    }

    async function connectWallet() {
      const selectedWallet = WALLET_STATE.currentWalletName || '';
      if (!selectedWallet) {
        openWalletModal();
        return;
      }
      
      const provider = getWalletProvider(selectedWallet);
      if (!provider) {
        const walletName = getWalletDisplayName(selectedWallet);
        alert(`${walletName} wallet not detected. Install the extension and refresh this page.`);
        return;
      }
      
      if (WALLET_STATE.wallet || WALLET_STATE.connecting) return;
      WALLET_STATE.connecting = true;
      WALLET_STATE.provider = provider;
      
      try {
        const resp = await provider.connect();
        const pubkey = resp?.publicKey || provider.publicKey;
        if (!pubkey) throw new Error('Wallet did not provide a public key.');
        WALLET_STATE.wallet = new web3.PublicKey(pubkey.toString());
        bindProviderEvents();
        refreshBalance().catch(err => {
          console.warn('Balance refresh failed (non-blocking):', err);
        });
        updateWalletIndicator();
        WALLET_STATE.connected = true;
        updateWalletUI();
        
        // Refresh token balance after connecting
        refreshTokenBalance().catch(err => {
          console.warn('Token balance refresh failed (non-blocking):', err);
        });
        
        const walletName = getWalletDisplayName(selectedWallet);
        console.log(`${walletName} wallet connected.`);
        
        // Dispatch event for token balance update
        window.dispatchEvent(new CustomEvent('walletConnected'));
      } catch (err) {
        if (err?.code === 4001) {
          alert('Wallet connection cancelled.');
        } else {
          console.error('Wallet connect error', err);
          alert(err?.message || 'Failed to connect wallet.');
        }
        WALLET_STATE.provider = null;
        WALLET_STATE.currentWalletName = null;
      } finally {
        WALLET_STATE.connecting = false;
        updateWalletUI();
      }
    }

    async function disconnectWallet() {
      if (!WALLET_STATE.provider || !WALLET_STATE.wallet) return;
      try {
        if (WALLET_STATE.provider && typeof WALLET_STATE.provider.removeAllListeners === 'function') {
          WALLET_STATE.provider.removeAllListeners('disconnect');
          WALLET_STATE.provider.removeAllListeners('accountChanged');
        }
        await WALLET_STATE.provider.disconnect?.();
      } catch (err) {
        console.warn('Wallet disconnect error', err);
      } finally {
        WALLET_STATE.wallet = null;
        WALLET_STATE.balance = 0;
        WALLET_STATE.connecting = false;
        WALLET_STATE.provider = null;
        WALLET_STATE.currentWalletName = null;
        WALLET_STATE.listenersBound = false;
        WALLET_STATE.connected = false;
        updateWalletUI();
        updateWalletIndicator();
        // Dispatch disconnect event
        window.dispatchEvent(new CustomEvent('walletDisconnected'));
      }
    }

    function updateWalletIndicator() {
      const indicator = document.getElementById('walletIndicator');
      const icon = document.getElementById('walletIndicatorIcon');
      const name = document.getElementById('walletIndicatorName');
      const balance = document.getElementById('walletIndicatorBalance');
      
      if (!indicator || !icon || !name || !balance) return;
      
      if (WALLET_STATE.wallet && WALLET_STATE.currentWalletName) {
        const walletName = getWalletDisplayName(WALLET_STATE.currentWalletName);
        const sol = WALLET_STATE.balance;
        icon.src = getWalletLogoUrl(WALLET_STATE.currentWalletName);
        icon.alt = walletName;
        name.textContent = walletName;
        balance.textContent = `${formatSol(sol, 2)} SOL`;
        indicator.style.display = 'block';
      } else {
        indicator.style.display = 'none';
      }
      
      // Also update token balance display
      updateTokenBalanceDisplay();
    }

    function updateWalletUI() {
      // Header buttons
      const connectBtn = document.getElementById('connectWalletBtn');
      const disconnectBtn = document.getElementById('disconnectWalletBtn');
      // Hero buttons
      const connectBtnHero = document.getElementById('connectWalletBtnHero');
      const viewWalletNFTsBtn = document.getElementById('viewWalletNFTsBtn');
      // Main title
      const mainTitle = document.getElementById('mainTitle');
      
      if (WALLET_STATE.connected) {
        if (connectBtn) connectBtn.classList.add('d-none');
        if (disconnectBtn) disconnectBtn.classList.remove('d-none');
        if (connectBtnHero) connectBtnHero.classList.add('d-none');
        if (viewWalletNFTsBtn) viewWalletNFTsBtn.classList.remove('d-none');
        // Hide main title when connected
        if (mainTitle) mainTitle.style.display = 'none';
      } else {
        if (connectBtn) {
          connectBtn.classList.remove('d-none');
          connectBtn.textContent = 'Connect Wallet';
        }
        if (disconnectBtn) disconnectBtn.classList.add('d-none');
        if (connectBtnHero) {
          connectBtnHero.classList.remove('d-none');
          connectBtnHero.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
        }
        if (viewWalletNFTsBtn) viewWalletNFTsBtn.classList.add('d-none');
        // Show main title when disconnected
        if (mainTitle) mainTitle.style.display = 'block';
      }
    }

    function handleConnectWallet() {
      if (WALLET_STATE.connected) return;
      openWalletModal();
    }

    function handleDisconnectWallet() {
      disconnectWallet();
    }

    // Expose functions globally for use in gallery.js
    window.walletConnection = {
      openModal: openWalletModal,
      closeModal: closeWalletModal,
      connect: handleConnectWallet,
      disconnect: handleDisconnectWallet,
      populateOptions: populateWalletOptions,
      getWalletState: () => WALLET_STATE,
      refreshTokenBalance: refreshTokenBalance,
      web3: web3,
      connection: connection
    };
    
    // Also expose wallet state globally for gallery.js
    window.WALLET_STATE = WALLET_STATE;
    
    // Expose functions for token balance
    window.refreshTokenBalance = refreshTokenBalance;
    window.updateTokenBalanceDisplay = updateTokenBalanceDisplay;

    // Set up event listeners
    const connectBtn = document.getElementById('connectWalletBtn');
    const disconnectBtn = document.getElementById('disconnectWalletBtn');
    // Hero buttons
    const connectBtnHero = document.getElementById('connectWalletBtnHero');
    const disconnectBtnHero = document.getElementById('disconnectWalletBtnHero');
    const walletModalBackdrop = document.getElementById('walletModalBackdrop');
    const walletModalClose = document.querySelector('.wallet-modal-close');

    // Header buttons
    if (connectBtn) {
      connectBtn.addEventListener('click', handleConnectWallet);
    }

    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', handleDisconnectWallet);
    }
    
    // Hero button - use the same handler
    if (connectBtnHero) {
      connectBtnHero.addEventListener('click', handleConnectWallet);
    }

    if (walletModalBackdrop) {
      walletModalBackdrop.addEventListener('click', closeWalletModal);
    }

    if (walletModalClose) {
      walletModalClose.addEventListener('click', closeWalletModal);
    }

    // Initialize UI
    updateWalletUI();
    populateWalletOptions();

    // Try to auto-connect if wallet is already connected
    (async () => {
      const availableWallets = detectAvailableWallets();
      for (const walletName of availableWallets) {
        const provider = getWalletProvider(walletName);
        if (provider && provider.publicKey) {
          try {
            WALLET_STATE.wallet = new web3.PublicKey(provider.publicKey.toString());
            WALLET_STATE.provider = provider;
            WALLET_STATE.currentWalletName = walletName;
            WALLET_STATE.connected = true;
            bindProviderEvents();
            await refreshBalance();
            await refreshTokenBalance();
            updateWalletUI();
            updateWalletIndicator();
            updateTokenBalanceDisplay();
            console.log(`${getWalletDisplayName(walletName)} wallet already connected.`);
            // Dispatch event for token balance update
            window.dispatchEvent(new CustomEvent('walletConnected'));
            break;
          } catch (_) {
            // Ignore errors
          }
        }
      }
    })();
  }
})();

