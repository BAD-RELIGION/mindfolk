const VALIDATOR_VOTE_ACCOUNT = 'MFLKX9vSfWXa4ZcVVpp4GF64ZbNUiX9EjSqtqNMdFXB';

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
      const run = () => initStaking(web3);
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

  function initStaking(web3) {
    const stakingSection = document.getElementById('staking');
    if (!stakingSection) return;

    const provider = window.solana?.isPhantom ? window.solana : null;
    const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');

    const nativePanel = stakingSection.querySelector('[data-panel="native"]');
    const toggleButtons = Array.from(stakingSection.querySelectorAll('.staking-toggle-btn'));
    const panels = Array.from(stakingSection.querySelectorAll('.staking-panel'));

    if (!nativePanel) return;

    const amountInput = nativePanel.querySelector('#nativeAmount');
    const quickButtons = Array.from(nativePanel.querySelectorAll('[data-quick-amount]'));
    const connectButton = nativePanel.querySelector('[data-connect-wallet]');
    const submitButton = nativePanel.querySelector('[data-submit-stake]');
    const feedbackEl = nativePanel.querySelector('[data-feedback]');
    const summaryAmountEl = nativePanel.querySelector('[data-summary-amount]');
    const summaryRewardEl = nativePanel.querySelector('[data-summary-reward]');
    const summaryValidatorEl = nativePanel.querySelector('[data-summary-validator]');
    const validatorDisplayEl = nativePanel.querySelector('[data-validator-display]');

    if (!amountInput || !connectButton || !submitButton || !feedbackEl || !summaryAmountEl || !summaryRewardEl || !summaryValidatorEl) {
      console.warn('staking preview: missing required DOM nodes');
      return;
    }

    if (validatorDisplayEl) validatorDisplayEl.textContent = VALIDATOR_VOTE_ACCOUNT;
    summaryValidatorEl.textContent = `${VALIDATOR_VOTE_ACCOUNT.slice(0, 8)}…${VALIDATOR_VOTE_ACCOUNT.slice(-8)}`;

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

    function setFeedback(message, type = 'info') {
      feedbackEl.textContent = '';
      feedbackEl.className = 'staking-feedback mb-3';
      if (!message) return;
      feedbackEl.textContent = message;
      feedbackEl.classList.add(`staking-feedback--${type}`);
    }

    function updateSummary() {
      const amount = parseFloat(amountInput.value);
      const cleanAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
      const apyReward = cleanAmount * APY_NATIVE;
      summaryAmountEl.textContent = `${formatSol(cleanAmount)} SOL`;
      summaryRewardEl.textContent = `${formatSol(apyReward, 5)} SOL`;
      summaryValidatorEl.textContent = `${VALIDATOR_VOTE_ACCOUNT.slice(0, 8)}…${VALIDATOR_VOTE_ACCOUNT.slice(-8)}`;
    }

    function updateQuickButtons() {
      quickButtons.forEach((btn) => {
        const fraction = parseFloat(btn.dataset.quickAmount || '0');
        if (!Number.isFinite(fraction) || fraction <= 0) return;
        btn.disabled = !STATE.wallet;
        if (!STATE.wallet) {
          btn.title = 'Connect Phantom to use this shortcut.';
          return;
        }
        const lamports = STATE.balanceLamports * fraction;
        const sol = lamports / web3.LAMPORTS_PER_SOL;
        btn.title = `Use ${Math.round(fraction * 100)}% (~${formatSol(sol, 4)} SOL)`;
      });
    }

    function updateSubmitState() {
      const amount = parseFloat(amountInput.value);
      const hasAmount = Number.isFinite(amount) && amount > 0;
      submitButton.disabled = !(STATE.wallet && hasAmount && !STATE.submitting);
    }

    function updateConnectButton() {
      connectButton.classList.remove('btn-warning', 'btn-outline-light', 'btn-secondary');
      if (!provider) {
        connectButton.textContent = 'Install Phantom Wallet';
        connectButton.disabled = true;
        connectButton.classList.add('btn-secondary');
        setFeedback('Phantom wallet not detected. Install the Phantom extension and refresh this page.', 'error');
        return;
      }
      if (STATE.wallet) {
        const shortKey = STATE.wallet.toBase58();
        connectButton.textContent = `Connected: ${shortKey.slice(0, 4)}…${shortKey.slice(-4)}`;
        connectButton.disabled = STATE.connecting;
        connectButton.classList.add('btn-outline-light');
        return;
      }
      if (STATE.connecting) {
        connectButton.textContent = 'Connecting Phantom…';
        connectButton.disabled = true;
        connectButton.classList.add('btn-warning');
        return;
      }
      connectButton.textContent = 'Connect Phantom Wallet';
      connectButton.disabled = false;
      connectButton.classList.add('btn-warning');
    }

    async function refreshBalance() {
      if (!STATE.wallet) return;
      try {
        const lamports = await connection.getBalance(STATE.wallet, 'confirmed');
        STATE.balanceLamports = lamports;
        updateQuickButtons();
      } catch (err) {
        console.error('Failed to fetch balance', err);
        setFeedback('Unable to fetch wallet balance.', 'error');
      }
    }

    function bindProviderEvents() {
      if (!provider || STATE.listenersBound || typeof provider.on !== 'function') return;
      provider.on('disconnect', () => {
        STATE.wallet = null;
        STATE.balanceLamports = 0;
        updateConnectButton();
        updateQuickButtons();
        updateSubmitState();
        setFeedback('Wallet disconnected.', 'info');
      });
      provider.on('accountChanged', (newAccount) => {
        if (!newAccount) {
          STATE.wallet = null;
          STATE.balanceLamports = 0;
          updateConnectButton();
          updateQuickButtons();
          updateSubmitState();
          setFeedback('Wallet disconnected.', 'info');
          return;
        }
        try {
          const nextKey = typeof newAccount === 'string' ? newAccount : newAccount?.toString?.();
          if (!nextKey) return;
          STATE.wallet = new web3.PublicKey(nextKey);
          refreshBalance();
          updateConnectButton();
          updateQuickButtons();
          updateSubmitState();
          setFeedback('Switched Phantom account.', 'info');
        } catch (err) {
          console.warn('Account change error', err);
        }
      });
      STATE.listenersBound = true;
    }

    async function connectWallet() {
      if (!provider) {
        setFeedback('Phantom wallet not detected. Install the Phantom extension and refresh this page.', 'error');
        return;
      }
      if (STATE.wallet || STATE.connecting) return;
      STATE.connecting = true;
      updateConnectButton();
      try {
        const resp = await provider.connect();
        const pubkey = resp?.publicKey || provider.publicKey;
        if (!pubkey) throw new Error('Wallet did not provide a public key.');
        STATE.wallet = new web3.PublicKey(pubkey.toString());
        bindProviderEvents();
        await refreshBalance();
        setFeedback('Phantom wallet connected.', 'success');
      } catch (err) {
        if (err?.code === 4001) {
          setFeedback('Wallet connection cancelled.', 'error');
        } else {
          console.error('Wallet connect error', err);
          setFeedback(err?.message || 'Failed to connect wallet.', 'error');
        }
      } finally {
        STATE.connecting = false;
        updateConnectButton();
        updateQuickButtons();
        updateSubmitState();
      }
    }

    async function handleStake(event) {
      event.preventDefault();
      setFeedback('');

      if (!provider || !STATE.wallet) {
        setFeedback('Connect your Phantom wallet before staking.', 'error');
        return;
      }

      const amount = parseFloat(amountInput.value);
      if (!Number.isFinite(amount) || amount <= 0) {
        setFeedback('Enter a stake amount greater than zero.', 'error');
        return;
      }

      const lamports = Math.round(amount * web3.LAMPORTS_PER_SOL);
      const stakeAccount = web3.Keypair.generate();

      STATE.submitting = true;
      submitButton.disabled = true;
      submitButton.textContent = 'Staking…';
      amountInput.disabled = true;

      try {
        const rentExemptLamports = await connection.getMinimumBalanceForRentExemption(web3.StakeProgram.space, 'confirmed');
        const totalLamports = rentExemptLamports + lamports;

        if (STATE.balanceLamports < totalLamports) {
          const needed = totalLamports / web3.LAMPORTS_PER_SOL;
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
          votePubkey: new web3.PublicKey(VALIDATOR_VOTE_ACCOUNT)
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
          if (numInput) numInput.dispatchEvent(new Event('input', { bubbles: true }));
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
          setFeedback('Connect Phantom to use quick stake amounts.', 'error');
          return;
        }
        const lamports = STATE.balanceLamports * fraction;
        const sol = lamports / web3.LAMPORTS_PER_SOL;
        amountInput.value = formatSol(sol, 4);
        updateSummary();
        updateSubmitState();
      });
    });

    amountInput.addEventListener('input', () => {
      updateSummary();
      updateSubmitState();
    });

    connectButton.addEventListener('click', (event) => {
      event.preventDefault();
      connectWallet();
    });

    nativePanel.querySelector('form')?.addEventListener('submit', handleStake);

    updateSummary();
    updateQuickButtons();
    updateSubmitState();
    updateConnectButton();

    if (provider) {
      bindProviderEvents();
      const existing = provider.publicKey;
      if (existing) {
        try {
          STATE.wallet = new web3.PublicKey(existing.toString());
          refreshBalance();
          updateConnectButton();
          updateSubmitState();
        } catch (_) {
          /* ignore */
        }
      } else {
        try {
          provider.connect({ onlyIfTrusted: true })
            .then((resp) => {
              const pubkey = resp?.publicKey || provider.publicKey;
              if (!pubkey) return;
              STATE.wallet = new web3.PublicKey(pubkey.toString());
              bindProviderEvents();
              refreshBalance();
              updateConnectButton();
              updateSubmitState();
              setFeedback('Phantom wallet connected.', 'success');
            })
            .catch(() => {});
        } catch (_) {
          /* ignore */
        }
      }
    }
  }
})();
