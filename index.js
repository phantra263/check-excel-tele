const axios = require("axios");
const fs = require("fs");
const fetch = require("node-fetch");
const Papa = require("papaparse");
const express = require("express");

// ==== Cấu hình ====
const TELEGRAM_BOT_TOKEN = "8086622884:AAEOYGPF_UVmX5U06waAiBqRkz5gvK5sbXw";
const CHAT_ID = "7679670114";
const EXCEL_URL = "https://docs.google.com/spreadsheets/d/1AP64DvboaOfJ4BmLaab7s1ilXdG2dQp7W3z9FTY1XY0/export?format=csv&gid=0";
const STATE_FILE = "row_count.json";

// ==== Gửi tin nhắn Telegram ====
async function sendTelegramMessage(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
        chat_id: CHAT_ID,
        text: message,
    });
    console.log(`✅ Gửi Telegram: ${message}`);
}

// ==== Lấy số dòng từ Google Sheet CSV ====
async function getRowCountFromExcel(url) {
    console.log(`⏬ Đang tải CSV từ: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`❌ Không tải được file. Status: ${response.status}`);
    }

    const text = await response.text();
    const parsed = Papa.parse(text, { header: true });

    console.log(`📄 Đã đọc ${parsed.data.length} dòng`);
    if (parsed.data.length > 0) {
        console.log(`🔍 Dòng đầu: ${JSON.stringify(parsed.data[0])}`);
    }

    return parsed.data.length;
}

// ==== Đọc và lưu số dòng ====
function getLastRowCount() {
    if (fs.existsSync(STATE_FILE)) {
        const json = fs.readFileSync(STATE_FILE);
        return JSON.parse(json).rowCount;
    }
    return 0;
}

function saveRowCount(rowCount) {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ rowCount }));
}

// ==== Web server: gọi kiểm tra khi cron-job truy cập ====
const app = express();
app.get("/", async (_, res) => {
    try {
        const current = await getRowCountFromExcel(EXCEL_URL);
        const last = getLastRowCount();

        console.log(`[⏱️ CHECK] current: ${current}, last: ${last}`);

        if (current !== last) {
            const diff = current - last;
            if (diff > 0) {
                await sendTelegramMessage(`🟢 Có **${diff} dòng mới** được thêm vào Google Sheet!`);
            } else {
                await sendTelegramMessage(`🗑️ Có **${Math.abs(diff)} dòng đã bị xóa** khỏi Google Sheet!`);
            }
        } else {
            console.log("⚖️ Không có thay đổi về số dòng.");
        }

        saveRowCount(current);
        res.send("✅ Kiểm tra xong");
    } catch (e) {
        console.error("🚨 Lỗi:", e.message);
        res.status(500).send(`❌ Lỗi: ${e.message}`);
    }
});


app.listen(3000, () => console.log("🌐 Web server đang chạy tại cổng 3000"));
