import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();

import { login, sendMessage } from "./bot.js";
import { fetchHrefs_xBatch } from "./x_Crawler.js";

let globalSentLinks = [];
const globalCheckFile = `check_data.json`;
let targets = ["wsblau_info", "wsrtcg", "wstcg", "hololive_OCG", "souge2_WS", "Varis_YK1031", "seto_tcg", "shirakamifubuki"];

async function main() {
    // 載入全域已發送鏈接列表
    if (fs.existsSync(globalCheckFile)) {
        try {
            const fileData = JSON.parse(await fs.promises.readFile(globalCheckFile, "utf8"));
            globalSentLinks = Array.isArray(fileData) ? fileData : [];
        } catch (error) {
            console.error("Error loading global sent links:", error);
        }
    }
    await login();
    await new Promise(resolve => setTimeout(resolve, 3000));
    auto_Message(targets)
}

const auto_Message = async (targets) => {
    const batchSize = 5;
    let check = false;
    while (true) {
        console.log("開始爬取資料...");
        check = false;

        // 使用新的 fetchHrefs_xBatch，內部已處理並發
        const allLinks = await fetchHrefs_xBatch(targets, batchSize);

        // 統一處理發訊 (慢，但安全，避免 Discord 封鎖)
        for (const link of allLinks) {
            if (!globalSentLinks.includes(link)) {
                try {
                    await sendMessage(process.env.DISCORD_CHANNEL_ID, link);
                    globalSentLinks.push(link);
                    // 每次發訊小休 0.5 秒，這對 Discord 機器人來說比較安全
                    await new Promise(r => setTimeout(r, 500));
                    check = true;
                } catch (error) {
                    console.error(`Error sending message for ${link}:`, error.message);
                }
            }
        }

        if (check) {
            await fs.promises.writeFile(globalCheckFile, JSON.stringify(globalSentLinks, null, 2));
        }
        console.log(`等待下一輪...`);
        await new Promise(resolve => setTimeout(resolve, 60000));
    }
}

main();