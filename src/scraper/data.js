import * as cheerio from 'cheerio';
import puppeteer from "puppeteer";
import slugify from 'slugify';
import sleep from '../utils/sleep.js';

let page = null;

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

    page = await browser.newPage();

    await page.goto(process.env.YAHOO_FINANCE_BASE_URL + '/' + stockName);

    await page.locator('.accept-all').click();

    await page.waitForSelector('.mainContent', {
        timeout: 60_000
    });

    const data = {
        chart: (await chartValues()),
        profile: (await profile(stockName)),
        financials: {
            income_statement: (await financialValues(stockName, 'financials')),
            balance_sheet: (await financialValues(stockName, 'balance-sheet')),
            cash_flow: (await financialValues(stockName, 'cash-flow')),
        }
    };

    browser.close();

    return data;
}

async function chartValues() {
    try {
        const atCloseElement = await page.waitForSelector('.yf-ipw1h0[data-testid="qsp-price"]', {
            timeout: 60_000
        });

        const postCloseElement = await page.waitForSelector('.yf-ipw1h0[data-testid="qsp-post-price"]', {
            timeout: 60_000
        });

        const closeValue = await atCloseElement.evaluate(el => el.textContent);
        const postCloseValue = await postCloseElement.evaluate(el => el.textContent);
        return {
            at_close: parseFloat(closeValue), 
            after_hours: parseFloat(postCloseValue), 
        };
    } catch (error) {
        return {
            at_close: null, 
            after_hours: null, 
        };
    }
}

async function financialValues(stockName, type) {
    await page.goto(process.env.YAHOO_FINANCE_BASE_URL + '/' + stockName + '/' + type, {
        timeout: 60_000
    });

    const annualTableContent = await tableContent(page);
    const quarterlyTableContent = await tableContent(page, true);

    return {
        annual: parseTable(annualTableContent),
        quarterly: parseTable(quarterlyTableContent)
    };
}

async function profile(stockName) {
    await page.goto(process.env.YAHOO_FINANCE_BASE_URL + '/' + stockName + '/profile', {
        timeout: 60_000
    });

    const assetProfileSection = await page.waitForSelector('[data-testid="asset-profile"]');
    const htmlContent = await assetProfileSection.evaluate(el => el.innerHTML);

    const $ = cheerio.load(htmlContent);

    return {
        name: $('.header').text().trim(),
        ticker: stockName.toUpperCase(),
        country: $('.address > div:last-child').text().trim(),
        sector: $('.company-stats a:first-child').text().trim(),
        industry: $('.company-stats a:nth-child(2)').text().trim(),
    };
}

async function tableContent(page, isQuarterly = false)
{
    if(isQuarterly) {
        await page.locator('#tab-quarterly').click();
        await sleep(5_000);
    }

    const table = await page.waitForSelector('.table.yf-9ft13', {
        timeout: 60_000
    });

    await page.locator('.expandContainer > button').click();

    return await table.evaluate(el => el.innerHTML);
}

function parseTable(htmlString) {
    const $ = cheerio.load(htmlString);
    const tableHeaders = $('.tableHeader > div.row > div.column:not(:first-child)');
    let tableData = [];
    
    tableHeaders.each((i, div) => {
        const quarterRaw = parseInt($(div).text().split('/')[0]);
        const quarter = quarterRaw < 3 || isNaN(quarterRaw) ? 1 : Math.ceil(quarterRaw / 3);
        const year = $(div).text().includes('TTM') ? 'TTM' : parseInt($(div).text().split('/')[2]);

        const data = {
            year, quarter
        };

        $('.tableBody > div.row').each((_, row) => {
            if ($(row).html() !== null) {
                const value = $(row).find(`div.column:nth-child(${i + 2})`).text();
                let saveValue = value === '--' ? undefined : parseInt(value.replaceAll(',', ''));
                const saveAs = slugify($(row).find(`div.column:nth-child(1)`).text(), {
                    lower: true,
                    replacement: '_'
                });
                data[saveAs] = saveValue;
            }
        });

        tableData.push(data);
    });

    return tableData;
}

