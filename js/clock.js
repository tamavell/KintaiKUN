// clock.js - リアルタイム時計機能

// 時刻更新関数
function updateTime() {
    const now = new Date();
    const timeElements = document.querySelectorAll('.time');
    const dateElements = document.querySelectorAll('.date');
    
    // 時刻のフォーマット
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const timeStr = `${hours} : ${minutes} : ${seconds}`;
    
    // 日付のフォーマット
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const date = now.getDate().toString().padStart(2, '0');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = days[now.getDay()];
    const dateStr = `${year}年 ${month}月 ${date}日(${dayOfWeek})`;
    
    // DOM更新
    timeElements.forEach(el => {
        if (el) el.textContent = timeStr;
    });
    
    dateElements.forEach(el => {
        if (el) el.textContent = dateStr;
    });
}

// 日付フォーマット関数
function formatDate(date, format = 'YYYY/MM/DD') {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day);
}

// 時刻フォーマット関数
function formatTime(date, format = 'HH:mm:ss') {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return format
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

// タイムスタンプ取得
function getTimestamp() {
    return new Date().toISOString();
}