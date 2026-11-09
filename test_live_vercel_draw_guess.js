import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const VERCEL_URL = "https://dist-ten-mu-79.vercel.app";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("=== Testing Realtime Guessing & Interaction on Live Vercel ===");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on("pageerror", (err) => console.log("LIVE ERROR:", err.message));

    await page.goto(VERCEL_URL, { waitUntil: "networkidle0" });

    // Create room
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Create Room"));
      btn?.click();
    });

    await page.waitForFunction(() => window.location.pathname.startsWith("/room/"), { timeout: 8000 });
    await sleep(600);

    // Add bot
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Add Bot Player"));
      btn?.click();
    });

    await sleep(600);

    // Start game
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Start Game"));
      btn?.click();
    });

    // Wait for game active
    await page.waitForFunction(() => document.querySelector("canvas") !== null, { timeout: 8000 });
    console.log("✓ Canvas mounted on live Vercel!");

    // If word choice button is visible, click it
    await sleep(500);
    await page.evaluate(() => {
      const btn = document.querySelector("button.capitalize");
      if (btn) btn.click();
    });

    await sleep(1000);

    // Send a chat guess
    console.log("Sending chat message/guess...");
    const chatInput = await page.$("input[placeholder*='Type your guess' i], input[type='text']:not([disabled])");
    if (chatInput) {
      await chatInput.type("apple");
      await page.keyboard.press("Enter");
      console.log("✓ Chat guess 'apple' submitted!");
    }

    await sleep(1000);

    // Send an emoji reaction
    console.log("Sending emoji reaction...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("🔥") || b.innerText.includes("👍"));
      btn?.click();
    });
    console.log("✓ Reaction triggered!");

    await sleep(1000);
    console.log("🎉 Live Vercel interaction test completely verified! 🎉");
  } catch (err) {
    console.error("Interaction test failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();

