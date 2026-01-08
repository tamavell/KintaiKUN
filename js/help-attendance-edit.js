// help-attendance-edit.js - ヘルプ勤怠編集機能

// 現在読み込まれているヘルプ勤怠レコードのID
let currentHelpAttendanceId = null;

// ヘルプ勤怠編集画面の初期化
async function initHelpEdit() {
    console.log('ヘルプ勤怠編集画面を初期化');
    setupHelpEditListeners();
    await loadHelpEditEmployeeOptions();
    await loadHelpEditStoreOptions();
    setDefaultHelpEditDate();
    clearAllHelpFields();
}

// 従業員選択肢をサーバーから読み込み
async function loadHelpEditEmployeeOptions() {
    const select = document.getElementById('help-edit-employee-select');
    if (!select) return;
    
    // 選択中の店舗プレフィックスを取得
    const prefix = typeof getSelectedStorePrefix === 'function' ? getSelectedStorePrefix() : null;
    
    try {
        // APIから従業員リストを取得
        const response = await apiGetAllEmployees(null, prefix);
        
        if (!response.success || !response.data) {
            console.error('従業員データ取得失敗:', response.message);
            select.innerHTML = '<option value="">従業員データを取得できませんでした</option>';
            return;
        }
        
        const employees = response.data;
        
        // セレクトボックスをクリアして再構築
        select.innerHTML = '<option value="">-- 従業員を選択 --</option>';
        
        if (employees.length === 0) {
            select.innerHTML = '<option value="">登録された従業員がいません</option>';
            return;
        }
        
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.employee_id;
            option.textContent = emp.employee_name;
            option.dataset.hourlyWage = emp.hourly_wage || 0;
            select.appendChild(option);
        });
        
        console.log(`従業員リストを読み込みました: ${employees.length}名`);
        
    } catch (error) {
        console.error('従業員リスト取得エラー:', error);
        select.innerHTML = '<option value="">エラーが発生しました</option>';
    }
}

// 店舗選択肢を読み込み
async function loadHelpEditStoreOptions() {
    const select = document.getElementById('help-edit-store-select');
    if (!select) return;
    
    // configから店舗リストを取得
    if (typeof config !== 'undefined' && config.stores) {
        select.innerHTML = '<option value="">-- 店舗を選択 --</option>';
        config.stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            select.appendChild(option);
        });
    }
}

// デフォルトの日付を設定（今日）
function setDefaultHelpEditDate() {
    const dateInput = document.getElementById('help-edit-target-date');
    if (!dateInput) return;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
}

// イベントリスナーの設定
function setupHelpEditListeners() {
    // 数字のみ入力を許可
    const timeInputs = document.querySelectorAll('#help-edit-screen .time-input-small');
    timeInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '');
            // 時間は23まで、分は59まで
            if (this.id.includes('-h') && parseInt(this.value) > 23) {
                this.value = '23';
            }
            if (this.id.includes('-m') && parseInt(this.value) > 59) {
                this.value = '59';
            }
        });
    });
}

// 記録読み込み（サーバーからヘルプ勤怠データを取得）
async function loadHelpAttendance() {
    const select = document.getElementById('help-edit-employee-select');
    const dateInput = document.getElementById('help-edit-target-date');
    
    if (!select || !dateInput) return;
    
    const employeeId = select.value;
    const date = dateInput.value;
    
    if (!employeeId || !date) {
        showMessage('名前と日付を選択してください', 'error');
        return;
    }
    
    try {
        // APIからヘルプ勤怠データを取得（employeeIdを直接渡す - 通常勤怠と同じ）
        const response = await apiGetHelpAttendance(date, date, null, null, null, employeeId);
        
        if (!response.success) {
            showMessage('データの取得に失敗しました', 'error');
            return;
        }
        
        const records = response.data || [];
        
        if (records.length === 0) {
            showMessage('該当するヘルプ勤怠記録がありません', 'info');
            clearAllHelpFields();
            currentHelpAttendanceId = null;
            return;
        }
        
        // 最初のレコードを使用（通常勤怠と同じ）
        const record = records[0];
        currentHelpAttendanceId = record.id;
        
        // ヘルプ先店舗をセット
        const storeSelect = document.getElementById('help-edit-store-select');
        if (storeSelect && record.help_store) {
            storeSelect.value = record.help_store;
        }
        
        // フォームにデータをセット
        setHelpTimeFields(record.clock_in, 'help-edit-clock-in-h', 'help-edit-clock-in-m');
        setHelpTimeFields(record.clock_out, 'help-edit-clock-out-h', 'help-edit-clock-out-m');
        
        // 休憩データをセット
        clearHelpBreak1();
        clearHelpBreak2();
        clearHelpBreak3();
        
        if (record.breaks && record.breaks.length > 0) {
            if (record.breaks[0]) {
                setHelpTimeFields(record.breaks[0].start, 'help-edit-break1-start-h', 'help-edit-break1-start-m');
                setHelpTimeFields(record.breaks[0].end, 'help-edit-break1-end-h', 'help-edit-break1-end-m');
            }
            if (record.breaks[1]) {
                setHelpTimeFields(record.breaks[1].start, 'help-edit-break2-start-h', 'help-edit-break2-start-m');
                setHelpTimeFields(record.breaks[1].end, 'help-edit-break2-end-h', 'help-edit-break2-end-m');
            }
            if (record.breaks[2]) {
                setHelpTimeFields(record.breaks[2].start, 'help-edit-break3-start-h', 'help-edit-break3-start-m');
                setHelpTimeFields(record.breaks[2].end, 'help-edit-break3-end-h', 'help-edit-break3-end-m');
            }
        }
        
        showMessage('ヘルプ記録を読み込みました', 'success');
        
    } catch (error) {
        console.error('ヘルプ勤怠データ取得エラー:', error);
        showMessage('データの読み込みに失敗しました', 'error');
    }
}

// 時刻文字列をフォームフィールドにセット
function setHelpTimeFields(timeStr, hourFieldId, minFieldId) {
    const hourField = document.getElementById(hourFieldId);
    const minField = document.getElementById(minFieldId);
    
    if (!hourField || !minField) return;
    
    if (!timeStr) {
        hourField.value = '';
        minField.value = '';
        return;
    }
    
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
        hourField.value = parts[0];
        minField.value = parts[1];
    }
}

// フォームから時刻を取得
function getHelpTimeFromFields(hourFieldId, minFieldId) {
    const hourField = document.getElementById(hourFieldId);
    const minField = document.getElementById(minFieldId);
    
    if (!hourField || !minField) return null;
    
    const hour = hourField.value.trim();
    const min = minField.value.trim();
    
    if (!hour && !min) return null;
    
    const h = hour.padStart(2, '0');
    const m = min.padStart(2, '0');
    
    return `${h}:${m}`;
}

// 全フィールドをクリア
function clearAllHelpFields() {
    clearHelpWorkTime();
    clearHelpBreak1();
    clearHelpBreak2();
    clearHelpBreak3();
    currentHelpAttendanceId = null;
    
    const storeSelect = document.getElementById('help-edit-store-select');
    if (storeSelect) storeSelect.value = '';
}

// 勤務時間をクリア
function clearHelpWorkTime() {
    const fields = ['help-edit-clock-in-h', 'help-edit-clock-in-m', 'help-edit-clock-out-h', 'help-edit-clock-out-m'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// 休憩1をクリア
function clearHelpBreak1() {
    const fields = ['help-edit-break1-start-h', 'help-edit-break1-start-m', 'help-edit-break1-end-h', 'help-edit-break1-end-m'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// 休憩2をクリア
function clearHelpBreak2() {
    const fields = ['help-edit-break2-start-h', 'help-edit-break2-start-m', 'help-edit-break2-end-h', 'help-edit-break2-end-m'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// 休憩3をクリア
function clearHelpBreak3() {
    const fields = ['help-edit-break3-start-h', 'help-edit-break3-start-m', 'help-edit-break3-end-h', 'help-edit-break3-end-m'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// ヘルプ勤怠編集を保存
async function saveHelpAttendanceEdit() {
    const select = document.getElementById('help-edit-employee-select');
    const dateInput = document.getElementById('help-edit-target-date');
    const storeSelect = document.getElementById('help-edit-store-select');
    
    if (!select || !dateInput) return;
    
    const employeeId = select.value;
    const employeeName = select.options[select.selectedIndex]?.text || '';
    const date = dateInput.value;
    const helpStore = storeSelect ? storeSelect.value : null;
    
    // バリデーション
    if (!employeeId || !date) {
        showMessage('名前と日付を選択してください', 'error');
        return;
    }
    
    const clockIn = getHelpTimeFromFields('help-edit-clock-in-h', 'help-edit-clock-in-m');
    const clockOut = getHelpTimeFromFields('help-edit-clock-out-h', 'help-edit-clock-out-m');
    
    if (!clockIn) {
        showMessage('出勤時刻を入力してください', 'error');
        return;
    }
    
    // 休憩データを収集
    const breaks = [];
    const break1Start = getHelpTimeFromFields('help-edit-break1-start-h', 'help-edit-break1-start-m');
    const break1End = getHelpTimeFromFields('help-edit-break1-end-h', 'help-edit-break1-end-m');
    if (break1Start || break1End) {
        breaks.push({ start: break1Start, end: break1End });
    }
    
    const break2Start = getHelpTimeFromFields('help-edit-break2-start-h', 'help-edit-break2-start-m');
    const break2End = getHelpTimeFromFields('help-edit-break2-end-h', 'help-edit-break2-end-m');
    if (break2Start || break2End) {
        breaks.push({ start: break2Start, end: break2End });
    }
    
    const break3Start = getHelpTimeFromFields('help-edit-break3-start-h', 'help-edit-break3-start-m');
    const break3End = getHelpTimeFromFields('help-edit-break3-end-h', 'help-edit-break3-end-m');
    if (break3Start || break3End) {
        breaks.push({ start: break3Start, end: break3End });
    }
    
    try {
        // APIに保存リクエスト
        const response = await apiSaveHelpAttendanceEdit({
            attendance_id: currentHelpAttendanceId,
            employee_id: employeeId,
            work_date: date,
            clock_in: clockIn,
            clock_out: clockOut,
            help_store: helpStore,
            breaks: breaks
        });
        
        if (response.success) {
            showMessage(`${employeeName}のヘルプ勤怠を保存しました`, 'success');
            
            // 少し待ってからヘルプ確認画面に戻る
            setTimeout(() => {
                backToHelpCheck();
            }, 1000);
        } else {
            showMessage(response.message || '保存に失敗しました', 'error');
        }
        
    } catch (error) {
        console.error('ヘルプ勤怠保存エラー:', error);
        showMessage('保存中にエラーが発生しました', 'error');
    }
}

// ヘルプ勤怠データを削除
async function deleteHelpAttendance() {
    const employeeSelect = document.getElementById('help-edit-employee-select');
    const dateInput = document.getElementById('help-edit-target-date');
    
    if (!employeeSelect || !employeeSelect.value || !dateInput || !dateInput.value) {
        showMessage('従業員と日付を選択してください', 'error');
        return;
    }
    
    const employeeId = employeeSelect.value;
    const employeeName = employeeSelect.options[employeeSelect.selectedIndex].text;
    const workDate = dateInput.value;
    
    // 確認ダイアログ
    if (!confirm(`${employeeName}の${workDate}のヘルプ勤怠データを削除しますか？\nこの操作は取り消せません。`)) {
        return;
    }
    
    try {
        const response = await apiDeleteHelpAttendance(employeeId, workDate);
        
        if (response.success) {
            showMessage(`${employeeName}のヘルプ勤怠を削除しました`, 'success');
            
            // フォームをクリア
            clearAllHelpFields();
            
            // 少し待ってからヘルプ確認画面に戻る
            setTimeout(() => {
                backToHelpCheck();
            }, 1000);
        } else {
            showMessage(response.message || '削除に失敗しました', 'error');
        }
        
    } catch (error) {
        console.error('ヘルプ勤怠削除エラー:', error);
        showMessage('削除中にエラーが発生しました', 'error');
    }
}

// ヘルプ確認画面に戻る
function backToHelpCheck() {
    showScreen('help-check-screen');
    
    // ヘルプ確認画面を更新
    setTimeout(() => {
        if (typeof initHelpCheck === 'function') {
            initHelpCheck();
        }
    }, 100);
}

// ヘルプ勤怠編集画面へ遷移
function gotoHelpEdit() {
    console.log('ヘルプ勤怠編集画面へ遷移');
    showScreen('help-edit-screen');
}

// 画面表示時の初期化
document.addEventListener('DOMContentLoaded', function() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.id === 'help-edit-screen' && mutation.target.classList.contains('active')) {
                console.log('ヘルプ勤怠編集画面がアクティブになりました');
                initHelpEdit();
            }
        });
    });
    
    const editScreen = document.getElementById('help-edit-screen');
    if (editScreen) {
        observer.observe(editScreen, { attributes: true, attributeFilter: ['class'] });
        
        if (editScreen.classList.contains('active')) {
            initHelpEdit();
        }
    }
});
