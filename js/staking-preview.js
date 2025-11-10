(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const stakingSection = document.getElementById('staking');
    if (!stakingSection) return;

    const web3 = window.solanaWeb3 || null;
    const connection = web3 ? new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed') : null;

    const nativePanel = stakingSection.querySelector('[data-panel="native"]');
    const liquidPanel = stakingSection.querySelector('[data-panel="liquid"]');

    const toggleButtons = Array.from(stakingSection.querySelectorAll('.staking-toggle-btn'));
    const panels = Array.from(stakingSection.querySelectorAll('.staking-panel'));

    const amountInput = nativePanel?.querySelector('#nativeAmount');
    const validatorInput = nativePanel?.querySelector('#nativeVoteAccount');
    const quickButtons = Array.from(nativePanel?.querySelectorAll('[data-quick-amount]') || []);
    const connectButtons = Array.from(stakingSection.querySelectorAll('[data-connect-wallet]'));
    const submitButton = nativePanel?.querySelector('[data-submit-stake]');
    const feedbackEl = nativePanel?.querySelector('[data-feedback]');
    const summaryAmountEl = nativePanel?.querySelector('[data-summary-amount]');
    const summaryRewardEl = nativePanel?.querySelector('[data-summary-reward]');
    const summaryValidatorEl = nativePanel?.querySelector('[data-summary-validator]');

    if (!nativePanel || !amountInput || !validatorInput || !summaryAmountEl || !summaryRewardEl || !summaryValidatorEl || !feedbackEl || !submitButton) {
      return;
    }

    let provider = detectProvider();

    const STATE = {
      wallet: null,
      balanceLamports: 0,
      connecting: false,
      submitting: false,
      listenersBound: false
    };

    const APY_NATIVE = parseFloat(nativePanel.dataset.apy || '0');

    function formatSol(value, decimals = 4) {
      if (!Number.isFinite(value) || value <= 0) return '0';
      return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
      });
    }

    function lamportsToSol(lamports) {
      return lamports / (web3 ? web3.LAMPORTS_PER_SOL : 1);
    }

    function truncatePubkey(pubkey) {
      const str = pubkey.toString();
      return `${str.slice(0, 4)}…${str.slice(-4)}`;
    }

    function clearFeedback() {
      feedbackEl.textContent = '';
      feedbackEl.className = 'staking-feedback mb-3';
    }

    function detectProvider() {
      if (window.solana?.isPhantom || window.solana?.isBackpack || window.solana?.isSolflare) return window.solana;
      if (window.phantom?.solana) return window.phantom.solana;
      if (window.backpack?.solana) return window.backpack.solana;
      if (window.solflare) return window.solflare;
      return null;
    }

    function setFeedback(message, type = 'info', explorerUrl = null) {
      feedbackEl.textContent = '';
      feedbackEl.className = 'staking-feedback mb-3';
      if (!message) return;
      feedbackEl.textContent = message;
      feedbackEl.classList.add(`staking-feedback--${type}`);
      if (explorerUrl) {
        const link = document.createElement('a');
        link.href = explorerUrl;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = ' View transaction';
        link.className = 'text-warning text-decoration-underline ms-2';
        feedbackEl.appendChild(link);
      }
    }

    function updateSummary() {
      const amount = parseFloat(amountInput.value);
      const cleanAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
      const apyReward = cleanAmount * APY_NATIVE;
      summaryAmountEl.textContent = `${formatSol(cleanAmount)} SOL`;
      summaryRewardEl.textContent = `${formatSol(apyReward, 5)} SOL`;

      const voteAddress = validatorInput.value.trim();
      summaryValidatorEl.textContent = voteAddress ? `${voteAddress.slice(0, 8)}…${voteAddress.slice(-8)}` : '—';
    }

    function isValidVoteAddress(value) {
      if (!web3) return false;
      if (!value) return false;
      try {
        new web3.PublicKey(value);
        return true;
      } catch {
        return false;
      }
    }

    function updateSubmitState() {
      const amount = parseFloat(amountInput.value);
      const voteAddress = validatorInput.value.trim();
      const hasAmount = Number.isFinite(amount) && amount > 0;
      const hasValidator = isValidVoteAddress(voteAddress);
      const ready = STATE.wallet && hasAmount && hasValidator && !STATE.submitting;
      submitButton.disabled = !ready;
    }

    function updateConnectButtons() {
      connectButtons.forEach((btn) => {
        if (STATE.wallet) {
          btn.textContent = `Connected: ${truncatePubkey(STATE.wallet)}`;
          btn.disabled = STATE.connecting;
          btn.classList.remove('btn-warning');
          btn.classList.add('btn-outline-light');
        } else if (STATE.connecting) {
          btn.textContent = 'Connecting…';
          btn.disabled = true;
        } else {
          btn.textContent = 'Connect Wallet';
          btn.disabled = false;
          btn.classList.add('btn-warning');
          btn.classList.remove('btn-outline-light');
        }
      });
    }

    function updateQuickButtons() {
      if (!web3 || !STATE.wallet) return;
      quickButtons.forEach((btn) => {
        const fraction = parseFloat(btn.dataset.quickAmount || '0');
        if (!Number.isFinite(fraction) || fraction <= 0) return;
        const lamports = STATE.balanceLamports * fraction;
        const sol = lamportsToSol(lamports);
        btn.title = `Use ${Math.round(fraction * 100)}% (~${formatSol(sol, 4)} SOL)`;
      });
    }

    async function refreshBalance() {
      if (!connection || !STATE.wallet) return;
      try {
        const lamports = await connection.getBalance(STATE.wallet, 'confirmed');
        STATE.balanceLamports = lamports;
        updateQuickButtons();
      } catch (err) {
        console.error('Failed to fetch balance', err);
        setFeedback('Unable to fetch wallet balance.', 'error');
      }
    }

    function bindWalletListeners(currentProvider) {
      if (!currentProvider || STATE.listenersBound) return;
      currentProvider.on?.('disconnect', () => {
        STATE.wallet = null;
        STATE.balanceLamports = 0;
        updateConnectButtons();
        updateSubmitState();
        clearFeedback();
      });
      currentProvider.on?.('accountChanged', (newAccount) => {
        if (!newAccount) {
          STATE.wallet = null;
          STATE.balanceLamports = 0;
          updateConnectButtons();
          updateSubmitState();
          clearFeedback();
          return;
        }
        try {
          const next = new web3.PublicKey(newAccount);
          STATE.wallet = next;
          refreshBalance();
          updateConnectButtons();
          updateSubmitState();
        } catch (err) {
          console.warn('Account change error', err);
        }
      });
      STATE.listenersBound = true;
    }

    async function connectWallet() {
      if (STATE.connecting) return;
      provider = detectProvider();
      if (!provider) {
        setFeedback('No Solana wallet detected. Install Phantom, Solflare, Backpack, or another wallet and reload this page via https://.', 'error');
        return;
      }

      STATE.connecting = true;
      updateConnectButtons();
      try {
        const resp = await provider.connect?.() ?? {};
        const pubkey = resp?.publicKey
          ? new web3.PublicKey(resp.publicKey)
          : provider.publicKey
            ? new web3.PublicKey(provider.publicKey)
            : null;
        STATE.wallet = pubkey ? new web3.PublicKey(pubkey) : null;
        bindWalletListeners(provider);
        setFeedback('Wallet connected.', 'success');
        await refreshBalance();
      } catch (err) {
        if (err?.code === 4001) {
          setFeedback('Wallet connection cancelled.', 'error');
        } else {
          console.error('Wallet connect error', err);
          setFeedback('Failed to connect wallet.', 'error');
        }
      } finally {
        STATE.connecting = false;
        updateConnectButtons();
        updateSubmitState();
      }
    }

    async function handleStake(event) {
      event.preventDefault();
      clearFeedback();

      provider = detectProvider();

      if (!web3 || !connection) {
        setFeedback('Solana Web3 library failed to load.', 'error');
        return;
      }
      if (!provider) {
        setFeedback('No wallet available in this browser context.', 'error');
        return;
      }
      if (!STATE.wallet) {
        setFeedback('Connect your wallet before staking.', 'error');
        return;
      }

      const amount = parseFloat(amountInput.value);
      const voteAddress = validatorInput.value.trim();

      if (!Number.isFinite(amount) || amount <= 0) {
        setFeedback('Enter a stake amount greater than zero.', 'error');
        return;
      }
      if (!isValidVoteAddress(voteAddress)) {
        setFeedback('Enter a valid validator vote account address.', 'error');
        return;
      }

      const lamports = Math.round(amount * web3.LAMPORTS_PER_SOL);
      const stakeAccount = web3.Keypair.generate();

      STATE.submitting = true;
      submitButton.disabled = true;
      submitButton.textContent = 'Staking…';
      amountInput.disabled = true;
      validatorInput.disabled = true;

      try {
        const rentExemptLamports = await connection.getMinimumBalanceForRentExemption(web3.StakeProgram.space, 'confirmed');
        const totalLamports = rentExemptLamports + lamports;

        if (STATE.balanceLamports < totalLamports) {
          const needed = lamportsToSol(totalLamports);
          setFeedback(`Insufficient balance. You need ~${formatSol(needed, 4)} SOL including rent-exempt reserve.`, 'error');
          return;
        }

        const createAccountIx = web3.SystemProgram.createAccount({
          fromPubkey: STATE.wallet,
          newAccountPubkey: stakeAccount.publicKey,
          lamports: totalLamports,
          space: web3.StakeProgram.space,
          programId: web3.StakeProgram.programId
        });

        const authorized = new web3.Authorized(STATE.wallet, STATE.wallet);
        const lockup = new web3.Lockup(0, 0, STATE.wallet);

        const initStakeIx = web3.StakeProgram.initialize({
          stakePubkey: stakeAccount.publicKey,
          authorized,
          lockup
        });

        const delegateIx = web3.StakeProgram.delegate({
          stakePubkey: stakeAccount.publicKey,
          authorizedPubkey: STATE.wallet,
          votePubkey: new web3.PublicKey(voteAddress)
        });

        const transaction = new web3.Transaction().add(createAccountIx, initStakeIx, delegateIx);
        transaction.feePayer = STATE.wallet;
        const latestBlockhash = await connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = latestBlockhash.blockhash;

        transaction.partialSign(stakeAccount);

        const signedTx = await provider.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
        await connection.confirmTransaction(
          {
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
          },
          'confirmed'
        );

        setFeedback('Stake delegation submitted successfully.', 'success', `https://solscan.io/tx/${signature}`);

        amountInput.value = '';
        updateSummary();
        await refreshBalance();
      } catch (err) {
        console.error('Stake error', err);
        const msg = err?.message || 'Failed to submit stake delegation.';
        setFeedback(msg, 'error');
      } finally {
        STATE.submitting = false;
        submitButton.textContent = 'Stake SOL';
        amountInput.disabled = false;
        validatorInput.disabled = false;
        updateSubmitState();
      }
    }

    function activatePanel(targetMode) {
      toggleButtons.forEach((btn) => {
        const isActive = btn.dataset.mode === targetMode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });

      panels.forEach((panel) => {
        const isActive = panel.dataset.panel === targetMode;
        panel.classList.toggle('active', isActive);
        panel.setAttribute('aria-hidden', String(!isActive));
        if (isActive) {
          const numInput = panel.querySelector('input[type="number"]');
          if (numInput) {
            numInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      });
    }

    toggleButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        activatePanel(btn.dataset.mode);
      });
    });

    activatePanel('native');

    quickButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const fraction = parseFloat(btn.dataset.quickAmount || '0');
        if (!Number.isFinite(fraction) || fraction <= 0) return;
        if (!STATE.wallet) {
          setFeedback('Connect a wallet to use quick stake amounts.', 'error');
          return;
        }
        const lamports = STATE.balanceLamports * fraction;
        const sol = lamportsToSol(lamports);
        amountInput.value = formatSol(sol, 4);
        updateSummary();
        updateSubmitState();
      });
    });

    amountInput.addEventListener('input', () => {
      updateSummary();
      updateSubmitState();
    });

    validatorInput.addEventListener('input', () => {
      updateSummary();
      updateSubmitState();
    });

    connectButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (STATE.wallet) return;
        connectWallet();
      });
    });

    submitButton.addEventListener('click', () => {
      if (submitButton.disabled) return;
    });

    nativePanel.querySelector('form')?.addEventListener('submit', handleStake);

    updateSummary();
    updateSubmitState();
    updateConnectButtons();

    provider = detectProvider();
    if (provider?.connect) {
      provider.connect({ onlyIfTrusted: true }).then((resp) => {
        if (resp?.publicKey) {
          STATE.wallet = new web3.PublicKey(resp.publicKey);
          bindWalletListeners(provider);
          refreshBalance();
          updateConnectButtons();
          updateSubmitState();
        }
      }).catch(() => {});
    }

    const MOCK_STATS = {
      apy: 7.4,
      commission: 5,
      stakers: 128
    };
    const apyEl = document.querySelector('[data-staking-apy]');
    const commissionEl = document.querySelector('[data-staking-commission]');
    const stakersEl = document.querySelector('[data-staking-stakers]');
    if (apyEl) apyEl.textContent = MOCK_STATS.apy.toFixed(1) + '%';
    if (commissionEl) commissionEl.textContent = MOCK_STATS.commission.toFixed(1) + '%';
    if (stakersEl) stakersEl.textContent = MOCK_STATS.stakers.toLocaleString();
  });
})();


