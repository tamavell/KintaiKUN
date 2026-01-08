/**
 * ヘルプ確認機能（サーバー版）
 * ヘルプ勤怠（他店舗での勤務）を確認する
 */

/**
 * ヘルプ確認画面の初期化
 */
function initHelpCheck() {
    console.log('ヘルプ確認画面を初期化');
    
    // 日付入力フィールドに今日の日付を設定
    const dateInput = document.getElementById('help-date-select');
    if (dateInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    }
    
    // ヘルプ先フィルターの選択肢を設定
    const helpStoreFilter = document.getElementById('help-store-select');
    if (helpStoreFilter && typeof config !== 'undefined' && config.stores) {
        helpStoreFilter.innerHTML = '<option value="">全て</option>';
        config.stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            helpStoreFilter.appendChild(option);
        });
    }
    
    // 表示ボタンのイベントリスナー
    const showButton = document.querySelector('[data-action="show-help-attendance"]');
    if (showButton) {
        showButton.removeEventListener('click', showHelpAttendanceData);
        showButton.addEventListener('click', showHelpAttendanceData);
    }
    
    // 勤怠編集ボタンのイベントリスナー
    const editButton = document.querySelector('[data-action="goto-help-edit"]');
    if (editButton) {
        editButton.removeEventListener('click', gotoHelpEdit);
        editButton.addEventListener('click', gotoHelpEdit);
    }
    
    // ヘルプ先フィルターの変更イベント
    if (helpStoreFilter) {
        helpStoreFilter.removeEventListener('change', showHelpAttendanceData);
        helpStoreFilter.addEventListener('change', showHelpAttendanceData);
    }
    
    // 月単位/日単位の切り替え
    const displayTypeRadios = document.querySelectorAll('input[name="help-display-type"]');
    displayTypeRadios.forEach(radio => {
        radio.removeEventListener('change', handleHelpDisplayTypeChange);
        radio.addEventListener('change', handleHelpDisplayTypeChange);
    });
    
    // 管理者用店舗選択の変更イベント（ヘルプ確認画面内のもの）
    const helpCheckScreen = document.getElementById('help-check-screen');
    if (helpCheckScreen) {
        const adminStoreSelect = helpCheckScreen.querySelector('.admin-store-filter-common');
        if (adminStoreSelect) {
            adminStoreSelect.removeEventListener('change', showHelpAttendanceData);
            adminStoreSelect.addEventListener('change', showHelpAttendanceData);
        }
    }
    
    // 初期データを表示
    showHelpAttendanceData();
}

/**
 * 表示タイプの変更処理
 */
function handleHelpDisplayTypeChange(event) {
    const displayType = event.target.value;
    const dateInput = document.getElementById('help-date-select');
    
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
async function showHelpAttendanceData() {
    const tbody = document.getElementById('help-check-tbody');
    if (!tbody) return;
    
    // 表示タイプを取得（日単位 or 月単位）
    const displayTypeRadio = document.querySelector('input[name="help-display-type"]:checked');
    const displayType = displayTypeRadio ? displayTypeRadio.value : 'daily';
    
    // 選択された日付を取得
    const dateInput = document.getElementById('help-date-select');
    const selectedValue = dateInput ? dateInput.value : '';
    
    // 選択中の店舗プレフィックスを取得（勤怠確認と同じ）
    const prefix = typeof getSelectedStorePrefix === 'function' ? getSelectedStorePrefix() : null;
    
    // ヘルプ先フィルター（オプション）
    const helpStoreFilter = document.getElementById('help-store-select');
    const helpStoreId = helpStoreFilter ? helpStoreFilter.value : '';
    
    try {
        let startDate, endDate;
        
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
            
            startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            
            console.log(`ヘルプ勤怠（月単位）: ${startDate} 〜 ${endDate}, prefix: ${prefix}, ヘルプ先: ${helpStoreId || '全て'}`);
        } else {
            // 日単位: YYYY-MM-DD形式
            if (selectedValue && selectedValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                startDate = selectedValue;
                endDate = selectedValue;
            } else {
                const today = new Date();
                startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                endDate = startDate;
            }
            
            console.log(`ヘルプ勤怠（日単位）: ${startDate}, prefix: ${prefix}, ヘルプ先: ${helpStoreId || '全て'}`);
        }
        
        // APIからヘルプ勤怠データを取得（勤怠確認と同じくprefixを使用）
        const response = await apiGetHelpAttendance(startDate, endDate, null, helpStoreId || null, prefix);
        
        console.log('ヘルプ勤怠APIレスポンス:', response);
        
        // テーブルをクリア
        tbody.innerHTML = '';
        
        // APIエラーの場合
        if (!response.success) {
            tbody.innerHTML = `<tr><td colspan="11" style="padding: 40px; text-align: center; color: #f44;">APIエラー: ${response.message || '不明なエラー'}</td></tr>`;
            return;
        }
        
        if (!response.data || response.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="padding: 40px; text-align: center; color: #999;">ヘルプ勤怠データがありません</td></tr>';
            return;
        }
        
        const records = response.data;
        console.log(`ヘルプ勤怠データ: ${records.length}件`);
        
        // テーブルを描画
        records.forEach((record, index) => {
            const tr = document.createElement('tr');
            if (index === 0) {
                tr.classList.add('highlight-row');
            }
            
            // 休憩時間のフォーマット
            let breakStartStr = '---';
            let breakEndStr = '---';
            
            if (record.breaks && record.breaks.length > 0) {
                breakStartStr = record.breaks.map(b => b.start || '---').join('<br>');
                breakEndStr = record.breaks.map(b => b.end || '---').join('<br>');
            }
            
            tr.innerHTML = `
                <td>${formatHelpDate(record.date)}</td>
                <td>${record.employee_name || '---'}</td>
                <td>${record.clock_in || '---'}</td>
                <td>${record.clock_out || '---'}</td>
                <td>${breakStartStr}</td>
                <td>${breakEndStr}</td>
                <td>${record.work_hours || '---'}</td>
                <td>${record.overtime || '0:00'}</td>
                <td>${record.night_hours || '0:00'}</td>
                <td>${record.hourly_wage ? record.hourly_wage.toLocaleString() : '---'}</td>
                <td>${record.payment ? record.payment.toLocaleString() : '---'}</td>
            `;
            
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('ヘルプ勤怠データ取得エラー:', error);
        tbody.innerHTML = `<tr><td colspan="11" style="padding: 40px; text-align: center; color: #f44;">データの読み込みに失敗しました<br><small>${error.message || error}</small></td></tr>`;
    }
}

/**
 * 店舗IDから店舗名を取得
 */
function getStoreNameById(storeId) {
    if (!storeId || typeof config === 'undefined' || !config.stores) return null;
    const store = config.stores.find(s => s.id === storeId);
    return store ? store.name : null;
}

/**
 * 日付を表示用にフォーマット
 */
function formatHelpDate(dateStr) {
    if (!dateStr) return '---';
    
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const year = parts[0];
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        return `${year}/${month}/${day}`;
    }
    
    return dateStr;
}

// ページ読み込み時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('help-check-screen')) {
            // 画面が表示されたときに初期化
        }
    });
} else {
    // DOMContentLoadedが既に発火している場合
}
