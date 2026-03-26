const puppeteer = require('puppeteer');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5210';

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function takeScreenshots() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  // 1. Chat view - empty state (dark mode default)
  console.log('1. Chat empty state (dark mode)...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await delay(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-chat-empty-dark.png'), fullPage: false });

  // 2. Light mode toggle
  console.log('2. Chat empty state (light mode)...');
  const themeBtn = await page.$('button[title="Switch to light mode"], button[title="Switch to dark mode"]');
  if (themeBtn) await themeBtn.click();
  await delay(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-chat-empty-light.png'), fullPage: false });

  // Toggle back to dark mode
  const themeBtn2 = await page.$('button[title="Switch to light mode"], button[title="Switch to dark mode"]');
  if (themeBtn2) await themeBtn2.click();
  await delay(500);

  // 3. Documents panel
  console.log('3. Documents panel...');
  const docsBtn = await page.evaluateHandle(() => {
    const buttons = [...document.querySelectorAll('button')];
    return buttons.find(b => b.textContent.includes('Documents'));
  });
  if (docsBtn) await docsBtn.click();
  await delay(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-documents-panel.png'), fullPage: false });

  // 4. Analytics dashboard
  console.log('4. Analytics dashboard...');
  // Click close on documents first, then analytics
  const closeBtn = await page.evaluateHandle(() => {
    const buttons = [...document.querySelectorAll('button')];
    return buttons.find(b => b.textContent.trim() === '×' || b.classList.contains('close-button'));
  });
  if (closeBtn) {
    try { await closeBtn.click(); } catch (e) {}
  }
  await delay(500);

  const analyticsBtn = await page.evaluateHandle(() => {
    const buttons = [...document.querySelectorAll('button')];
    return buttons.find(b => b.textContent.includes('Analytics'));
  });
  if (analyticsBtn) await analyticsBtn.click();
  await delay(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-analytics-dashboard.png'), fullPage: false });

  // Go back to chat
  const closeBtn2 = await page.evaluateHandle(() => {
    const buttons = [...document.querySelectorAll('button')];
    return buttons.find(b => b.textContent.trim() === '×' || b.classList.contains('close-button'));
  });
  if (closeBtn2) {
    try { await closeBtn2.click(); } catch (e) {}
  }
  await delay(500);

  // 5. Send a chat message and capture streaming/response
  console.log('5. Chat with response...');
  const textarea = await page.$('textarea');
  if (textarea) {
    await textarea.type('What information is in the uploaded invoice document?', { delay: 20 });
    await delay(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-chat-typing.png'), fullPage: false });

    // Submit
    const sendBtn = await page.evaluateHandle(() => {
      const buttons = [...document.querySelectorAll('button')];
      return buttons.find(b => b.textContent.includes('Send'));
    });
    if (sendBtn) await sendBtn.click();

    // Wait for streaming to start
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-chat-streaming.png'), fullPage: false });

    // Wait for response to complete
    await delay(15000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-chat-response.png'), fullPage: false });

    // Scroll down to see sources if any
    await page.evaluate(() => {
      const container = document.querySelector('.messages-container');
      if (container) container.scrollTop = container.scrollHeight;
    });
    await delay(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-chat-sources.png'), fullPage: false });
  }

  // 6. Show conversation in sidebar
  console.log('6. Sidebar with conversations...');
  await delay(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-sidebar-conversations.png'), fullPage: false });

  // 7. Analytics with data now
  console.log('7. Analytics with data...');
  const analyticsBtn2 = await page.evaluateHandle(() => {
    const buttons = [...document.querySelectorAll('button')];
    return buttons.find(b => b.textContent.includes('Analytics'));
  });
  if (analyticsBtn2) await analyticsBtn2.click();
  await delay(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-analytics-with-data.png'), fullPage: false });

  await browser.close();
  console.log('Done! Screenshots saved to ./screenshots/');
}

takeScreenshots().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
