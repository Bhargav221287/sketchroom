import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function testStart() {
  console.log("Launching test...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });

  const page1 = await browser.newPage();
  const logs = [];
  page1.on("console", (msg) => logs.push(`[P1 Console] ${msg.type()}: ${msg.text()}`));
  page1.on("pageerror", (err) => logs.push(`[P1 Error] ${err.message}`));

  // 1. P1 creates room
  await page1.goto("http://localhost:5173/");
  await page1.waitForSelector("button");
  console.log("P1 loaded landing");

  // Click create room
  const createBtn = await page1.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.textContent.includes("Create Room"));
  });
  await createBtn.click();
  await page1.waitForNavigation();
  const roomUrl = page1.url();
  console.log("P1 in room URL:", roomUrl);

  // Check start button
  const startBtnDisabled = await page1.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((x) => x.textContent.includes("Start Game"));
    return b ? b.disabled : null;
  });
  console.log("With 1 player, Start Game button disabled:", startBtnDisabled);

  // Check what message is shown
  const warnText = await page1.evaluate(() => {
    const p = document.querySelector(".text-warning");
    return p ? p.textContent : null;
  });
  console.log("Warning text shown:", warnText);

  // 2. Open P2
  const page2 = await browser.newPage();
  await page2.goto(roomUrl);
  await page2.waitForSelector("button");
  console.log("P2 loaded");
  // If prompt is shown, submit it
  const enterBtn = await page2.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.textContent.includes("Enter Game Room"));
  });
  if (enterBtn.asElement()) {
    await enterBtn.click();
  }
  await new Promise((r) => setTimeout(r, 1000));

  // 3. Open P3
  const page3 = await browser.newPage();
  await page3.goto(roomUrl);
  await page3.waitForSelector("button");
  console.log("P3 loaded");
  const enterBtn3 = await page3.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.textContent.includes("Enter Game Room"));
  });
  if (enterBtn3.asElement()) {
    await enterBtn3.click();
  }
  await new Promise((r) => setTimeout(r, 1500));

  // Now check P1's Start Game button
  const startBtnStateWith3 = await page1.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((x) => x.textContent.includes("Start Game"));
    return b ? { disabled: b.disabled, text: b.textContent } : null;
  });
  console.log("With 3 players, Start Game button state:", startBtnStateWith3);

  // Click start game
  console.log("P1 clicking Start Game...");
  await page1.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const b = btns.find((x) => x.textContent.includes("Start Game"));
    b.click();
  });

  await new Promise((r) => setTimeout(r, 2000));

  const p1Phase = await page1.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    return {
      hasModal: !!modal,
      modalText: modal ? modal.textContent : null,
      canvasVisible: !!document.querySelector("canvas"),
    };
  });
  console.log("P1 state after start:", p1Phase);

  const p2Phase = await page2.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    return {
      hasModal: !!modal,
      modalText: modal ? modal.textContent : null,
      canvasVisible: !!document.querySelector("canvas"),
    };
  });
  console.log("P2 state after start:", p2Phase);

  console.log("Console logs from P1:\n" + logs.join("\n"));

  await browser.close();
}

testStart().catch(console.error);
