// attendance-edit.js - 勤怠編集機能（サーバー版）

// 現在読み込まれている勤怠レコードのID
let currentAttendanceId = null;

// 勤怠編集画面の初期化
async function initAttendanceEdit() {
    console.log('勤怠編集画面を初期化');
    setupAttendanceEditListeners();
    await loadEmployeeSelectOptions();
    setDefaultEditDate();
    clearAllFields();
}

// 従業員選択肢をサーバーから読み込み
async function loadEmployeeSelectOptions() {
    const select = document.getElementById('edit-employee-select');
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

// デフォルトの日付を設定（今日）
function setDefaultEditDate() {
    const dateInput = document.getElementById('edit-target-date');
    if (!dateInput) return;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
}

// イベントリスナーの設定
function setupAttendanceEditListeners() {
    // 数字のみ入力を許可
    const timeInputs = document.querySelectorAll('.time-input-small');
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

// 記録読み込み（サーバーから勤怠データを取得）
async function loadAttendanceNew() {
    const select = document.getElementById('edit-employee-select');
    const dateInput = document.getElementById('edit-target-date');
    
    if (!select || !dateInput) return;
    
    const employeeId = select.value;
    const date = dateInput.value;
    
    if (!employeeId || !date) {
        showMessage('名前と日付を選択してください', 'error');
        return;
    }
    
    try {
        // APIから勤怠データを取得
        const response = await apiGetAttendanceList(date, date, employeeId);
        
        if (!response.success) {
            showMessage('データの取得に失敗しました', 'error');
            return;
        }
        
        const records = response.data || [];
        
        if (records.length === 0) {
            showMessage('該当する勤怠記録がありません', 'info');
            clearAllFields();
            currentAttendanceId = null;
            return;
        }
        
        // 最初のレコードを使用
        const record = records[0];
        currentAttendanceId = record.id;
        
        // フォームにデータをセット
        setTimeFields(record.clock_in, 'edit-clock-in-h', 'edit-clock-in-m');
        setTimeFields(record.clock_out, 'edit-clock-out-h', 'edit-clock-out-m');
        
        // 休憩データをセット
        clearBreak1();
        clearBreak2();
        clearBreak3();
        
        if (record.breaks && record.breaks.length > 0) {
            if (record.breaks[0]) {
                setTimeFields(record.breaks[0].start, 'edit-break1-start-h', 'edit-break1-start-m');
                setTimeFields(record.breaks[0].end, 'edit-break1-end-h', 'edit-break1-end-m');
            }
            if (record.breaks[1]) {
                setTimeFields(record.breaks[1].start, 'edit-break2-start-h', 'edit-break2-start-m');
                setTimeFields(record.breaks[1].end, 'edit-break2-end-h', 'edit-break2-end-m');
            }
            if (record.breaks[2]) {
                setTimeFields(record.breaks[2].start, 'edit-break3-start-h', 'edit-break3-start-m');
                setTimeFields(record.breaks[2].end, 'edit-break3-end-h', 'edit-break3-end-m');
            }
        }
        
        showMessage('記録を読み込みました', 'success');
        
    } catch (error) {
        console.error('勤怠データ取得エラー:', error);
        showMessage('データの読み込みに失敗しました', 'error');
    }
}

// 時刻文字列をフォームフィールドにセット
function setTimeFields(timeStr, hourFieldId, minFieldId) {
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
function getTimeFromFields(hourFieldId, minFieldId) {
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
function clearAllFields() {
    clearWorkTime();
    clearBreak1();
    clearBreak2();
    clearBreak3();
    currentAttendanceId = null;
}

// 勤務時間をクリア
function clearWorkTime() {
    const fields = ['edit-clock-in-h', 'edit-clock-in-m', 'edit-clock-out-h', 'edit-clock-out-m'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// 休憩1をクリア
function clearBreak1() {
    const fields = ['edit-break1-start-h', 'edit-break1-start-m', 'edit-break1-end-h', 'edit-break1-end-m'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// 休憩2をクリア
function clearBreak2() {
    const fields = ['edit-break2-start-h', 'edit-break2-start-m', 'edit-break2-end-h', 'edit-break2-end-m'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// 休憩3をクリア
function clearBreak3() {
    const fields = ['edit-break3-start-h', 'edit-break3-start-m', 'edit-break3-end-h', 'edit-break3-end-m'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// 勤怠編集を保存
async function saveAttendanceEdit() {
    const select = document.getElementById('edit-employee-select');
    const dateInput = document.getElementById('edit-target-date');
    
    if (!select || !dateInput) return;
    
    const employeeId = select.value;
    const employeeName = select.options[select.selectedIndex]?.text || '';
    const date = dateInput.value;
    
    // バリデーション
    if (!employeeId || !date) {
        showMessage('名前と日付を選択してください', 'error');
        return;
    }
    
    const clockIn = getTimeFromFields('edit-clock-in-h', 'edit-clock-in-m');
    const clockOut = getTimeFromFields('edit-clock-out-h', 'edit-clock-out-m');
    
    if (!clockIn) {
        showMessage('出勤時刻を入力してください', 'error');
        return;
    }
    
    // 休憩データを収集
    const breaks = [];
    const break1Start = getTimeFromFields('edit-break1-start-h', 'edit-break1-start-m');
    const break1End = getTimeFromFields('edit-break1-end-h', 'edit-break1-end-m');
    if (break1Start || break1End) {
        breaks.push({ start: break1Start, end: break1End });
    }
    
    const break2Start = getTimeFromFields('edit-break2-start-h', 'edit-break2-start-m');
    const break2End = getTimeFromFields('edit-break2-end-h', 'edit-break2-end-m');
    if (break2Start || break2End) {
        breaks.push({ start: break2Start, end: break2End });
    }
    
    const break3Start = getTimeFromFields('edit-break3-start-h', 'edit-break3-start-m');
    const break3End = getTimeFromFields('edit-break3-end-h', 'edit-break3-end-m');
    if (break3Start || break3End) {
        breaks.push({ start: break3Start, end: break3End });
    }
    
    try {
        // APIに保存リクエスト
        const response = await apiSaveAttendanceEdit({
            attendance_id: currentAttendanceId,
            employee_id: employeeId,
            work_date: date,
            clock_in: clockIn,
            clock_out: clockOut,
            breaks: breaks
        });
        
        if (response.success) {
            showMessage(`${employeeName}の勤怠を保存しました`, 'success');
            
            // 少し待ってから勤怠確認画面に戻る
            setTimeout(() => {
                backToAttendanceCheck();
            }, 1000);
        } else {
            showMessage(response.message || '保存に失敗しました', 'error');
        }
        
    } catch (error) {
        console.error('勤怠保存エラー:', error);
        showMessage('保存中にエラーが発生しました', 'error');
    }
}

// 勤怠データを削除
async function deleteAttendance() {
    const employeeSelect = document.getElementById('edit-employee-select');
    const dateInput = document.getElementById('edit-target-date');
    
    if (!employeeSelect || !employeeSelect.value || !dateInput || !dateInput.value) {
        showMessage('従業員と日付を選択してください', 'error');
        return;
    }
    
    const employeeId = employeeSelect.value;
    const employeeName = employeeSelect.options[employeeSelect.selectedIndex].text;
    const workDate = dateInput.value;
    
    // 確認ダイアログ
    if (!confirm(`${employeeName}の${workDate}の勤怠データを削除しますか？\nこの操作は取り消せません。`)) {
        return;
    }
    
    try {
        const response = await apiDeleteAttendance(employeeId, workDate);
        
        if (response.success) {
            showMessage(`${employeeName}の勤怠を削除しました`, 'success');
            
            // フォームをクリア
            clearAllFields();
            
            // 少し待ってから勤怠確認画面に戻る
            setTimeout(() => {
                backToAttendanceCheck();
            }, 1000);
        } else {
            showMessage(response.message || '削除に失敗しました', 'error');
        }
        
    } catch (error) {
        console.error('勤怠削除エラー:', error);
        showMessage('削除中にエラーが発生しました', 'error');
    }
}

// 全フィールドをクリア
function clearAllFields() {
    // 出勤・退勤
    document.getElementById('edit-clock-in-h').value = '';
    document.getElementById('edit-clock-in-m').value = '';
    document.getElementById('edit-clock-out-h').value = '';
    document.getElementById('edit-clock-out-m').value = '';
    
    // 休憩1
    document.getElementById('edit-break1-start-h').value = '';
    document.getElementById('edit-break1-start-m').value = '';
    document.getElementById('edit-break1-end-h').value = '';
    document.getElementById('edit-break1-end-m').value = '';
    
    // 休憩2
    document.getElementById('edit-break2-start-h').value = '';
    document.getElementById('edit-break2-start-m').value = '';
    document.getElementById('edit-break2-end-h').value = '';
    document.getElementById('edit-break2-end-m').value = '';
    
    // 休憩3
    document.getElementById('edit-break3-start-h').value = '';
    document.getElementById('edit-break3-start-m').value = '';
    document.getElementById('edit-break3-end-h').value = '';
    document.getElementById('edit-break3-end-m').value = '';
}

// 勤怠確認画面に戻る（管理者用）
function backToAttendanceCheck() {
    showScreen('admin-attendance-check-screen');
    
    // 管理者用勤怠確認画面を更新
    setTimeout(() => {
        if (typeof initAdminAttendanceCheck === 'function') {
            initAdminAttendanceCheck();
        }
    }, 100);
}

// 画面表示時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // 勤怠編集画面の初期化
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.id === 'attendance-edit-screen' && mutation.target.classList.contains('active')) {
                console.log('勤怠編集画面がアクティブになりました');
                initAttendanceEdit();
            }
        });
    });
    
    const editScreen = document.getElementById('attendance-edit-screen');
    if (editScreen) {
        observer.observe(editScreen, { attributes: true, attributeFilter: ['class'] });
        
        if (editScreen.classList.contains('active')) {
            initAttendanceEdit();
        }
    }
});
