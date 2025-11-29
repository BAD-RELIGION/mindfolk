import Irys from "@irys/sdk";
import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import readline from "readline";

const NETWORK = "mainnet";
const TOKEN = "solana";

// Helper function to ask user input
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Check actual wallet SOL balance
async function getWalletBalance(keypair) {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const publicKey = keypair.publicKey;
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

// Connect to wallet
async function connectPhantom() {
  console.log("🔐 Connecting to wallet...\n");
  
  const privateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) {
    console.log("Please set your private key as an environment variable:");
    console.log("  Windows PowerShell: $env:SOLANA_PRIVATE_KEY='your_private_key_here'");
    console.log("  Windows CMD: set SOLANA_PRIVATE_KEY=your_private_key_here");
    console.log("  Then run: node withdraw-irys-balance.js\n");
    throw new Error("SOLANA_PRIVATE_KEY environment variable not set.");
  }

  try {
    const privateKeyBytes = bs58.decode(privateKey);
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    console.log(`✅ Wallet connected: ${keypair.publicKey.toString()}\n`);
    return keypair;
  } catch (error) {
    throw new Error("Invalid private key format. Please check your private key.");
  }
}

// Withdraw from Irys
async function withdrawFromIrys(irys, amountSOL) {
  try {
    console.log(`\n💸 Withdrawing ${amountSOL} SOL from Irys...`);
    const amountAtomic = irys.utils.toAtomic(amountSOL.toString());
    
    // Try different method names that might exist in the SDK
    let withdrawTx;
    if (typeof irys.withdrawBalance === 'function') {
      withdrawTx = await irys.withdrawBalance(amountAtomic);
    } else if (typeof irys.withdraw === 'function') {
      withdrawTx = await irys.withdraw(amountAtomic);
    } else {
      throw new Error("Withdrawal method not found in Irys SDK. Please check SDK version.");
    }
    
    console.log(`✅ Successfully withdrew ${irys.utils.fromAtomic(withdrawTx.quantity || withdrawTx)} SOL`);
    if (withdrawTx.id || withdrawTx) {
      console.log(`📄 Transaction ID: ${withdrawTx.id || withdrawTx}\n`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Error withdrawing:`, error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log("💰 Irys Balance Withdrawal Tool\n");

    // Connect to wallet
    const keypair = await connectPhantom();

    // Initialize Irys
    const irys = new Irys({
      network: NETWORK,
      token: TOKEN,
      key: keypair.secretKey,
      config: {
        providerUrl: "https://api.mainnet-beta.solana.com",
      },
    });

    // Check balances
    const walletBalance = await getWalletBalance(keypair);
    const irysBalance = await irys.getLoadedBalance();
    const irysBalanceSOL = irys.utils.fromAtomic(irysBalance);

    console.log(`💰 Wallet SOL Balance: ${walletBalance.toFixed(4)} SOL`);
    console.log(`💳 Irys Prepaid Balance: ${irysBalanceSOL} SOL`);
    console.log(`📍 Irys Address: ${irys.address}\n`);

    if (parseFloat(irysBalanceSOL) <= 0) {
      console.log("ℹ️  No balance to withdraw from Irys account.");
      return;
    }

    // Ask user how much to withdraw
    // Leave small amount for transaction fees (0.001 SOL should be enough)
    const feeReserve = 0.001;
    const maxWithdrawable = Math.max(0, parseFloat(irysBalanceSOL) - feeReserve);
    
    console.log(`Available balance: ${irysBalanceSOL} SOL`);
    console.log(`Max withdrawable (leaving ${feeReserve} SOL for fees): ${maxWithdrawable.toFixed(4)} SOL`);
    
    const withdrawAll = await askQuestion(`Withdraw maximum ${maxWithdrawable.toFixed(4)} SOL? (y/n): `);
    
    let withdrawAmount;
    if (withdrawAll.toLowerCase() === "y") {
      withdrawAmount = maxWithdrawable;
      console.log(`\n💡 Leaving ${feeReserve} SOL in Irys account for transaction fees.`);
    } else {
      const customAmount = await askQuestion(`Enter amount to withdraw (SOL, max ${maxWithdrawable.toFixed(4)}): `);
      withdrawAmount = parseFloat(customAmount);
      
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        console.log("❌ Invalid amount.");
        return;
      }
      
      if (withdrawAmount > maxWithdrawable) {
        console.log(`❌ Amount exceeds maximum withdrawable (${maxWithdrawable.toFixed(4)} SOL).`);
        console.log(`   Need to leave ${feeReserve} SOL for transaction fees.`);
        return;
      }
    }

    // Confirm withdrawal
    console.log(`\n⚠️  You are about to withdraw ${withdrawAmount} SOL from Irys to your wallet.`);
    const confirm = await askQuestion("Confirm withdrawal? (y/n): ");
    
    if (confirm.toLowerCase() !== "y") {
      console.log("Withdrawal cancelled.");
      return;
    }

    // Withdraw
    const success = await withdrawFromIrys(irys, withdrawAmount);
    
    if (success) {
      // Check balances after withdrawal
      console.log("⏳ Waiting for transaction to confirm...");
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const newWalletBalance = await getWalletBalance(keypair);
      const newIrysBalance = await irys.getLoadedBalance();
      const newIrysBalanceSOL = irys.utils.fromAtomic(newIrysBalance);
      
      console.log("\n📊 Updated Balances:");
      console.log(`💰 Wallet SOL Balance: ${newWalletBalance.toFixed(4)} SOL`);
      console.log(`💳 Irys Prepaid Balance: ${newIrysBalanceSOL} SOL`);
      console.log("\n✨ Withdrawal complete!");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

