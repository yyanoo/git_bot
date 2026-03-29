import fs from "fs";
import puppeteer from "puppeteer";
let data = [];

export async function fetchHrefs_x(d) {
    const url = `https://x.com/${d}`;
    const browser = await puppeteer.launch({
        headless: true,
        protocolTimeout: 180000
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000); // 60 second timeout
    // 設定視窗大小，影響載入長度
    await page.setViewport({
        width: 1920,
        height: 1920
    });
    // 嘗試載入 cookies 和 localStorage，並處理可能的錯誤
    try {
        if (fs.existsSync("cookies_x.json")) {
            try {
                const cookiesData = JSON.parse(fs.readFileSync("cookies_x.json", "utf8"));
                const futureTime = Math.floor(Date.now() / 1000) + 86400 * 365;
                const processedCookies = cookiesData.cookies.map(cookie => {
                    const processed = { ...cookie };
                    delete processed.httpOnly;
                    processed.expires = futureTime;
                    return processed;
                });

                await page.setCookie(...processedCookies);
            } catch (error) {
                console.error("Error processing cookies:", error);
            }
        }

        try {
            await page.goto(url, { waitUntil: "load", timeout: 60000 });
        } catch (error) {
            console.warn(`Navigation timeout for ${url}, continuing anyway...`, error.message);
        }

        // 恢復 localStorage 並等待一段時間確保資料載入
        if (fs.existsSync(`localStorage_x.json`)) {
            try {
                const storageData = JSON.parse(fs.readFileSync(`localStorage_x.json`, "utf8"));
                await page.evaluate((storage) => {
                    Object.entries(storage).forEach(([key, value]) => {
                        localStorage.setItem(key, value);
                    });
                }, storageData);
            } catch (error) {
                console.error("Error restoring localStorage:", error);
            }
        }
        await page.goto(url, { waitUntil: "load", timeout: 60000 });
        await page.evaluate(() => {
            window.scrollBy(0, 3000);
        });
        await page.goto(url, { waitUntil: "load", timeout: 60000 });

        //取得資料
        const hrefs = await page.$$eval(
            'a[href]',
            (links, d) =>
                links
                    .map((a) => a.getAttribute('href'))
                    .filter((href) => href && new RegExp(`^/${d}/status/\\d+$`).test(href)),
            d
        );
        data.push(...hrefs.map(href => `https://x.com${href}`));
        // 保存 localStorage
        const localStorage_data = await page.evaluate(() => {
            const storage = {};
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                storage[key] = window.localStorage.getItem(key);
            }
            return storage;
        });
        if (Object.keys(localStorage_data).length > 0) {
            fs.writeFileSync(`localStorage_x.json`, JSON.stringify(localStorage_data, null, 2));
        }

    } finally {
        await browser.close();
    }
    return data;
}