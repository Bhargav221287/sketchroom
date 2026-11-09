import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUTPUT_DIR = path.resolve("./docs/screenshots");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "mobile_360", width: 360, height: 740 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "desktop_1440", width: 1440, height: 900 },
];

async function capture() {
  console.log("[QA Screenshots] Launching Chrome...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });

    // 1. Landing Page - Light
    console.log(`Capturing Landing Light (${vp.name})...`);
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle0" });
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUTPUT_DIR, `landing_${vp.name}_light.png`), fullPage: false });

    // 1. Landing Page - Dark
    console.log(`Capturing Landing Dark (${vp.name})...`);
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(OUTPUT_DIR, `landing_${vp.name}_dark.png`), fullPage: false });

    // 2. Styleguide Page - Light & Dark
    console.log(`Capturing Styleguide Light (${vp.name})...`);
    await page.goto("http://localhost:5173/styleguide", { waitUntil: "networkidle0" });
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(OUTPUT_DIR, `styleguide_${vp.name}_light.png`), fullPage: false });

    console.log(`Capturing Styleguide Dark (${vp.name})...`);
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: path.join(OUTPUT_DIR, `styleguide_${vp.name}_dark.png`), fullPage: false });
  }

  await browser.close();
  console.log(`[QA Screenshots] All initial screenshots captured in ${OUTPUT_DIR}!`);
}

capture().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
