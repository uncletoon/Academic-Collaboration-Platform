const { chromium } = require("playwright");
const { pathToFileURL } = require("url");

const input =
  "D:\\Toon\\My Doc\\Classmate\\Divine\\Physical Data Model - Academic Collaboration System.svg";
const output =
  "D:\\Toon\\My Doc\\Classmate\\Divine\\Physical Data Model - Academic Collaboration System.png";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 6500, height: 4300 },
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(input).href, { waitUntil: "load" });
    await page.screenshot({
      path: output,
      type: "png",
      fullPage: true,
      animations: "disabled",
      timeout: 120000,
    });
    console.log(`Created: ${output}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
