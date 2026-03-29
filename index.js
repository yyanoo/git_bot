import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();

import { login, sendMessage } from "./bot.js";
import { fetchHrefs_x } from "./x_Crawler.js";

// 全域已發送的鏈接列表
let globalSentLinks = [];
const globalCheckFile = `check_data.json`;

// 載入全域已發送鏈接列表
if (fs.existsSync(globalCheckFile)) {
    try {
        const fileData = JSON.parse(fs.readFileSync(globalCheckFile, "utf8"));
        globalSentLinks = Array.isArray(fileData) ? fileData : [];
    } catch (error) {
        console.error("Error loading global sent links:", error);
    }
}

async function main() {
    await login();
    await Promise.all([
        auto_Message("wsblau_info"),
        auto_Message("wsrtcg"),
        auto_Message("wstcg"),
        auto_Message("hololive_OCG"),
    ]);
}

const auto_Message = async (d) => {
    let data = [];
    while (true) {
        data = await fetchHrefs_x(d)
        for (let i = 0; i < data.length; i++) {
            // 檢查全域列表，避免重複發送
            if (globalSentLinks.includes(data[i])) continue;

            sendMessage(process.env.DISCORD_CHANNEL_ID, data[i]);
            globalSentLinks.push(data[i]);

            // 同步更新全域檔案
            fs.writeFileSync(globalCheckFile, JSON.stringify(globalSentLinks, null, 2));
        }
        await new Promise(resolve => setTimeout(resolve, 1800000));
    }
}

main();