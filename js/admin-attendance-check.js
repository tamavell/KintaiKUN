/**
 * 管理者用勤怠確認機能(サーバー版)
 */

/**
 * 管理者用勤怠確認画面の初期化
 */
function initAdminAttendanceCheck() {
    console.log('管理者用勤怠確認画面を初期化');
    
    // 日付入力フィールドに今日の日付を設定
    const dateInput = document.getElementById('admin-date-select');
    if (dateInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    }
    
    // 表示ボタンのイベントリスナー
    const showButton = document.querySelector('[data-action="show-admin-attendance"]');
    if (showButton) {
        showButton.removeEventListener('click', showAdminAttendanceData);
        showButton.addEventListener('click', showAdminAttendanceData);
    }
    
    // 勤怠編集ボタンのイベントリスナー
    const editButton = document.querySelector('[data-action="goto-attendance-edit-from-admin"]');
    if (editButton) {
        editButton.removeEventListener('click', gotoAttendanceEditFromAdmin);
        editButton.addEventListener('click', gotoAttendanceEditFromAdmin);
    }
    
    // 月単位/日単位の切り替え
    const displayTypeRadios = document.querySelectorAll('input[name="admin-display-type"]');
    displayTypeRadios.forEach(radio => {
        radio.removeEventListener('change', handleAdminDisplayTypeChange);
        radio.addEventListener('change', handleAdminDisplayTypeChange);
    });
    
    // 初期データを表示
    showAdminAttendanceData();
}

/**
 * 表示タイプの変更処理
 */
function handleAdminDisplayTypeChange(event) {
    const displayType = event.target.value;
    const dateInput = document.getElementById('admin-date-select');
    
    if (displayType === 'monthly') {
        // 月単位の場合、日付入力をmonth型に変更
        dateInput.type = 'month';
    } else {
        // 日単位の場合、日付入力をdate型に変更
        dateInput.type = 'date';
    }
}

/**
 * 勤怠データを表示
 */
async function showAdminAttendanceData() {
    const tbody = document.getElementById('admin-check-tbody');
    if (!tbody) return;
    
    // 表示タイプを取得（日単位 or 月単位）
    const displayTypeRadio = document.querySelector('input[name="admin-display-type"]:checked');
    const displayType = displayTypeRadio ? displayTypeRadio.value : 'daily';
    
    // 選択された日付を取得
    const dateInput = document.getElementById('admin-date-select');
    const selectedValue = dateInput ? dateInput.value : '';
    
    // 選択中の店舗プレフィックスを取得
    const prefix = typeof getSelectedStorePrefix === 'function' ? getSelectedStorePrefix() : null;
    
    try {
        let records = [];
        
        if (displayType === 'monthly') {
            // 月単位: YYYY-MM形式から月初〜月末を計算
            let year, month;
            if (selectedValue && selectedValue.match(/^\d{4}-\d{2}$/)) {
                [year, month] = selectedValue.split('-').map(Number);
            } else {
                const today = new Date();
                year = today.getFullYear();
                month = today.getMonth() + 1;
            }
            
            // 月初と月末の日付を作成
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            
            console.log(`月単位データ取得: ${startDate} 〜 ${endDate}`);
            
            // 期間指定APIを使用
            const response = await apiGetAttendanceList(startDate, endDate, null, null, prefix);
            
            if (response.success && response.data) {
                // attendance-list.phpの形式をadmin-attendance-check用に変換
                records = response.data.map(item => ({
                    employee_id: item.employee_id,
                    employee_name: item.employee_name,
                    work_date: item.date,
                    clock_in: item.clock_in,
                    clock_out: item.clock_out,
                    breaks: item.breaks || [],
                    hourly_wage: item.hourly_wage,
                    work_hours: item.work_hours,
                    overtime: item.overtime,
                    night_hours: item.night_hours,
                    payment: item.payment
                }));
            }
        } else {
            // 日単位: YYYY-MM-DD形式
            let targetDate = selectedValue;
            if (!targetDate || !targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const today = new Date();
                targetDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            }
            
            console.log(`日単位データ取得: ${targetDate}`);
            
            // 日付指定APIを使用
            const response = await apiGetAttendanceByDate(targetDate, null, prefix);
            
            if (response.success && response.data) {
                records = response.data.map(item => ({
                    employee_id: item.employee_id,
                    employee_name: item.employee_name,
                    work_date: item.date,
                    clock_in: item.clock_in,
                    clock_out: item.clock_out,
                    breaks: item.breaks || [],
                    hourly_wage: item.hourly_wage,
                    work_hours: item.work_hours,
                    overtime: item.overtime,
                    night_hours: item.night_hours,
                    payment: item.payment
                }));
            }
        }
        
        // テーブルをクリア
        tbody.innerHTML = '';
        
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="padding: 40px; text-align: center; color: #999;">データがありません</td></tr>';
            return;
        }
        
        // テーブルを描画
        records.forEach((record, index) => {
            // APIから取得した勤務時間を使用（なければ計算）
            const workHours = record.work_hours || calculateWorkHours(record);
            const overtime = record.overtime || '0:00';
            const nightHours = record.night_hours || '0:00';
            const payment = record.payment || 0;
            
            // 休憩時間のフォーマット
            let breakStartStr = '---';
            let breakEndStr = '---';
            
            if (record.breaks && record.breaks.length > 0) {
                breakStartStr = record.breaks.map(b => b.start || '---').join('<br>');
                breakEndStr = record.breaks.map(b => b.end || '---').join('<br>');
            }
            
            const tr = document.createElement('tr');
            if (index === 0) {
                tr.classList.add('highlight-row');
            }
            
            tr.innerHTML = `
                <td>${formatDateForAdmin(record.work_date)}</td>
                <td>${record.employee_name || '---'}</td>
                <td>${record.clock_in || '---'}</td>
                <td>${record.clock_out || '---'}</td>
                <td>${breakStartStr}</td>
                <td>${breakEndStr}</td>
                <td>${workHours}</td>
                <td>${overtime}</td>
                <td>${nightHours}</td>
                <td>${record.hourly_wage ? record.hourly_wage.toLocaleString() : '---'}</td>
                <td>${payment ? payment.toLocaleString() : '---'}</td>
            `;
            
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to load attendance data:', error);
        tbody.innerHTML = '<tr><td colspan="11" style="padding: 40px; text-align: center; color: #f44;">データの読み込みに失敗しました</td></tr>';
    }
}

/**
 * 勤怠データから勤務時間を計算
 */
function calculateWorkHours(record) {
    if (!record.clock_in || !record.clock_out) {
        return '---';
    }
    
    const clockIn = parseTime(record.clock_in);
    let clockOut = parseTime(record.clock_out);
    
    if (!clockIn || !clockOut) {
        return '---';
    }
    
    // 日跨ぎ対応：退勤時刻が出勤時刻より前の場合、翌日として計算
    if (clockOut < clockIn) {
        clockOut.setDate(clockOut.getDate() + 1);
    }
    
    // 勤務時間（分）
    let workMinutes = (clockOut - clockIn) / (1000 * 60);
    
    // 休憩時間を差し引く
    if (record.breaks && record.breaks.length > 0) {
        record.breaks.forEach(breakTime => {
            if (breakTime.start && breakTime.end) {
                const breakStart = parseTime(breakTime.start);
                let breakEnd = parseTime(breakTime.end);
                if (breakStart && breakEnd) {
                    // 日跨ぎ対応：休憩終了時刻が休憩開始時刻より前の場合
                    if (breakEnd < breakStart) {
                        breakEnd.setDate(breakEnd.getDate() + 1);
                    }
                    const breakMinutes = (breakEnd - breakStart) / (1000 * 60);
                    workMinutes -= breakMinutes;
                }
            }
        });
    }
    
    if (workMinutes < 0) workMinutes = 0;
    
    const hours = Math.floor(workMinutes / 60);
    const minutes = Math.floor(workMinutes % 60);
    
    return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 休憩時間の合計を計算
 */
function calculateTotalBreakTime(record) {
    let totalMinutes = 0;
    
    if (record.breaks && record.breaks.length > 0) {
        record.breaks.forEach(breakTime => {
            if (breakTime.start && breakTime.end) {
                const breakStart = parseTime(breakTime.start);
                let breakEnd = parseTime(breakTime.end);
                if (breakStart && breakEnd) {
                    // 日跨ぎ対応：休憩終了時刻が休憩開始時刻より前の場合
                    if (breakEnd < breakStart) {
                        breakEnd.setDate(breakEnd.getDate() + 1);
                    }
                    totalMinutes += (breakEnd - breakStart) / (1000 * 60);
                }
            }
        });
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 時刻文字列をDateオブジェクトに変換
 */
function parseTime(timeStr) {
    if (!timeStr) return null;
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
}

/**
 * 日付を表示用にフォーマット（管理者用）
 */
function formatDateForAdmin(dateStr) {
    if (!dateStr) return '---';
    
    // YYYY-MM-DD形式の文字列をそのまま変換
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const year = parts[0];
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        return `${year}/${month}/${day}`;
    }
    
    return dateStr;
}

/**
 * 勤怠編集画面へ遷移
 */
function gotoAttendanceEditFromAdmin() {
    console.log('勤怠編集画面へ遷移');
    showScreen('attendance-edit-screen');
}

// ページ読み込み時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('admin-attendance-check-screen')) {
            // 画面が表示されたときに初期化
        }
    });
} else {
    // DOMContentLoadedが既に発火している場合
}
