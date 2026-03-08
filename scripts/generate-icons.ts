import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve } from "path";

const svgPath = resolve("public/favicon.svg");
const svg = readFileSync(svgPath);
const outDir = resolve("public/icons");

const sizes = [
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-512x512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

async function main() {
  for (const { name, size } of sizes) {
    await sharp(svg).resize(size, size).png().toFile(resolve(outDir, name));
    console.log(`Generated ${name} (${size}x${size})`);
  }
}

main();
