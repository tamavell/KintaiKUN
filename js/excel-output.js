// excel-output.js - Excel出力機能（完全版）

// Excel出力画面の初期化
function initExcelOutput() {
    console.log('Excel出力画面の初期化');
    
    // 現在の日付を設定
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const dateInput = document.getElementById('excel-date-select');
    if (dateInput) {
        dateInput.value = dateStr;
    }
    
    // 出力単位の切り替えイベント
    setupUnitToggle();
    
    // admin以外は店舗選択を非表示にする
    const storeSelectionRow = document.getElementById('excel-store-selection-row');
    const isAdmin = AppState.currentUser && AppState.currentUser.isAdmin === true;
    
    if (storeSelectionRow) {
        if (isAdmin) {
            // adminの場合は表示
            storeSelectionRow.style.display = '';
            setupStoreSelection();
        } else {
            // admin以外は非表示
            storeSelectionRow.style.display = 'none';
        }
    }
}

// 出力単位の切り替え
function setupUnitToggle() {
    const unitRadios = document.querySelectorAll('input[name="excel-unit"]');
    const dateInput = document.getElementById('excel-date-select');
    
    unitRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (dateInput) {
                if (this.value === 'monthly') {
                    // 月単位の場合、type="month"に変更
                    dateInput.type = 'month';
                    const today = new Date();
                    const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                    dateInput.value = yearMonth;
                } else {
                    // 日単位の場合、type="date"に変更
                    dateInput.type = 'date';
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
            }
        });
    });
}

// 店舗選択のラジオボタン設定
function setupStoreSelection() {
    const storeRadios = document.querySelectorAll('input[name="excel-store"]');
    const storeSelect = document.getElementById('excel-store-select');
    
    storeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (storeSelect) {
                if (this.value === 'select') {
                    storeSelect.disabled = false;
                } else {
                    storeSelect.disabled = true;
                    storeSelect.value = '';
                }
            }
        });
    });
    
    // 初期状態を設定
    const selectedRadio = document.querySelector('input[name="excel-store"]:checked');
    if (selectedRadio && selectedRadio.value === 'none' && storeSelect) {
        storeSelect.disabled = true;
    }
}

// Excel出力の実行
async function executeExcelOutput() {
    try {
        // 入力値の取得
        const unit = document.querySelector('input[name="excel-unit"]:checked')?.value;
        const dateValue = document.getElementById('excel-date-select')?.value;
        
        // admin判定
        const isAdmin = AppState.currentUser && AppState.currentUser.isAdmin === true;
        
        let storeOption, storeId;
        if (isAdmin) {
            // adminの場合は選択した店舗設定を使用
            storeOption = document.querySelector('input[name="excel-store"]:checked')?.value;
            storeId = storeOption === 'select' ? document.getElementById('excel-store-select')?.value : null;
        } else {
            // admin以外は現在の店舗のみ
            storeOption = 'current';
            storeId = AppState.currentUser ? AppState.currentUser.storeId : null;
        }
        
        // バリデーション
        if (!unit) {
            alert('出力単位を選択してください');
            return;
        }
        
        if (!dateValue) {
            alert('日付を選択してください');
            return;
        }
        
        if (isAdmin && storeOption === 'select' && !storeId) {
            alert('店舗を選択してください');
            return;
        }
        
        // ファイル選択チェック
        if (!selectedExcelWorkbook) {
            alert('Excelファイルを選択してください');
            return;
        }
        
        // ローディング表示
        showLoading('Excel出力中...');
        
        // 日付の解析
        let year, month, day;
        if (unit === 'monthly') {
            [year, month] = dateValue.split('-').map(Number);
        } else {
            [year, month, day] = dateValue.split('-').map(Number);
        }
        
        // データ取得と出力
        if (unit === 'monthly') {
            await exportMonthlyExcel(year, month, storeOption, storeId);
        } else {
            await exportDailyExcel(year, month, day, storeOption, storeId);
        }
        
        hideLoading();
        alert('Excel出力が完了しました');
        
    } catch (error) {
        hideLoading();
        console.error('Excel出力エラー:', error);
        alert('Excel出力に失敗しました: ' + error.message);
    }
}

// 月単位Excel出力
async function exportMonthlyExcel(year, month, storeOption, storeId) {
    try {
        // 月次データを取得
        const records = await fetchMonthlyRecords(year, month);
        
        if (records.length === 0) {
            throw new Error('該当するデータがありません');
        }
        
        // 店舗フィルタリング
        let filteredRecords = records;
        if (storeOption === 'select' && storeId) {
            filteredRecords = records.filter(r => r.help_store === storeId || (!r.help_store && r.work_type === 'regular'));
        } else if (storeOption === 'current' && storeId) {
            // admin以外の場合：現在の店舗のデータのみ
            filteredRecords = records.filter(r => r.help_store === storeId || (!r.help_store && r.work_type === 'regular'));
        }
        
        // データを集計（admin以外は店舗指定なしと同じ処理）
        const isCombined = storeOption === 'none' || storeOption === 'current';
        const summaryData = isCombined 
            ? calculateMonthlySummaryCombined(filteredRecords)
            : calculateMonthlySummaryByStore(filteredRecords);
        
        // シート名を生成（重複を避ける）
        const baseSheetName = `${year}年${month}月`;
        const sheetName = getUniqueSheetName(selectedExcelWorkbook, baseSheetName);
        
        // シートを作成して既存ワークブックに追加
        const worksheet = createMonthlyWorksheet(summaryData, year, month, isCombined);
        XLSX.utils.book_append_sheet(selectedExcelWorkbook, worksheet, sheetName);
        
        // ファイルをダウンロード（元のファイル名を使用）
        const fileName = selectedExcelFile ? selectedExcelFile.name : `給与計算_${year}年${month}月.xlsx`;
        downloadWorkbook(selectedExcelWorkbook, fileName);
        
    } catch (error) {
        throw new Error(`月次Excel出力エラー: ${error.message}`);
    }
}

// 日単位Excel出力
async function exportDailyExcel(year, month, day, storeOption, storeId) {
    try {
        // 日次データを取得
        const targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const records = await fetchDailyRecords(targetDate);
        
        if (records.length === 0) {
            throw new Error('該当するデータがありません');
        }
        
        // 店舗フィルタリング
        let filteredRecords = records;
        if (storeOption === 'select' && storeId) {
            filteredRecords = records.filter(r => r.help_store === storeId || (!r.help_store && r.work_type === 'regular'));
        } else if (storeOption === 'current' && storeId) {
            // admin以外の場合：現在の店舗のデータのみ
            filteredRecords = records.filter(r => r.help_store === storeId || (!r.help_store && r.work_type === 'regular'));
        }
        
        // データを集計（admin以外は店舗指定なしと同じ処理）
        const isCombined = storeOption === 'none' || storeOption === 'current';
        const summaryData = isCombined
            ? calculateDailySummaryCombined(filteredRecords)
            : calculateDailySummaryByStore(filteredRecords);
        
        // シート名を生成（重複を避ける）
        const baseSheetName = `${year}年${month}月${day}日`;
        const sheetName = getUniqueSheetName(selectedExcelWorkbook, baseSheetName);
        
        // シートを作成して既存ワークブックに追加
        const worksheet = createDailyWorksheet(summaryData, year, month, day, isCombined);
        XLSX.utils.book_append_sheet(selectedExcelWorkbook, worksheet, sheetName);
        
        // ファイルをダウンロード（元のファイル名を使用）
        const fileName = selectedExcelFile ? selectedExcelFile.name : `給与計算_${year}年${month}月${day}日.xlsx`;
        downloadWorkbook(selectedExcelWorkbook, fileName);
        
    } catch (error) {
        throw new Error(`日次Excel出力エラー: ${error.message}`);
    }
}

// 月次データ取得
async function fetchMonthlyRecords(year, month) {
    try {
        // 月の最初と最後の日を計算
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        // 現在ログイン中の店舗IDを取得
        const storeId = AppState.currentUser ? AppState.currentUser.storeId : null;
        let url = `api/attendance-list.php?start_date=${startDate}&end_date=${endDate}`;
        if (storeId) {
            url += `&store_id=${storeId}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('データ取得に失敗しました');
        const data = await response.json();
        
        // APIのキー名をexcel-output.jsが期待する形式に変換
        if (data.success && data.data) {
            return data.data.map(record => ({
                ...record,
                work_date: record.date,
                // 既に含まれている: clock_in, clock_out, breaks, hourly_wage, employee_name
            }));
        }
        return [];
    } catch (error) {
        console.error('月次データ取得エラー:', error);
        return [];
    }
}

// 日次データ取得
async function fetchDailyRecords(date) {
    try {
        // 現在ログイン中の店舗IDを取得
        const storeId = AppState.currentUser ? AppState.currentUser.storeId : null;
        let url = `api/attendance-list.php?start_date=${date}&end_date=${date}`;
        if (storeId) {
            url += `&store_id=${storeId}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('データ取得に失敗しました');
        const data = await response.json();
        
        // APIのキー名を変換
        if (data.success && data.data) {
            return data.data.map(record => ({
                ...record,
                work_date: record.date,
            }));
        }
        return [];
    } catch (error) {
        console.error('日次データ取得エラー:', error);
        return [];
    }
}

// 月次集計（まとめ）
function calculateMonthlySummaryCombined(records) {
    const summary = {};
    
    records.forEach(record => {
        const name = record.employee_name;
        if (!summary[name]) {
            summary[name] = {
                workDays: 0,
                regularHours: 0,
                overtimeHours: 0,
                nightHours: 0,
                hourlyWage: record.hourly_wage || 0
            };
        }
        
        // 勤務時間を計算
        const workTime = calculateWorkTime(record);
        summary[name].workDays += 1;
        summary[name].regularHours += workTime.regular;
        summary[name].overtimeHours += workTime.overtime;
        summary[name].nightHours += workTime.night;
    });
    
    return summary;
}

// 月次集計（店舗別）
function calculateMonthlySummaryByStore(records) {
    const summary = {};
    
    records.forEach(record => {
        const store = record.help_store || '本店';
        const name = record.employee_name;
        
        if (!summary[store]) {
            summary[store] = {};
        }
        
        if (!summary[store][name]) {
            summary[store][name] = {
                workDays: 0,
                regularHours: 0,
                overtimeHours: 0,
                nightHours: 0,
                hourlyWage: record.hourly_wage || 0
            };
        }
        
        const workTime = calculateWorkTime(record);
        summary[store][name].workDays += 1;
        summary[store][name].regularHours += workTime.regular;
        summary[store][name].overtimeHours += workTime.overtime;
        summary[store][name].nightHours += workTime.night;
    });
    
    return summary;
}

// 日次集計（まとめ）
function calculateDailySummaryCombined(records) {
    return calculateMonthlySummaryCombined(records);
}

// 日次集計（店舗別）
function calculateDailySummaryByStore(records) {
    return calculateMonthlySummaryByStore(records);
}

// 勤務時間計算
function calculateWorkTime(record) {
    if (!record.clock_in || !record.clock_out) {
        return { regular: 0, overtime: 0, night: 0, total: 0 };
    }
    
    const clockIn = parseTimeToMinutes(record.clock_in);
    let clockOut = parseTimeToMinutes(record.clock_out);
    
    // 日跨ぎ対応
    if (clockOut < clockIn) {
        clockOut += 24 * 60;
    }
    
    // 休憩時間を計算
    let breakMinutes = 0;
    if (record.breaks && record.breaks.length > 0) {
        record.breaks.forEach(b => {
            if (b.start && b.end) {
                let breakStart = parseTimeToMinutes(b.start);
                let breakEnd = parseTimeToMinutes(b.end);
                if (breakEnd < breakStart) {
                    breakEnd += 24 * 60;
                }
                breakMinutes += (breakEnd - breakStart);
            }
        });
    }
    
    // 実働時間（分）
    const totalMinutes = clockOut - clockIn - breakMinutes;
    const totalHours = totalMinutes / 60;
    
    // 17:00-22:00の通常時間
    const time17 = 17 * 60;
    const time22 = 22 * 60;
    let regularMinutes = 0;
    let nightMinutes = 0;
    
    // 簡易計算：17時前は0、17-22時は通常、22時以降は深夜
    if (clockOut > time17) {
        const workStart = Math.max(clockIn, time17);
        const workEnd = Math.min(clockOut, time22);
        if (workEnd > workStart) {
            regularMinutes = workEnd - workStart;
        }
    }
    
    if (clockOut > time22) {
        const nightStart = Math.max(clockIn, time22);
        nightMinutes = clockOut - nightStart;
    }
    
    // 休憩を比例配分で引く
    if (breakMinutes > 0 && totalMinutes > 0) {
        const breakRatio = breakMinutes / (clockOut - clockIn);
        regularMinutes = Math.max(0, regularMinutes * (1 - breakRatio));
        nightMinutes = Math.max(0, nightMinutes * (1 - breakRatio));
    }
    
    // 8時間超過分は残業
    const overtimeMinutes = Math.max(0, totalMinutes - 8 * 60);
    
    return {
        regular: regularMinutes / 60,
        overtime: overtimeMinutes / 60,
        night: nightMinutes / 60,
        total: totalHours
    };
}

// 時刻文字列を分に変換
function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// ユニークなシート名を生成（重複時は連番を付与）
function getUniqueSheetName(workbook, baseName) {
    // シート名は31文字まで
    let name = baseName.substring(0, 31);
    let counter = 1;
    
    while (workbook.SheetNames.includes(name)) {
        const suffix = `_${counter}`;
        name = baseName.substring(0, 31 - suffix.length) + suffix;
        counter++;
    }
    
    return name;
}

// 月次ワークシート作成（既存ワークブック用）
function createMonthlyWorksheet(summaryData, year, month, isCombined) {
    // ヘッダー行
    const headers = [
        '名前', '所属', '店名', '年・月度', '日数', '時給', 
        '所定労働時間', '小計', '時給×25％', '残業時間', '小計',
        '時給×125％', '深夜時間', '小計',
        '支給額', '交通費', '特別手当', '雇用保険', '市県民税', '源泉税', '差引支給額'
    ];
    
    const data = [headers];
    
    if (isCombined) {
        Object.entries(summaryData).forEach(([name, empData]) => {
            const row = createEmployeeRow(name, '本店', '本店', year, month, empData);
            data.push(row);
        });
    } else {
        Object.entries(summaryData).forEach(([store, employees]) => {
            Object.entries(employees).forEach(([name, empData]) => {
                const row = createEmployeeRow(name, '本店', store, year, month, empData);
                data.push(row);
            });
        });
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 列幅設定
    ws['!cols'] = [
        {wch: 15}, {wch: 12}, {wch: 12}, {wch: 10}, {wch: 8}, {wch: 8},
        {wch: 14}, {wch: 10}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 12},
        {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10},
        {wch: 10}, {wch: 10}, {wch: 10}, {wch: 12}
    ];
    
    return ws;
}

// 日次ワークシート作成（既存ワークブック用）
function createDailyWorksheet(summaryData, year, month, day, isCombined) {
    const headers = [
        '名前', '所属', '店名', '年・月・日', '日数', '時給',
        '所定労働時間', '小計', '時給×25％', '残業時間', '小計',
        '時給×125％', '深夜時間', '小計',
        '支給額', '交通費', '特別手当', '雇用保険', '市県民税', '源泉税', '差引支給額'
    ];
    
    const data = [headers];
    
    if (isCombined) {
        Object.entries(summaryData).forEach(([name, empData]) => {
            const row = createEmployeeRow(name, '本店', '本店', year, month, empData, day);
            data.push(row);
        });
    } else {
        Object.entries(summaryData).forEach(([store, employees]) => {
            Object.entries(employees).forEach(([name, empData]) => {
                const row = createEmployeeRow(name, '本店', store, year, month, empData, day);
                data.push(row);
            });
        });
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
        {wch: 15}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 8}, {wch: 8},
        {wch: 14}, {wch: 10}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 12},
        {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10},
        {wch: 10}, {wch: 10}, {wch: 10}, {wch: 12}
    ];
    
    return ws;
}

// 月次Excelワークブック作成
function createMonthlyWorkbook(summaryData, year, month, isCombined) {
    const wb = XLSX.utils.book_new();
    const sheetName = `${month}月給与計算`;
    
    // ヘッダー行
    const headers = [
        '名前', '所属', '店名', '年・月度', '日数', '時給', 
        '所定労働時間', '小計', '時給×25％', '残業時間', '小計',
        '時給×125％', '深夜時間', '小計',
        '支給額', '交通費', '特別手当', '雇用保険', '市県民税', '源泉税', '差引支給額'
    ];
    
    const data = [headers];
    
    if (isCombined) {
        // まとめ
        Object.entries(summaryData).forEach(([name, empData]) => {
            const row = createEmployeeRow(name, '本店', '本店', year, month, empData);
            data.push(row);
        });
    } else {
        // 店舗別
        Object.entries(summaryData).forEach(([store, employees]) => {
            Object.entries(employees).forEach(([name, empData]) => {
                const row = createEmployeeRow(name, '本店', store, year, month, empData);
                data.push(row);
            });
        });
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 列幅設定
    ws['!cols'] = [
        {wch: 15}, {wch: 12}, {wch: 12}, {wch: 10}, {wch: 8}, {wch: 8},
        {wch: 14}, {wch: 10}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 12},
        {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10},
        {wch: 10}, {wch: 10}, {wch: 10}, {wch: 12}
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return wb;
}

// 日次Excelワークブック作成
function createDailyWorkbook(summaryData, year, month, day, isCombined) {
    const wb = XLSX.utils.book_new();
    const sheetName = `${month}月${day}日給与計算`;
    
    const headers = [
        '名前', '所属', '店名', '年・月・日', '日数', '時給',
        '所定労働時間', '小計', '時給×25％', '残業時間', '小計',
        '時給×125％', '深夜時間', '小計',
        '支給額', '交通費', '特別手当', '雇用保険', '市県民税', '源泉税', '差引支給額'
    ];
    
    const data = [headers];
    
    if (isCombined) {
        Object.entries(summaryData).forEach(([name, empData]) => {
            const row = createEmployeeRow(name, '本店', '本店', year, month, empData, day);
            data.push(row);
        });
    } else {
        Object.entries(summaryData).forEach(([store, employees]) => {
            Object.entries(employees).forEach(([name, empData]) => {
                const row = createEmployeeRow(name, '本店', store, year, month, empData, day);
                data.push(row);
            });
        });
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
        {wch: 15}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 8}, {wch: 8},
        {wch: 14}, {wch: 10}, {wch: 12}, {wch: 10}, {wch: 10}, {wch: 12},
        {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10},
        {wch: 10}, {wch: 10}, {wch: 10}, {wch: 12}
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return wb;
}

// 従業員行データ作成
function createEmployeeRow(name, affiliation, store, year, month, empData, day = null) {
    const wage = empData.hourlyWage;
    const regularHours = empData.regularHours.toFixed(2);
    const overtimeHours = empData.overtimeHours.toFixed(2);
    const nightHours = empData.nightHours.toFixed(2);
    
    // 給与計算（端数は最後に1回だけ切り捨て）
    const regularPay = Math.floor(wage * empData.regularHours);
    const wage25 = wage * 0.25;
    const overtimePay = Math.floor(wage25 * empData.overtimeHours);
    const wage125 = wage * 1.25;
    const nightPay = Math.floor(wage125 * empData.nightHours);
    const totalPay = regularPay + overtimePay + nightPay;
    
    // 表示用（整数で表示）
    const wage25Display = Math.floor(wage25);
    const wage125Display = Math.floor(wage125);
    
    const dateStr = day ? `令和${year - 2018}.${month}.${day}` : `令和${year - 2018}.${month}`;
    
    return [
        name, affiliation, store, dateStr, empData.workDays, wage,
        regularHours, regularPay, wage25Display, overtimeHours, overtimePay,
        wage125Display, nightHours, nightPay,
        totalPay, 0, 0, 0, 0, 0, totalPay
    ];
}

// ワークブックをダウンロード
function downloadWorkbook(workbook, filename) {
    const wbout = XLSX.write(workbook, {bookType: 'xlsx', type: 'binary'});
    
    function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) {
            view[i] = s.charCodeAt(i) & 0xFF;
        }
        return buf;
    }
    
    const blob = new Blob([s2ab(wbout)], {type: 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ローディング表示
function showLoading(message) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'excel-loading';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        color: white;
        font-size: 20px;
    `;
    loadingDiv.textContent = message;
    document.body.appendChild(loadingDiv);
}

// ローディング非表示
function hideLoading() {
    const loadingDiv = document.getElementById('excel-loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// フォームのクリア
function clearExcelForm() {
    const dailyRadio = document.querySelector('input[name="excel-unit"][value="daily"]');
    if (dailyRadio) dailyRadio.checked = true;
    
    // admin判定
    const isAdmin = AppState.currentUser && AppState.currentUser.isAdmin === true;
    
    if (isAdmin) {
        const storeSelectRadio = document.querySelector('input[name="excel-store"][value="select"]');
        if (storeSelectRadio) storeSelectRadio.checked = true;
        
        const storeSelect = document.getElementById('excel-store-select');
        if (storeSelect) {
            storeSelect.value = '';
            storeSelect.disabled = false;
        }
    }
    
    const dateInput = document.getElementById('excel-date-select');
    if (dateInput) {
        dateInput.type = 'date';
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    const filePathInput = document.getElementById('excel-file-path');
    if (filePathInput) {
        filePathInput.value = '';
    }
    
    const fileInput = document.getElementById('excel-file-input');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // グローバル変数もクリア
    selectedExcelFile = null;
    selectedExcelWorkbook = null;
    
    alert('フォームをクリアしました');
}

// 選択されたExcelファイルとワークブックを保持
let selectedExcelFile = null;
let selectedExcelWorkbook = null;

// Excelファイル選択
function selectExcelFile() {
    const fileInput = document.getElementById('excel-file-input');
    if (fileInput) {
        fileInput.click();
    }
}

// ファイル選択時のイベントリスナーを設定
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('excel-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleExcelFileSelect);
    }
});

// ファイル選択時の処理
function handleExcelFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const filePathInput = document.getElementById('excel-file-path');
    if (filePathInput) {
        filePathInput.value = file.name;
    }
    
    selectedExcelFile = file;
    
    // ファイルを読み込んでワークブックとして保持
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            selectedExcelWorkbook = XLSX.read(data, { type: 'array' });
            showMessage('ファイルを読み込みました: ' + file.name);
        } catch (error) {
            console.error('Excelファイルの読み込みエラー:', error);
            showMessage('ファイルの読み込みに失敗しました');
            selectedExcelFile = null;
            selectedExcelWorkbook = null;
            if (filePathInput) {
                filePathInput.value = '';
            }
        }
    };
    reader.readAsArrayBuffer(file);
}
