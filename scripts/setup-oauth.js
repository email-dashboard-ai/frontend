#!/usr/bin/env node

/**
 * Google OAuth Setup Helper
 * This script helps configure your environment for Google OAuth integration
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("\n🔧 Google OAuth Setup Helper\n");

// Check if .env file exists
const envPath = path.join(process.cwd(), ".env");
const envExamplePath = path.join(process.cwd(), ".env.example");

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log("✅ Created .env file from .env.example");
  } else {
    console.log("❌ .env.example file not found");
    process.exit(1);
  }
} else {
  console.log("✅ .env file already exists");
}

console.log("\n📋 Next Steps:");
console.log("1. Go to Google Cloud Console: https://console.cloud.google.com/");
console.log("2. Create/select a project and enable Gmail API");
console.log("3. Create OAuth2 credentials");
console.log("4. Copy your Client ID and update .env file:");
console.log(
  "   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com"
);
console.log("5. Add authorized origins: http://localhost:3000");
console.log("6. Start your backend on port 8081");
console.log("7. Run: npm run dev");

console.log("\n📖 See docs/GOOGLE_OAUTH_SETUP.md for detailed instructions\n");
