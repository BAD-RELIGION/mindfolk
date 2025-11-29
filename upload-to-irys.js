import Irys from "@irys/sdk";
import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import bs58 from "bs58";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const IMAGES_FOLDER = "E:\\Tralha\\Stuff\\crypto design\\MY MINDFOLK\\Mindfolk Images";
const OUTPUT_JSON = path.join(__dirname, "arweave_image_mapping.json");
const BATCH_SIZE = 10; // Upload 10 images at a time
const NETWORK = "mainnet"; // or "devnet" for testing
const TOKEN = "solana";

// Supported image extensions
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

// Load existing mapping if resuming
let existingMapping = {};
if (fs.existsSync(OUTPUT_JSON)) {
  try {
    existingMapping = JSON.parse(fs.readFileSync(OUTPUT_JSON, "utf8"));
    console.log(`Loaded existing mapping with ${Object.keys(existingMapping).length} entries`);
  } catch (e) {
    console.log("Starting fresh mapping file");
  }
}

// Get all image files recursively
function getAllImageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllImageFiles(filePath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

// Connect to Phantom wallet via private key
async function connectPhantom() {
  console.log("🔐 Connecting to wallet...");
  console.log("\nTo use your Phantom wallet, you need to export your private key:");
  console.log("1. Open Phantom wallet");
  console.log("2. Go to Settings > Security & Privacy");
  console.log("3. Click 'Export Private Key'");
  console.log("4. Enter your password");
  console.log("5. Copy the private key (base58 string)\n");
  
  const privateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) {
    console.log("Please set your private key as an environment variable:");
    console.log("  Windows PowerShell: $env:SOLANA_PRIVATE_KEY='your_private_key_here'");
    console.log("  Windows CMD: set SOLANA_PRIVATE_KEY=your_private_key_here");
    console.log("  Then run: node upload-to-irys.js\n");
    throw new Error("SOLANA_PRIVATE_KEY environment variable not set.");
  }

  try {
    // Convert base58 private key to Uint8Array
    const privateKeyBytes = bs58.decode(privateKey);
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    console.log(`✅ Wallet connected: ${keypair.publicKey.toString()}\n`);
    return keypair;
  } catch (error) {
    throw new Error("Invalid private key format. Please check your private key.");
  }
}

// Check actual wallet SOL balance
async function getWalletBalance(keypair) {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const publicKey = keypair.publicKey;
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
}

// Initialize Irys with Solana
async function getIrys(keypair) {
  const irys = new Irys({
    network: NETWORK,
    token: TOKEN,
    key: keypair.secretKey, // For Node.js with Keypair
    config: {
      providerUrl: "https://api.mainnet-beta.solana.com", // Solana RPC endpoint
    },
  });

  // Get wallet balance
  const walletBalance = await getWalletBalance(keypair);
  console.log(`\n💰 Wallet SOL balance: ${walletBalance.toFixed(4)} SOL`);
  
  // Get Irys prepaid balance
  const irysBalance = await irys.getLoadedBalance();
  const irysBalanceSOL = irys.utils.fromAtomic(irysBalance);
  console.log(`💳 Irys prepaid balance: ${irysBalanceSOL} SOL`);
  console.log(`📍 Irys address: ${irys.address}\n`);

  return { irys, walletBalance, irysBalanceSOL };
}

// Fund Irys account from wallet
async function fundIrys(irys, amountSOL) {
  try {
    console.log(`\n💸 Funding Irys account with ${amountSOL} SOL...`);
    const amountAtomic = irys.utils.toAtomic(amountSOL.toString());
    const fundTx = await irys.fund(amountAtomic);
    console.log(`✅ Successfully funded ${irys.utils.fromAtomic(fundTx.quantity)} SOL to Irys\n`);
    return true;
  } catch (error) {
    console.error(`❌ Error funding Irys:`, error.message);
    return false;
  }
}

// Upload a single file with retry logic
async function uploadFile(irys, filePath, maxRetries = 3) {
  const fileName = path.basename(filePath);
  
  // Skip if already uploaded
  if (existingMapping[fileName]) {
    console.log(`⏭️  Skipping ${fileName} (already uploaded)`);
    return existingMapping[fileName];
  }

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const tags = [
        { name: "Content-Type", value: getContentType(filePath) },
        { name: "File-Name", value: fileName },
      ];

      if (attempt > 1) {
        console.log(`🔄 Retrying ${fileName} (attempt ${attempt}/${maxRetries})...`);
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      } else {
        console.log(`📤 Uploading ${fileName}...`);
      }

      const receipt = await irys.upload(fileBuffer, { tags });
      const arweaveUrl = `https://arweave.net/${receipt.id}`;
      
      console.log(`✅ Uploaded: ${fileName} -> ${arweaveUrl}`);
      return arweaveUrl;
    } catch (error) {
      lastError = error;
      const isNetworkError = error.message.includes("SSL") || 
                            error.message.includes("ECONNRESET") ||
                            error.message.includes("ETIMEDOUT") ||
                            error.message.includes("network") ||
                            error.message.includes("bad record mac");
      
      if (isNetworkError && attempt < maxRetries) {
        console.warn(`⚠️  Network error on attempt ${attempt}, will retry...`);
        continue; // Retry on network errors
      } else {
        console.error(`❌ Error uploading ${fileName} (attempt ${attempt}/${maxRetries}):`, error.message);
        if (attempt === maxRetries) {
          throw error; // Throw on final attempt
        }
      }
    }
  }
  
  throw lastError; // If all retries failed
}

// Get content type from file extension
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return contentTypes[ext] || "application/octet-stream";
}

// Upload files in batches
async function uploadBatch(irys, keypair, files, startIndex) {
  const batch = files.slice(startIndex, startIndex + BATCH_SIZE);
  const results = {};

  for (const filePath of batch) {
    try {
      // Check Irys balance before each upload
      const irysBalance = await irys.getLoadedBalance();
      const irysBalanceSOL = irys.utils.fromAtomic(irysBalance);
      
      // If balance is low (less than 0.01 SOL), try to fund more
      if (parseFloat(irysBalanceSOL) < 0.01) {
        console.log(`\n⚠️  Irys balance low (${irysBalanceSOL} SOL). Checking wallet balance...`);
        const walletBalance = await getWalletBalance(keypair);
        
        if (walletBalance > 0.1) {
          // Fund with 0.5 SOL or available balance, whichever is smaller
          const fundAmount = Math.min(0.5, walletBalance - 0.01);
          console.log(`💸 Auto-funding Irys with ${fundAmount.toFixed(4)} SOL...`);
          const funded = await fundIrys(irys, fundAmount);
          if (!funded) {
            console.error(`❌ Failed to fund Irys. Stopping uploads.`);
            throw new Error("Insufficient Irys balance and funding failed");
          }
        } else {
          console.error(`❌ Wallet balance (${walletBalance.toFixed(4)} SOL) is too low to fund Irys.`);
          throw new Error("Insufficient balance to continue uploads");
        }
      }
      
      const fileName = path.basename(filePath);
      const url = await uploadFile(irys, filePath);
      results[fileName] = url;
      
      // Save progress after each upload
      existingMapping[fileName] = url;
      fs.writeFileSync(OUTPUT_JSON, JSON.stringify(existingMapping, null, 2));
      
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Failed to upload ${path.basename(filePath)}:`, error.message);
      
      // If it's a balance error, stop the batch
      if (error.message.includes("balance") || error.message.includes("insufficient")) {
        console.error(`\n🛑 Stopping uploads due to balance issue.`);
        console.log(`📊 Progress saved. You can fund Irys and run the script again to continue.`);
        throw error; // Re-throw to stop the main loop
      }
      // Continue with next file for other errors
    }
  }

  return results;
}

// Main upload function
async function main() {
  try {
    console.log("🚀 Starting Arweave upload via Irys...\n");
    console.log(`📁 Images folder: ${IMAGES_FOLDER}`);
    console.log(`💾 Output JSON: ${OUTPUT_JSON}\n`);

    // Get all image files
    console.log("📋 Scanning for image files...");
    const allFiles = getAllImageFiles(IMAGES_FOLDER);
    console.log(`Found ${allFiles.length} image files\n`);

    // Filter out already uploaded files
    const filesToUpload = allFiles.filter((filePath) => {
      const fileName = path.basename(filePath);
      return !existingMapping[fileName];
    });

    console.log(`📊 Files to upload: ${filesToUpload.length}`);
    console.log(`✅ Already uploaded: ${allFiles.length - filesToUpload.length}\n`);

    if (filesToUpload.length === 0) {
      console.log("✨ All files already uploaded!");
      return;
    }

    // Connect to wallet
    console.log("🔗 Connecting to Phantom wallet...");
    const keypair = await connectPhantom();
    console.log("✅ Wallet connected\n");

    // Initialize Irys
    console.log("🔧 Initializing Irys...");
    const { irys, walletBalance, irysBalanceSOL } = await getIrys(keypair);

    // Estimate cost (rough estimate: ~0.0001 SOL per image)
    const estimatedCost = filesToUpload.length * 0.0001;
    console.log(`💵 Estimated cost: ~${estimatedCost.toFixed(4)} SOL\n`);

    // Check if Irys balance is sufficient, if not, fund it
    if (parseFloat(irysBalanceSOL) < estimatedCost) {
      console.log(`⚠️  Irys prepaid balance (${irysBalanceSOL} SOL) is insufficient.`);
      console.log(`    Need to fund Irys account with SOL from your wallet.\n`);
      
      if (walletBalance < estimatedCost) {
        console.error(`❌ Error: Your wallet balance (${walletBalance.toFixed(4)} SOL) is also insufficient.`);
        console.error(`   You need at least ${estimatedCost.toFixed(4)} SOL in your wallet to fund Irys.`);
        return;
      }

      // Fund Irys with estimated amount + buffer
      const fundAmount = estimatedCost + 0.1; // Add 0.1 SOL buffer
      if (fundAmount > walletBalance) {
        console.warn(`⚠️  Warning: Requested funding (${fundAmount.toFixed(4)} SOL) exceeds wallet balance.`);
        const proceed = await askQuestion(`Fund with available balance (${walletBalance.toFixed(4)} SOL)? (y/n): `);
        if (proceed.toLowerCase() !== "y") {
          console.log("Upload cancelled.");
          return;
        }
        await fundIrys(irys, walletBalance - 0.01); // Leave 0.01 SOL for fees
      } else {
        const proceed = await askQuestion(`Fund Irys with ${fundAmount.toFixed(4)} SOL? (y/n): `);
        if (proceed.toLowerCase() !== "y") {
          console.log("Upload cancelled.");
          return;
        }
        await fundIrys(irys, fundAmount);
      }
      
      // Check balance again after funding
      const newBalance = await irys.getLoadedBalance();
      const newBalanceSOL = irys.utils.fromAtomic(newBalance);
      console.log(`\n✅ Irys balance after funding: ${newBalanceSOL} SOL\n`);
    } else {
      console.log(`✅ Irys balance is sufficient for uploads.\n`);
    }

    // Upload files in batches
    console.log(`\n📤 Starting uploads (${BATCH_SIZE} files per batch)...\n`);
    
    for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(filesToUpload.length / BATCH_SIZE);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (Files ${i + 1}-${Math.min(i + BATCH_SIZE, filesToUpload.length)} of ${filesToUpload.length})`);
      
      try {
        await uploadBatch(irys, keypair, filesToUpload, i);
      } catch (error) {
        if (error.message.includes("balance") || error.message.includes("insufficient")) {
          console.error(`\n❌ Upload stopped due to insufficient balance.`);
          console.log(`\n📋 To continue:`);
          console.log(`   1. Make sure you have SOL in your wallet`);
          console.log(`   2. Run the script again - it will auto-fund Irys if needed`);
          console.log(`   3. Already uploaded files will be skipped\n`);
          break; // Exit the loop
        }
        throw error; // Re-throw other errors
      }
      
      // Show progress
      const uploaded = Math.min(i + BATCH_SIZE, filesToUpload.length);
      const progress = ((uploaded / filesToUpload.length) * 100).toFixed(1);
      console.log(`\n📊 Progress: ${uploaded}/${filesToUpload.length} (${progress}%)`);
    }

    console.log("\n✨ Upload complete!");
    console.log(`📄 Mapping saved to: ${OUTPUT_JSON}`);
    console.log(`📊 Total files mapped: ${Object.keys(existingMapping).length}`);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

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

// Run main function
main();

