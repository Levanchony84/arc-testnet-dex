// sweeper-secret.ts

import * as dotenv from 'dotenv';

dotenv.config();

const ENTITY_SECRET: string = process.env.ENTITY_SECRET || 'შენი_64_სიმბოლოიანი_hex_აქ';

const TEST_API_KEY = "43ab325bcbcce6478167a6dd4c743475:2631a79038e9e6b693d834cab2c9faf2";

function isValidHexSecret(secret: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(secret);
}

async function main() {
  if (!ENTITY_SECRET || ENTITY_SECRET.trim() === '') {
    console.error("❌ ENTITY_SECRET არ არის ჩაწერილი .env ფაილში");
    process.exit(1);
  }

  if (!isValidHexSecret(ENTITY_SECRET)) {
    console.error("❌ ENTITY_SECRET არასწორია");
    console.error("უნდა იყოს ზუსტად 64 სიმბოლოიანი hex სტრიქონი (0-9, a-f, A-F)");
    console.error("მიმდინარე სიგრძე:", ENTITY_SECRET.length);
    console.error("მიმდინარე მნიშვნელობა:", ENTITY_SECRET);
    process.exit(1);
  }

  console.log("✅ ENTITY_SECRET სწორია (64 hex სიმბოლო)");

  console.log("\nENTITY_SECRET (სრული):");
  console.log(ENTITY_SECRET);

  console.log("\nENTITY_SECRET (პირველი 8 + ... + ბოლო 8):");
  console.log(`${ENTITY_SECRET.slice(0, 8)}...${ENTITY_SECRET.slice(-8)}`);

  console.log("\nმზადაა გამოსაყენებლად Circle API-სთვის:");
  console.log("TEST_API_KEY:", TEST_API_KEY);
  console.log("ENTITY_SECRET:", ENTITY_SECRET);
  console.log("(გამოიყენე ეს ორი ერთად API აუთენტიფიკაციისთვის)");
}

main().catch((err) => {
  console.error("ძირითადი შეცდომა:", err);
  process.exit(1);
});