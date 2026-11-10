import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const distDir = path.resolve('./client/dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(distDir, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

server.listen(5188, async () => {
  console.log('Static server listening on http://localhost:5188');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto('http://localhost:5188', { waitUntil: 'domcontentloaded' });
    console.log('Loaded landing page');

    // Force browser mode override
    await page.evaluate(() => {
      localStorage.setItem('sketchroom_mode', 'browser');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    await sleep(500);

    await page.waitForSelector('input');
    await page.evaluate(() => {
      const inp = document.querySelector('input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, 'Bhargav');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      const btns = Array.from(document.querySelectorAll('button'));
      const create = btns.find((b) => b.innerText.includes('Create Room'));
      console.log('Found create button:', !!create);
      create?.click();
    });

    console.log('Clicked Create Room');
    await sleep(2000);
    await page.screenshot({ path: 'C:/Users/bharg/.gemini/antigravity/brain/c3e16e42-b68c-4faa-ac97-f5212cb35498/screenshots/debug_create.png' });

    // Wait for room navigation
    await page.waitForFunction(() => window.location.pathname.startsWith('/room/'), { timeout: 10000 });
    console.log('Room URL:', page.url());

    // Wait for lobby to render
    await page.waitForFunction(() => document.body.innerText.includes('Players in Lobby'), { timeout: 10000 });
    console.log('Lobby rendered!');

    await sleep(1000);

    // Click "South Cinema" preset button
    const southPresetClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const s = btns.find((b) => b.innerText.includes('South Cinema'));
      if (s) {
        s.click();
        return true;
      }
      return false;
    });
    console.log('Clicked South Cinema preset:', southPresetClicked);

    await sleep(800);

    // Save screenshot of Lobby with South Cinema categories selected!
    await page.screenshot({ path: 'C:/Users/bharg/.gemini/antigravity/brain/c3e16e42-b68c-4faa-ac97-f5212cb35498/screenshots/south_cinema_lobby.png' });
    console.log('Saved south_cinema_lobby.png');

    // Click "Start Game"
    const startClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const start = btns.find((b) => b.innerText.includes('Start Game'));
      if (start) {
        start.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Start Game:', startClicked);

    // Wait for word choice modal
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Choose a Word to Draw') || document.body.innerText.includes('Round 1');
    }, { timeout: 10000 });
    console.log('Word choice modal appeared!');

    await sleep(800);

    const dialogWords = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]') || document.body;
      const btns = Array.from(dialog.querySelectorAll('button'));
      return btns.map((b) => b.innerText.trim()).filter((t) => t.length > 1);
    });
    console.log('Word choice options presented to drawer:', dialogWords);

    await page.screenshot({ path: 'C:/Users/bharg/.gemini/antigravity/brain/c3e16e42-b68c-4faa-ac97-f5212cb35498/screenshots/south_word_choice.png' });
    console.log('Saved south_word_choice.png');

    // Select the first word!
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]') || document.body;
      const btns = Array.from(dialog.querySelectorAll('button'));
      const firstWordBtn = btns.find((b) => b.className.includes('capitalize'));
      if (firstWordBtn) {
        console.log('Selecting word:', firstWordBtn.innerText);
        firstWordBtn.click();
      }
    });

    await sleep(1500);

    // Save screenshot of drawing round with selected South word!
    await page.screenshot({ path: 'C:/Users/bharg/.gemini/antigravity/brain/c3e16e42-b68c-4faa-ac97-f5212cb35498/screenshots/south_drawing_round.png' });
    console.log('Saved south_drawing_round.png');

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
