import fs from "fs";
import puppeteer from "puppeteer";

// 載入 cookies 和 localStorage（只載一次）
async function loadAuthData() {
    const auth = { cookies: [], storage: {} };

    if (fs.existsSync("cookies_x.json")) {
        try {
            const cookiesData = JSON.parse(fs.readFileSync("cookies_x.json", "utf8"));
            const futureTime = Math.floor(Date.now() / 1000) + 86400 * 365;
            auth.cookies = cookiesData.cookies.map(cookie => ({
                ...cookie,
                expires: futureTime,
                httpOnly: undefined
            }));
        } catch (error) {
            console.error("Error loading cookies:", error);
        }
    }

    if (fs.existsSync("localStorage_x.json")) {
        try {
            auth.storage = JSON.parse(fs.readFileSync("localStorage_x.json", "utf8"));
        } catch (error) {
            console.error("Error loading localStorage:", error);
        }
    }

    return auth;
}

// 單 target 爬蟲邏輯
async function crawlSingleTarget(page, target, auth) {
    try {
        // 設定 cookies 和 localStorage
        if (auth.cookies.length > 0) {
            await page.setCookie(...auth.cookies);
        }

        const url = `https://x.com/${target}`;
        try {
            await page.goto(url, { waitUntil: "load", timeout: 60000 });
        } catch (error) {
            console.warn(`Navigation timeout for ${target}, continuing...`);
        }

        // 恢復 localStorage
        if (Object.keys(auth.storage).length > 0) {
            await page.evaluate((storage) => {
                Object.entries(storage).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });
            }, auth.storage);
        }

        // 滾動頁面等待載入
        await new Promise(resolve => setTimeout(resolve, 3000));
        await page.evaluate(() => window.scrollBy(0, 3000));
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 取得 hrefs
        const hrefs = await page.$$eval(
            'a[href]',
            (links, target) =>
                links
                    .map((a) => a.getAttribute('href'))
                    .filter((href) => href && new RegExp(`^/${target}/status/\\d+$`).test(href)),
            target
        );

        const links = hrefs.map(href => `https://x.com${href}`);

        // 保存 localStorage（只保存一次）
        try {
            const localStorage_data = await page.evaluate(() => {
                const storage = {};
                for (let i = 0; i < window.localStorage.length; i++) {
                    const key = window.localStorage.key(i);
                    storage[key] = window.localStorage.getItem(key);
                }
                return storage;
            });
            if (Object.keys(localStorage_data).length > 0) {
                await fs.promises.writeFile("localStorage_x.json", JSON.stringify(localStorage_data, null, 2));
            }
        } catch (error) {
            console.error("Error saving localStorage:", error);
        }

        return links;
    } catch (error) {
        console.error(`Error crawling ${target}:`, error.message);
        return [];
    }
}

// 對單個 target 呼叫（保持向後相容）
export async function fetchHrefs_x(target) {
    const browser = await puppeteer.launch({
        headless: true,
        protocolTimeout: 180000
    });

    try {
        const auth = await loadAuthData();
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000);
        await page.setViewport({ width: 1920, height: 1920 });

        const links = await crawlSingleTarget(page, target, auth);
        await page.close();
        return links;
    } finally {
        await browser.close();
    }
}

// 批量並發爬蟲（推薦用於多 target）
export async function fetchHrefs_xBatch(targets, concurrency = 5) {
    const browser = await puppeteer.launch({
        headless: true,
        protocolTimeout: 180000
    });

    try {
        const auth = await loadAuthData();
        const allLinks = [];

        // 分批並發處理，限制同時開啟 page 數
        for (let i = 0; i < targets.length; i += concurrency) {
            const batch = targets.slice(i, i + concurrency);
            const pages = await Promise.all(
                batch.map(async () => {
                    const page = await browser.newPage();
                    page.setDefaultNavigationTimeout(60000);
                    await page.setViewport({ width: 1920, height: 1920 });
                    return page;
                })
            );

            const results = await Promise.all(
                batch.map((target, index) => crawlSingleTarget(pages[index], target, auth))
            );

            // 關閉本批次的 pages
            await Promise.all(pages.map(page => page.close()));

            // 合併結果
            results.forEach(links => allLinks.push(...links));
            console.log(`Batch complete: processed ${batch.join(", ")}`);
        }

        return allLinks;
    } finally {
        await browser.close();
    }
}