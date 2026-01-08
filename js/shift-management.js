// shift-management.js - シフト管理機能

// シフト管理の状態
const ShiftState = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    employees: [],
    shifts: {},
    selectedCell: null,
    isAdmin: false,
    employeeOrder: [] // 従業員の並び順（employee_idの配列）
};

// 曜日の配列
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// シフト確認画面の初期化（従業員用）
function initShiftCheck() {
    console.log('シフト確認画面を初期化');
    ShiftState.isAdmin = false;
    
    // 現在の年月を設定
    const now = new Date();
    ShiftState.currentYear = now.getFullYear();
    ShiftState.currentMonth = now.getMonth() + 1;
    
    // 月表示を更新
    updateShiftMonthDisplay('shift-check');
    
    // シフトデータを読み込み
    loadShiftData('shift-check');
    
    // 月移動ボタンのイベント
    setupMonthNavigation('shift-check');
}

// シフト管理画面の初期化（管理者用）
function initShiftManagement() {
    console.log('シフト管理画面を初期化');
    ShiftState.isAdmin = true;
    
    // 現在の年月を設定
    const now = new Date();
    ShiftState.currentYear = now.getFullYear();
    ShiftState.currentMonth = now.getMonth() + 1;
    
    // 月表示を更新
    updateShiftMonthDisplay('shift-management');
    
    // シフトデータを読み込み
    loadShiftData('shift-management');
    
    // 月移動ボタンのイベント
    setupMonthNavigation('shift-management');
}

// 月表示を更新
function updateShiftMonthDisplay(screenType) {
    const monthDisplay = document.getElementById(`${screenType}-month-display`);
    if (monthDisplay) {
        monthDisplay.textContent = `${ShiftState.currentMonth}月`;
    }
}

// 月移動ボタンのセットアップ
function setupMonthNavigation(screenType) {
    const prevBtn = document.getElementById(`${screenType}-prev-month`);
    const nextBtn = document.getElementById(`${screenType}-next-month`);
    
    if (prevBtn) {
        prevBtn.onclick = () => {
            ShiftState.currentMonth--;
            if (ShiftState.currentMonth < 1) {
                ShiftState.currentMonth = 12;
                ShiftState.currentYear--;
            }
            updateShiftMonthDisplay(screenType);
            loadShiftData(screenType);
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => {
            ShiftState.currentMonth++;
            if (ShiftState.currentMonth > 12) {
                ShiftState.currentMonth = 1;
                ShiftState.currentYear++;
            }
            updateShiftMonthDisplay(screenType);
            loadShiftData(screenType);
        };
    }
}

// シフトデータを読み込み
async function loadShiftData(screenType) {
    try {
        // 選択中の店舗プレフィックスを取得
        const prefix = typeof getSelectedStorePrefix === 'function' ? getSelectedStorePrefix() : null;
        const storeId = AppState.currentUser ? AppState.currentUser.storeId : null;
        
        let url = `api/shift-management.php?year=${ShiftState.currentYear}&month=${ShiftState.currentMonth}`;
        
        // 管理者の場合はprefixを使用、通常店舗の場合はstore_idを使用
        if (prefix) {
            url += `&prefix=${prefix}`;
        } else if (storeId && !(AppState.currentUser && AppState.currentUser.isAdmin)) {
            url += `&store_id=${storeId}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            ShiftState.employees = result.data.employees;
            ShiftState.shifts = result.data.shifts;
            
            // データベースから並び順を読み込んで適用
            await applySavedEmployeeOrder();
            
            renderShiftTable(screenType);
        } else {
            console.error('シフトデータの取得に失敗:', result.error);
            showMessage('シフトデータの取得に失敗しました');
        }
    } catch (error) {
        console.error('シフトデータ取得エラー:', error);
        showMessage('シフトデータの取得に失敗しました');
    }
}

// シフトテーブルを描画
function renderShiftTable(screenType) {
    const tableBody = document.getElementById(`${screenType}-table-body`);
    const tableHeader = document.getElementById(`${screenType}-table-header`);
    
    if (!tableBody || !tableHeader) {
        console.error('テーブル要素が見つかりません');
        return;
    }
    
    // ヘッダーを生成（従業員名）
    let headerHtml = '<th class="shift-date-header">' + ShiftState.currentMonth + '月</th>';
    ShiftState.employees.forEach((emp, index) => {
        // 名前のスペースを削除
        const displayName = emp.name.replace(/\s+/g, '');
        // 管理者モードの場合、ヘッダーをドラッグ可能にする
        if (screenType === 'shift-management') {
            headerHtml += `<th class="shift-employee-header draggable-header" 
                               draggable="true" 
                               data-employee-id="${emp.employee_id}"
                               data-index="${index}"
                               title="${emp.name}（ドラッグして並び替え）">${displayName}</th>`;
        } else {
            headerHtml += `<th class="shift-employee-header" title="${emp.name}">${displayName}</th>`;
        }
    });
    tableHeader.innerHTML = headerHtml;
    
    // 管理者モードの場合、ヘッダーのドラッグ&ドロップを設定
    if (screenType === 'shift-management') {
        setupHeaderDragAndDrop();
    }
    
    // 月の日数を取得
    const daysInMonth = new Date(ShiftState.currentYear, ShiftState.currentMonth, 0).getDate();
    
    // 各日のシフトを描画
    let bodyHtml = '';
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDateString(ShiftState.currentYear, ShiftState.currentMonth, day);
        const date = new Date(ShiftState.currentYear, ShiftState.currentMonth - 1, day);
        const weekday = WEEKDAYS[date.getDay()];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isSunday = date.getDay() === 0;
        const isSaturday = date.getDay() === 6;
        
        let rowClass = '';
        if (isSunday) rowClass = 'shift-row-sunday';
        else if (isSaturday) rowClass = 'shift-row-saturday';
        
        bodyHtml += `<tr class="${rowClass}">`;
        bodyHtml += `<td class="shift-date-cell">
            <span class="shift-day">${day}</span>
            <span class="shift-weekday ${isSunday ? 'sunday' : ''} ${isSaturday ? 'saturday' : ''}">(${weekday})</span>
        </td>`;
        
        // 各従業員のシフト
        ShiftState.employees.forEach(emp => {
            const shiftData = ShiftState.shifts[dateStr] && ShiftState.shifts[dateStr][emp.employee_id];
            const cellContent = renderShiftCell(shiftData, emp.employee_id, dateStr, screenType);
            bodyHtml += cellContent;
        });
        
        bodyHtml += '</tr>';
    }
    
    tableBody.innerHTML = bodyHtml;
    
    // 管理者モードの場合、セルクリックイベントを設定
    if (screenType === 'shift-management') {
        setupCellClickEvents();
    }
}

// シフトセルを描画
function renderShiftCell(shiftData, employeeId, dateStr, screenType) {
    let cellClass = 'shift-cell';
    let content = '';
    
    if (shiftData) {
        if (shiftData.is_working) {
            cellClass += ' shift-working';
            content += '<span class="shift-circle">○</span>';
            
            if (shiftData.start_time && shiftData.end_time) {
                const startTime = formatTimeDisplay(shiftData.start_time);
                const endTime = formatTimeDisplay(shiftData.end_time);
                content += `<span class="shift-time">${startTime}<br>${endTime}</span>`;
            }
        }
        
        if (shiftData.note) {
            content += `<span class="shift-note">${escapeHtml(shiftData.note)}</span>`;
        }
    }
    
    if (screenType === 'shift-management') {
        return `<td class="${cellClass}" data-employee="${employeeId}" data-date="${dateStr}">${content}</td>`;
    } else {
        return `<td class="${cellClass}">${content}</td>`;
    }
}

// セルクリックイベントのセットアップ（管理者用）
function setupCellClickEvents() {
    const cells = document.querySelectorAll('#shift-management-table-body .shift-cell');
    cells.forEach(cell => {
        cell.addEventListener('click', function() {
            const employeeId = this.dataset.employee;
            const dateStr = this.dataset.date;
            openShiftEditModal(employeeId, dateStr);
        });
    });
}

// シフト編集モーダルを開く
function openShiftEditModal(employeeId, dateStr) {
    const modal = document.getElementById('shift-edit-modal');
    if (!modal) return;
    
    // 従業員名を取得
    const employee = ShiftState.employees.find(e => e.employee_id === employeeId);
    const employeeName = employee ? employee.name : employeeId;
    
    // 日付を表示用にフォーマット
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    const weekday = WEEKDAYS[date.getDay()];
    const displayDate = `${parseInt(month)}月${parseInt(day)}日(${weekday})`;
    
    // モーダルの情報を設定
    document.getElementById('shift-edit-employee-name').textContent = employeeName;
    document.getElementById('shift-edit-date-display').textContent = displayDate;
    document.getElementById('shift-edit-employee-id').value = employeeId;
    document.getElementById('shift-edit-date').value = dateStr;
    
    // 既存データがあれば読み込み
    const shiftData = ShiftState.shifts[dateStr] && ShiftState.shifts[dateStr][employeeId];
    if (shiftData) {
        document.getElementById('shift-edit-is-working').checked = shiftData.is_working;
        document.getElementById('shift-edit-start-time').value = shiftData.start_time || '';
        document.getElementById('shift-edit-end-time').value = shiftData.end_time || '';
        document.getElementById('shift-edit-note').value = shiftData.note || '';
    } else {
        document.getElementById('shift-edit-is-working').checked = false;
        document.getElementById('shift-edit-start-time').value = '';
        document.getElementById('shift-edit-end-time').value = '';
        document.getElementById('shift-edit-note').value = '';
    }
    
    // 勤務チェックボックスの状態に応じて時間入力を制御
    toggleTimeInputs();
    
    modal.classList.add('active');
}

// モーダルを閉じる
function closeShiftEditModal() {
    const modal = document.getElementById('shift-edit-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// 勤務チェックボックスの変更時に時間入力を制御
function toggleTimeInputs() {
    const isWorking = document.getElementById('shift-edit-is-working').checked;
    const startTime = document.getElementById('shift-edit-start-time');
    const endTime = document.getElementById('shift-edit-end-time');
    
    if (startTime && endTime) {
        startTime.disabled = !isWorking;
        endTime.disabled = !isWorking;
        
        if (!isWorking) {
            startTime.value = '';
            endTime.value = '';
        }
    }
}

// シフトを保存
async function saveShift() {
    const employeeId = document.getElementById('shift-edit-employee-id').value;
    const dateStr = document.getElementById('shift-edit-date').value;
    const isWorking = document.getElementById('shift-edit-is-working').checked;
    const startTime = document.getElementById('shift-edit-start-time').value;
    const endTime = document.getElementById('shift-edit-end-time').value;
    const note = document.getElementById('shift-edit-note').value;
    
    const shiftData = {
        employee_id: employeeId,
        shift_date: dateStr,
        is_working: isWorking ? 1 : 0,
        start_time: isWorking && startTime ? startTime : null,
        end_time: isWorking && endTime ? endTime : null,
        note: note || null
    };
    
    try {
        const response = await fetch('api/shift-management.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(shiftData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('シフトを保存しました');
            closeShiftEditModal();
            loadShiftData('shift-management');
        } else {
            showMessage('シフトの保存に失敗しました: ' + result.error);
        }
    } catch (error) {
        console.error('シフト保存エラー:', error);
        showMessage('シフトの保存に失敗しました');
    }
}

// シフトを削除
async function deleteShift() {
    const employeeId = document.getElementById('shift-edit-employee-id').value;
    const dateStr = document.getElementById('shift-edit-date').value;
    
    if (!confirm('このシフトを削除しますか？')) {
        return;
    }
    
    try {
        const response = await fetch('api/shift-management.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                employee_id: employeeId,
                shift_date: dateStr
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('シフトを削除しました');
            closeShiftEditModal();
            loadShiftData('shift-management');
        } else {
            showMessage('シフトの削除に失敗しました: ' + result.error);
        }
    } catch (error) {
        console.error('シフト削除エラー:', error);
        showMessage('シフトの削除に失敗しました');
    }
}

// 日付文字列をフォーマット（YYYY-MM-DD）
function formatDateString(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 時間表示をフォーマット（HH:MM → H:MM）
function formatTimeDisplay(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    return `${parseInt(hours)}:${minutes}`;
}

// HTMLエスケープ
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ===========================
// 並び順管理機能
// ===========================

// ヘッダーのドラッグ&ドロップ設定
let draggedHeaderIndex = null;

function setupHeaderDragAndDrop() {
    const headers = document.querySelectorAll('.draggable-header');
    
    headers.forEach(header => {
        header.addEventListener('dragstart', function(e) {
            draggedHeaderIndex = parseInt(this.dataset.index);
            this.style.opacity = '0.5';
            this.classList.add('dragging-header');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        header.addEventListener('dragend', function(e) {
            this.style.opacity = '1';
            this.classList.remove('dragging-header');
            
            // すべてのヘッダーから drag-over クラスを削除
            headers.forEach(h => h.classList.remove('drag-over-header'));
            
            draggedHeaderIndex = null;
        });
        
        header.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (draggedHeaderIndex !== null && draggedHeaderIndex !== parseInt(this.dataset.index)) {
                this.classList.add('drag-over-header');
            }
            
            return false;
        });
        
        header.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over-header');
        });
        
        header.addEventListener('drop', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            this.classList.remove('drag-over-header');
            
            const targetIndex = parseInt(this.dataset.index);
            
            if (draggedHeaderIndex !== null && draggedHeaderIndex !== targetIndex) {
                // 従業員の配列を入れ替え
                const draggedEmployee = ShiftState.employees[draggedHeaderIndex];
                ShiftState.employees.splice(draggedHeaderIndex, 1);
                ShiftState.employees.splice(targetIndex, 0, draggedEmployee);
                
                // データベースに保存
                saveEmployeeOrderToStorage();
                
                // テーブルを再描画
                renderShiftTable('shift-management');
                
                showMessage('並び順を変更しました');
            }
            
            return false;
        });
    });
}

// データベースに並び順を保存（ヘッダードラッグ用）
async function saveEmployeeOrderToStorage() {
    const prefix = typeof getSelectedStorePrefix === 'function' ? getSelectedStorePrefix() : null;
    const storeId = AppState.currentUser ? AppState.currentUser.storeId : null;
    const storeKey = prefix || storeId || 'default';
    
    const orderArray = ShiftState.employees.map(emp => emp.employee_id);
    
    try {
        const response = await fetch('api/employee-order.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                store_key: storeKey,
                order: orderArray
            })
        });
        
        const result = await response.json();
        if (!result.success) {
            console.error('並び順の保存に失敗:', result.error);
        }
    } catch (error) {
        console.error('並び順保存エラー:', error);
    }
}

// ===========================
// モーダルでの並び順管理機能
// ===========================

// データベースから並び順を読み込んで適用
async function applySavedEmployeeOrder() {
    const prefix = typeof getSelectedStorePrefix === 'function' ? getSelectedStorePrefix() : null;
    const storeId = AppState.currentUser ? AppState.currentUser.storeId : null;
    const storeKey = prefix || storeId || 'default';
    
    try {
        const response = await fetch(`api/employee-order.php?store_key=${encodeURIComponent(storeKey)}`);
        const result = await response.json();
        
        if (result.success && result.data.order && result.data.order.length > 0) {
            const orderArray = result.data.order;
            
            // 保存された並び順に従って従業員を並び替え
            const orderedEmployees = [];
            const remainingEmployees = [...ShiftState.employees];
            
            orderArray.forEach(employeeId => {
                const index = remainingEmployees.findIndex(emp => emp.employee_id === employeeId);
                if (index !== -1) {
                    orderedEmployees.push(remainingEmployees[index]);
                    remainingEmployees.splice(index, 1);
                }
            });
            
            // 保存されていない新しい従業員は最後に追加
            ShiftState.employees = [...orderedEmployees, ...remainingEmployees];
        }
    } catch (error) {
        console.error('並び順の読み込みエラー:', error);
    }
}

// 並び順変更モーダルを開く
function openEmployeeOrderModal() {
    const modal = document.getElementById('employee-order-modal');
    if (!modal) return;
    
    renderEmployeeOrderList();
    modal.classList.add('active');
}

// 並び順変更モーダルを閉じる
function closeEmployeeOrderModal() {
    const modal = document.getElementById('employee-order-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// 従業員並び順リストを描画
function renderEmployeeOrderList() {
    const listContainer = document.getElementById('employee-order-list');
    
    if (!listContainer || ShiftState.employees.length === 0) {
        return;
    }
    
    // 画面幅に応じてカラム数を決定
    let columns = 3;
    if (window.innerWidth <= 768) {
        columns = 1; // スマホ
    } else if (window.innerWidth <= 1200) {
        columns = 2; // タブレット
    }
    
    let html = '';
    ShiftState.employees.forEach((emp, index) => {
        html += `
            <div class="employee-order-item" 
                 draggable="true" 
                 data-index="${index}"
                 data-employee-id="${emp.employee_id}">
                <div class="employee-order-drag-handle">≡</div>
                <div class="employee-order-info">
                    <span class="employee-order-number">${index + 1}.</span>
                    <span class="employee-order-id">${emp.employee_id}</span>
                    <span class="employee-order-name">${emp.name}</span>
                </div>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
    
    // グリッドレイアウトの設定
    listContainer.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    
    setupEmployeeOrderDragAndDrop();
}

// ドラッグ&ドロップのセットアップ
let draggedEmployeeElement = null;
let draggedEmployeeIndex = null;

function setupEmployeeOrderDragAndDrop() {
    const items = document.querySelectorAll('.employee-order-item');
    
    items.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedEmployeeElement = this;
            draggedEmployeeIndex = parseInt(this.dataset.index);
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', function(e) {
            this.classList.remove('dragging');
            items.forEach(i => i.classList.remove('drag-over'));
            draggedEmployeeElement = null;
            draggedEmployeeIndex = null;
        });
        
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (draggedEmployeeElement && draggedEmployeeElement !== this) {
                this.classList.add('drag-over');
            }
            return false;
        });
        
        item.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });
        
        item.addEventListener('drop', function(e) {
            e.stopPropagation();
            this.classList.remove('drag-over');
            
            const targetIndex = parseInt(this.dataset.index);
            
            if (draggedEmployeeElement && draggedEmployeeIndex !== targetIndex) {
                // 配列の要素を入れ替え
                const draggedEmployee = ShiftState.employees[draggedEmployeeIndex];
                ShiftState.employees.splice(draggedEmployeeIndex, 1);
                ShiftState.employees.splice(targetIndex, 0, draggedEmployee);
                
                // 再描画
                renderEmployeeOrderList();
            }
            
            return false;
        });
    });
}

// 並び順を保存
async function saveEmployeeOrder() {
    await saveEmployeeOrderToStorage();
    
    showMessage('並び順を保存しました');
    closeEmployeeOrderModal();
    
    // シフトテーブルを再描画
    const screenType = ShiftState.isAdmin ? 'shift-management' : 'shift-check';
    renderShiftTable(screenType);
}

// 並び順をリセット（ID順に戻す）
function resetEmployeeOrder() {
    if (!confirm('並び順を従業員ID順にリセットしますか？')) {
        return;
    }
    
    ShiftState.employees.sort((a, b) => {
        return a.employee_id.localeCompare(b.employee_id);
    });
    
    renderEmployeeOrderList();
    showMessage('並び順をリセットしました（保存ボタンを押してください）');
}

// グローバルに公開
window.initShiftCheck = initShiftCheck;
window.initShiftManagement = initShiftManagement;
window.closeShiftEditModal = closeShiftEditModal;
window.toggleTimeInputs = toggleTimeInputs;
window.saveShift = saveShift;
window.deleteShift = deleteShift;
window.openEmployeeOrderModal = openEmployeeOrderModal;
window.closeEmployeeOrderModal = closeEmployeeOrderModal;
window.saveEmployeeOrder = saveEmployeeOrder;
window.resetEmployeeOrder = resetEmployeeOrder;
