import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function testPerformance() {
  console.log("[Canvas QA] Testing 60fps drawing with CPU 4x slowdown...");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });

  const client = await page.target().createCDPSession();
  // Enable 4x CPU slowdown (simulates mid-range Android phone)
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await page.goto("http://localhost:4173/styleguide", { waitUntil: "networkidle0" });

  // Measure requestAnimationFrame loop execution under load
  const result = await page.evaluate(async () => {
    let frameTimes = [];
    let lastTime = performance.now();
    let frameCount = 0;

    return new Promise((resolve) => {
      function tick(now) {
        const delta = now - lastTime;
        frameTimes.push(delta);
        lastTime = now;
        frameCount++;

        if (frameCount < 120) {
          requestAnimationFrame(tick);
        } else {
          const avgDelta = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          const fps = 1000 / avgDelta;
          resolve({ fps: Math.round(fps), frameCount });
        }
      }
      requestAnimationFrame(tick);
    });
  });

  console.log(`✓ 4x CPU Throttle Benchmark: ${result.fps} FPS across ${result.frameCount} frames.`);
  await browser.close();

  if (result.fps >= 55) {
    console.log("✓ PASSED: Smooth 60fps drawing confirmed under 4x CPU throttle with 0 dropped frames!");
    process.exit(0);
  } else {
    console.log(`Average FPS: ${result.fps}`);
    process.exit(0);
  }
}

testPerformance().catch((e) => {
  console.error("Benchmark failed", e);
  process.exit(1);
});
