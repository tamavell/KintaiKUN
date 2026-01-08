// attendance.js - 勤怠確認画面の機能

// カレンダーの状態管理
const CalendarState = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    selectedDate: new Date()
};

/**
 * 日付をYYYY-MM-DD形式に変換
 */
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 時刻文字列を表示用に変換（HH:MM:SS → HH:MM）
 */
function formatTimeDisplay(timeStr) {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5);
}

/**
 * 休憩時間の合計を計算（分単位）
 */
function calculateTotalBreakMinutes(breaks) {
    let totalMinutes = 0;
    
    breaks.forEach(breakItem => {
        if (breakItem.start && breakItem.end) {
            const start = new Date(`2000-01-01 ${breakItem.start}`);
            const end = new Date(`2000-01-01 ${breakItem.end}`);
            const diffMs = end - start;
            totalMinutes += Math.floor(diffMs / 60000);
        }
    });
    
    return totalMinutes;
}

/**
 * 分を時:分形式に変換
 */
function formatMinutesToHHMM(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
}

/**
 * 勤務時間を計算（分単位）
 */
function calculateWorkMinutes(clockIn, clockOut, breakMinutes) {
    if (!clockIn || !clockOut) return 0;
    
    const start = new Date(`2000-01-01 ${clockIn}`);
    const end = new Date(`2000-01-01 ${clockOut}`);
    const diffMs = end - start;
    const totalMinutes = Math.floor(diffMs / 60000);
    
    return Math.max(0, totalMinutes - breakMinutes);
}

/**
 * サーバーからのデータを表示用に変換
 */
function transformAttendanceData(apiData) {
    if (!apiData || !Array.isArray(apiData)) return [];
    
    return apiData.map(record => {
        const breakMinutes = calculateTotalBreakMinutes(record.breaks || []);
        const workMinutes = calculateWorkMinutes(record.clock_in, record.clock_out, breakMinutes);
        
        // 現在休憩中かチェック（最後の休憩にendがない場合）
        const isOnBreak = record.breaks && record.breaks.length > 0 && 
                         !record.breaks[record.breaks.length - 1].end;
        
        return {
            date: record.date,
            name: record.employee_name,
            clockIn: formatTimeDisplay(record.clock_in),
            clockOut: formatTimeDisplay(record.clock_out),
            breakCount: (record.breaks || []).length,
            breakTotal: formatMinutesToHHMM(breakMinutes),
            workHours: formatMinutesToHHMM(workMinutes),
            onBreak: isOnBreak
        };
    });
}

/**
 * サーバーから勤怠データを取得
 */
async function fetchAttendanceData(date) {
    try {
        const formattedDate = formatDateForAPI(date);
        const response = await apiGetAttendanceByDate(formattedDate);
        
        if (response.success && response.data) {
            return transformAttendanceData(response.data);
        } else {
            console.error('Failed to fetch attendance data:', response.message);
            return [];
        }
    } catch (error) {
        console.error('Error fetching attendance data:', error);
        return [];
    }
}

// カレンダー初期化
function initializeCalendar() {
    const datePickerInput = document.getElementById('date-picker-input');
    const showCalendarBtn = document.getElementById('show-calendar-btn');
    const calendarPopup = document.getElementById('calendar-popup');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    if (!datePickerInput || !showCalendarBtn || !calendarPopup) return;
    
    // 今日の日付を初期値として設定
    updateDateInput();
    
    // カレンダーボタンのクリック
    showCalendarBtn.addEventListener('click', function() {
        calendarPopup.classList.add('active');
        renderCalendar();
    });
    
    // カレンダーの背景をクリックで閉じる
    calendarPopup.addEventListener('click', function(e) {
        if (e.target === calendarPopup) {
            calendarPopup.classList.remove('active');
        }
    });
    
    // 前月ボタン
    prevMonthBtn.addEventListener('click', function() {
        CalendarState.currentMonth--;
        if (CalendarState.currentMonth < 0) {
            CalendarState.currentMonth = 11;
            CalendarState.currentYear--;
        }
        renderCalendar();
    });
    
    // 次月ボタン
    nextMonthBtn.addEventListener('click', function() {
        CalendarState.currentMonth++;
        if (CalendarState.currentMonth > 11) {
            CalendarState.currentMonth = 0;
            CalendarState.currentYear++;
        }
        renderCalendar();
    });
}

// カレンダーの描画
function renderCalendar() {
    const calendarTitle = document.getElementById('calendar-title');
    const calendarDays = document.getElementById('calendar-days');
    
    if (!calendarTitle || !calendarDays) return;
    
    // タイトル更新
    calendarTitle.textContent = `${CalendarState.currentYear}年${CalendarState.currentMonth + 1}月`;
    
    // 月の最初の日と最後の日
    const firstDay = new Date(CalendarState.currentYear, CalendarState.currentMonth, 1);
    const lastDay = new Date(CalendarState.currentYear, CalendarState.currentMonth + 1, 0);
    const prevLastDay = new Date(CalendarState.currentYear, CalendarState.currentMonth, 0);
    
    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();
    
    // カレンダーの日付を生成
    let daysHTML = '';
    
    // 前月の日付
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        daysHTML += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    // 今月の日付
    const today = new Date();
    const isCurrentMonth = CalendarState.currentYear === today.getFullYear() && 
                          CalendarState.currentMonth === today.getMonth();
    
    for (let day = 1; day <= lastDate; day++) {
        const isSelected = CalendarState.selectedDate.getFullYear() === CalendarState.currentYear &&
                          CalendarState.selectedDate.getMonth() === CalendarState.currentMonth &&
                          CalendarState.selectedDate.getDate() === day;
        
        const isToday = isCurrentMonth && day === today.getDate();
        
        let classes = 'calendar-day';
        if (isSelected) classes += ' selected';
        if (isToday) classes += ' today';
        
        daysHTML += `<div class="${classes}" data-day="${day}">${day}</div>`;
    }
    
    // 次月の日付（グリッドを埋めるため）
    const totalCells = Math.ceil((firstDayOfWeek + lastDate) / 7) * 7;
    const nextMonthDays = totalCells - (firstDayOfWeek + lastDate);
    
    for (let day = 1; day <= nextMonthDays; day++) {
        daysHTML += `<div class="calendar-day other-month">${day}</div>`;
    }
    
    calendarDays.innerHTML = daysHTML;
    
    // 日付クリックイベント
    const dayElements = calendarDays.querySelectorAll('.calendar-day:not(.other-month)');
    dayElements.forEach(dayEl => {
        dayEl.addEventListener('click', function() {
            const day = parseInt(this.dataset.day);
            CalendarState.selectedDate = new Date(CalendarState.currentYear, CalendarState.currentMonth, day);
            updateDateInput();
            document.getElementById('calendar-popup').classList.remove('active');
        });
    });
}

// 日付入力欄の更新
async function updateDateInput() {
    const datePickerInput = document.getElementById('date-picker-input');
    if (datePickerInput) {
        const year = CalendarState.selectedDate.getFullYear();
        const month = String(CalendarState.selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(CalendarState.selectedDate.getDate()).padStart(2, '0');
        datePickerInput.value = `${year}年${month}月${day}日`;
    }
    
    // 日付が変更されたら自動的にデータを取得して表示
    const attendanceData = await fetchAttendanceData(CalendarState.selectedDate);
    renderAttendanceTable(attendanceData);
}

// 勤怠テーブルの描画
function renderAttendanceTable(data) {
    const tbody = document.getElementById('attendance-table-body');
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding: 40px; text-align: center; color: #999;">データがありません</td></tr>';
        return;
    }
    
    let html = '';
    data.forEach(record => {
        html += `
            <tr>
                <td>${record.date}</td>
                <td>${record.name}</td>
                <td>${record.clockIn}</td>
                <td>${record.clockOut}</td>
                <td>${record.breakCount}</td>
                <td>${record.breakTotal}</td>
                <td>${record.workHours}</td>
                <td>${record.onBreak ? '休憩中' : ''}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// 期間ボタンの処理
function setupPeriodButtons() {
    const periodButtons = document.querySelectorAll('.btn-period');
    
    periodButtons.forEach(btn => {
        btn.addEventListener('click', async function() {
            const period = this.dataset.period;
            
            // アクティブなボタンのスタイル更新
            periodButtons.forEach(b => {
                b.classList.remove('btn-today');
                b.style.background = '#4CAF50';
                b.style.color = 'white';
            });
            
            this.classList.add('btn-today');
            this.style.background = 'white';
            this.style.color = '#4CAF50';
            
            let targetDate = new Date();
            
            // 期間に応じた日付を設定
            switch(period) {
                case 'today':
                    // 今日の日付
                    targetDate = new Date();
                    break;
                case 'this-week':
                    // 今週の最初の日（日曜日）
                    const dayOfWeek = targetDate.getDay();
                    targetDate.setDate(targetDate.getDate() - dayOfWeek);
                    break;
                case 'this-month':
                    // 今月の最初の日
                    targetDate.setDate(1);
                    break;
                case 'prev-week':
                    // 先週の最初の日
                    const currentDayOfWeek = targetDate.getDay();
                    targetDate.setDate(targetDate.getDate() - currentDayOfWeek - 7);
                    break;
                case 'prev-month':
                    // 先月の最初の日
                    targetDate.setMonth(targetDate.getMonth() - 1);
                    targetDate.setDate(1);
                    break;
            }
            
            // 選択日付を更新
            CalendarState.selectedDate = targetDate;
            CalendarState.currentYear = targetDate.getFullYear();
            CalendarState.currentMonth = targetDate.getMonth();
            
            // 表示を更新
            await updateDateInput();
        });
    });
}

// 表示ボタンの処理
function setupDisplayButton() {
    const displayBtn = document.getElementById('display-btn');
    
    if (displayBtn) {
        displayBtn.addEventListener('click', async function() {
            // ローディング表示（オプション）
            const tbody = document.getElementById('attendance-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" style="padding: 40px; text-align: center; color: #999;">読み込み中...</td></tr>';
            }
            
            // サーバーからデータを取得
            const attendanceData = await fetchAttendanceData(CalendarState.selectedDate);
            renderAttendanceTable(attendanceData);
        });
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', async function() {
    // 注意: カレンダー機能はattendance-check.jsで実装されているため、
    // ここでのinitializeCalendar()呼び出しは不要（重複を避けるためコメントアウト）
    if (document.getElementById('attendance-check-screen')) {
        // initializeCalendar(); // attendance-check.jsで実装済み
        // setupPeriodButtons(); // attendance-check.jsで実装済み
        // setupDisplayButton(); // attendance-check.jsで実装済み
        
        // 初期データ表示（今日のデータを自動で読み込む）
        const todayData = await fetchAttendanceData(new Date());
        renderAttendanceTable(todayData);
    }
});
