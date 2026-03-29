import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();

import { login, sendMessage } from "./bot.js";
import { fetchHrefs_x } from "./x_Crawler.js";

let globalSentLinks = [];

async function main() {
    await login();
    const targets = ["wsblau_info", "wsrtcg", "wstcg", "hololive_OCG", "souge2_WS"];
    auto_Message(targets)
}

const auto_Message = async (targets) => {
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
    await new Promise(resolve => setTimeout(resolve, 3000));

    while (true) {
        for (const target of targets) {
            console.log(`Fetching data for ${target}...`);
            const data = await fetchHrefs_x(target)
            for (let i = 0; i < data.length; i++) {
                // 檢查全域列表，避免重複發送
                if (globalSentLinks.includes(data[i])) continue;

                sendMessage(process.env.DISCORD_CHANNEL_ID, data[i]);
                globalSentLinks.push(data[i]);

                // 同步更新全域檔案
                fs.writeFileSync(globalCheckFile, JSON.stringify(globalSentLinks, null, 2));
            }
        }
        console.log("Cycle complete. Waiting for the next cycle...");
        await new Promise(resolve => setTimeout(resolve, 1800000));
    }
}

main();