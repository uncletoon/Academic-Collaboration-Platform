const fs = require("fs");
const sharp = require("sharp");

const input =
  "D:\\Toon\\My Doc\\Classmate\\Divine\\Physical Data Model - Academic Collaboration System.svg";
const output =
  "D:\\Toon\\My Doc\\Classmate\\Divine\\Physical Data Model - Academic Collaboration System.png";

async function main() {
  const svg = fs.readFileSync(input);
  await sharp(svg, { density: 96 })
    .resize({ width: 6000, withoutEnlargement: false })
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toFile(output);
  const metadata = await sharp(output).metadata();
  console.log(`Created: ${output}`);
  console.log(`Dimensions: ${metadata.width} x ${metadata.height}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
