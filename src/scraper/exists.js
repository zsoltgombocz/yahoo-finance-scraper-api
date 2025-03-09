import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config();

export default async function (stockName) {
    const browser = await puppeteer.launch({
        protocolTimeout: 360_000,
        timeout: 120_000,
        headless: process.env.ENV === 'production' ? "new" : false,
        args: process.env.ENV === 'production' ? [
            "--no-sandbox",
            "--disable-gpu",
        ] : undefined
    });

    const page = await browser.newPage();

    await page.goto(process.env.YAHOO_FINANCE_BASE_URL + '/' + stockName);

    await page.locator('.accept-all').click();

    await page.waitForSelector('.mainContent');

    const pageContent = await page.content();

    browser.close();

    return ! pageContent.includes('No results for');
}
