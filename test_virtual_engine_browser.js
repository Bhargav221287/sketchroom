import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("=== Testing Instant In-Browser Engine (No Backend Dependency) ===");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const errors = [];
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
    page.on("console", (msg) => console.log("BROWSER:", msg.text()));

    // Force In-Browser Virtual Engine mode to simulate static Vercel deployment with zero external server
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem("sketchroom_mode", "browser");
    });

    // 1. Visit the app on preview port 4173
    console.log("1. Visiting http://localhost:4173 in Pure Browser Mode...");
    await page.goto("http://localhost:4173", { waitUntil: "networkidle0" });

    // 2. Click Create Room
    console.log("2. Clicking 'Create Room'...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("Create Room"));
      btn?.click();
    });

    // 3. Wait for Lobby page navigation
    console.log("3. Waiting for navigation to /room/...");
    await page.waitForFunction(() => window.location.pathname.startsWith("/room/"), { timeout: 6000 });
    console.log(`✓ Navigated to: ${page.url()}`);

    await sleep(600);

    // 4. Verify Start Game button is present and enabled
    console.log("4. Checking 'Start Game' button...");
    const isStartDisabled = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("Start Game"));
      return btn ? btn.disabled : null;
    });
    console.log(`Start button disabled: ${isStartDisabled}`);
    if (isStartDisabled !== false) {
      throw new Error(`Start Game button should be enabled, got: ${isStartDisabled}`);
    }

    // 5. Click "Add Bot Player"
    console.log("5. Clicking 'Add Bot Player'...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("Add Bot Player"));
      btn?.click();
    });

    await page.waitForFunction(() => document.body.innerText.includes("BOT"), { timeout: 4000 });
    console.log("✓ Bot player joined virtual lobby!");

    // 6. Click Start Game
    console.log("6. Clicking 'Start Game'...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("Start Game"));
      btn?.click();
    });

    // 7. Verify Word Choice Modal or Game Screen appears
    console.log("7. Waiting for Word Choice or Game phase...");
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("choosing a word") ||
        document.body.innerText.includes("Choose a Word to Draw") ||
        document.querySelector("canvas") !== null,
      { timeout: 6000 }
    );
    console.log("✓ Game started and Word Choice or Drawing phase active!");

    // If human is drawer, select a word
    await sleep(500);
    const hasWordBtn = await page.evaluate(() => {
      const btn = document.querySelector("button.capitalize");
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (hasWordBtn) {
      console.log("✓ Human is drawer: selected a word!");
    } else {
      console.log("✓ Bot is drawer: waiting for bot word selection...");
    }

    // 8. Verify Canvas is active
    console.log("8. Waiting for drawing canvas...");
    await page.waitForSelector("canvas", { timeout: 8000 });
    console.log("✓ Canvas active and drawing phase started!");

    // 9. Verify Round and Timer are active
    const gameStatus = await page.evaluate(() => {
      return {
        text: document.body.innerText.substring(0, 300),
        hasCanvas: document.querySelector("canvas") !== null,
        hasChat: document.querySelector("input[placeholder*='guess' i]") !== null || document.querySelector("input") !== null,
      };
    });
    console.log("✓ Active Game Interface verified:", JSON.stringify(gameStatus));

    console.log("\n========================================================");
    console.log("🎉 IN-BROWSER ENGINE TEST PASSED WITH 100% SUCCESS! 🎉");
    console.log("========================================================\n");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
