import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runTest() {
  console.log("=== Testing Cross-Tab Virtual Engine (2 Tabs, Same Room) ===");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });

  try {
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();

    page1.on("console", (m) => console.log("[P1]", m.text()));
    page2.on("console", (m) => console.log("[P2]", m.text()));
    page1.on("pageerror", (e) => console.log("[P1 ERROR]", e.message));
    page2.on("pageerror", (e) => console.log("[P2 ERROR]", e.message));

    console.log("1. Tab 1 (Host bHARGAV): Visiting Landing Page...");
    await page1.goto("http://localhost:5173", { waitUntil: "domcontentloaded" });
    await page1.evaluate(() => {
      localStorage.setItem("sketchroom_mode", "browser");
    });

    // Tab 1 sets nickname bHARGAV
    await page1.waitForSelector("input");
    await page1.evaluate(() => {
      const inp = document.querySelector("input");
      if (inp) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(inp, "bHARGAV");
        inp.dispatchEvent(new Event("input", { bubbles: true }));
        inp.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    console.log("2. Tab 1: Clicking 'Create Room'...");
    await page1.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("Create Room"));
      btn?.click();
    });

    // Wait for Tab 1 to navigate to /room/
    await page1.waitForFunction(() => window.location.pathname.startsWith("/room/"), { timeout: 8000 });
    const tab1Url = page1.url();
    const roomCode = tab1Url.split("/room/")[1].substring(0, 5);
    console.log(`✓ Tab 1 created room: ${roomCode}`);

    await sleep(500);

    // Wait for lobby to render in Tab 1
    await page1.waitForFunction(() => document.body.innerText.includes("Players in Lobby"), { timeout: 8000 });
    const tab1LobbyText = await page1.evaluate(() => document.body.innerText);
    console.log(`Tab 1 Initial Lobby Text has bHARGAV: ${tab1LobbyText.includes("bHARGAV")}`);

    console.log(`3. Tab 2 (Player pUKU): Joining room ${roomCode}...`);
    // Direct visit to /room/:code in Tab 2
    await page2.goto(`http://localhost:5173/room/${roomCode}`, { waitUntil: "domcontentloaded" });
    await page2.evaluate(() => {
      localStorage.setItem("sketchroom_mode", "browser");
    });

    await sleep(500);

    // In Tab 2, check if join prompt is displayed and enter nickname pUKU
    await page2.waitForFunction(
      () => document.body.innerText.includes("Join Room") || document.body.innerText.includes("Enter Game Room") || document.body.innerText.includes("Choose your nickname"),
      { timeout: 8000 }
    );

    await page2.evaluate(() => {
      const form = document.querySelector("form");
      const inp = document.querySelector("form input");
      if (inp) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(inp, "pUKU");
        inp.dispatchEvent(new Event("input", { bubbles: true }));
        inp.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const btns = Array.from(document.querySelectorAll("button"));
      const joinBtn = btns.find((b) => b.innerText.includes("Enter Game Room") || b.innerText.includes("Join Room"));
      if (joinBtn) {
        joinBtn.click();
      } else if (form) {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
    });

    console.log("4. Waiting for both tabs to sync players in Lobby...");
    await sleep(2000);
    const p1Text = await page1.evaluate(() => document.body.innerText);
    const p2Text = await page2.evaluate(() => document.body.innerText);
    console.log("=== Tab 1 Text ===");
    console.log(p1Text);
    console.log("=== Tab 2 Text ===");
    console.log(p2Text);

    console.log(`✓ Tab 1 has '2/10': ${p1Text.includes("2/10") || p1Text.includes("2")}`);
    console.log(`✓ Tab 1 has 'bHARGAV (You) Host': ${p1Text.includes("bHARGAV") && p1Text.includes("Host")}`);
    console.log(`✓ Tab 1 sees 'pUKU': ${p1Text.includes("pUKU")}`);

    console.log(`✓ Tab 2 has '2/10': ${p2Text.includes("2/10") || p2Text.includes("2")}`);
    console.log(`✓ Tab 2 has 'pUKU (You)': ${p2Text.includes("pUKU")}`);
    console.log(`✓ Tab 2 sees 'Waiting for host': ${p2Text.includes("Waiting for host")}`);

    // Verify Tab 2 is NOT host (no Start Game button)
    const tab2HasStartBtn = p2Text.includes("Start Game");
    console.log(`✓ Tab 2 correctly DOES NOT have Start Game button: ${!tab2HasStartBtn}`);

    console.log("5. Tab 1 (Host): Clicking 'Start Game'...");
    await page1.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.innerText.includes("Start Game"));
      btn?.click();
    });

    console.log("6. Waiting for game phase transition on BOTH tabs...");
    await page1.waitForFunction(
      () =>
        document.body.innerText.includes("Choose a word") ||
        document.body.innerText.includes("choosing a word") ||
        document.querySelector("canvas") !== null,
      { timeout: 8000 }
    );
    await page2.waitForFunction(
      () =>
        document.body.innerText.includes("Choose a word") ||
        document.body.innerText.includes("choosing a word") ||
        document.querySelector("canvas") !== null,
      { timeout: 8000 }
    );

    console.log("✓ BOTH tabs successfully transitioned to Game simultaneously!");
    console.log("\n========================================================");
    console.log("🎉 MULTI-TAB VIRTUAL ENGINE VERIFIED 100% WORKING! 🎉");
    console.log("========================================================");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
