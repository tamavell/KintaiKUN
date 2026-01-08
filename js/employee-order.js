// js/employee-order.js - 従業員並び順設定機能

// 並び順設定の状態
const EmployeeOrderState = {
    employees: [],
    draggedElement: null,
    draggedIndex: null
};

// 並び順設定画面の初期化
function initEmployeeOrderManagement() {
    console.log('従業員並び順設定画面を初期化');
    loadEmployeeOrderData();
}

// 従業員データを読み込み
async function loadEmployeeOrderData() {
    try {
        // 選択中の店舗プレフィックスを取得
        const prefix = typeof getSelectedStorePrefix === 'function' ? getSelectedStorePrefix() : null;
        const storeId = AppState.currentUser ? AppState.currentUser.storeId : null;
        
        let url = 'api/employee-order.php';
        
        // 管理者の場合はprefixを使用、通常店舗の場合はstore_idを使用
        const params = [];
        if (prefix) {
            params.push(`prefix=${prefix}`);
        } else if (storeId && !(AppState.currentUser && AppState.currentUser.isAdmin)) {
            params.push(`store_id=${storeId}`);
        }
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            EmployeeOrderState.employees = result.data;
            renderEmployeeOrderList();
        } else {
            console.error('従業員データの取得に失敗:', result.error);
            showMessage('従業員データの取得に失敗しました');
        }
    } catch (error) {
        console.error('従業員データ取得エラー:', error);
        showMessage('従業員データの取得に失敗しました');
    }
}

// 従業員リストを描画
function renderEmployeeOrderList() {
    const listContainer = document.getElementById('employee-order-list');
    
    if (!listContainer) {
        console.error('従業員リスト要素が見つかりません');
        return;
    }
    
    if (EmployeeOrderState.employees.length === 0) {
        listContainer.innerHTML = '<div class="employee-order-empty">従業員が登録されていません</div>';
        return;
    }
    
    let html = '';
    EmployeeOrderState.employees.forEach((emp, index) => {
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
    
    // ドラッグイベントを設定
    setupDragAndDrop();
}

// ドラッグ&ドロップイベントのセットアップ
function setupDragAndDrop() {
    const items = document.querySelectorAll('.employee-order-item');
    
    items.forEach(item => {
        // ドラッグ開始
        item.addEventListener('dragstart', function(e) {
            EmployeeOrderState.draggedElement = this;
            EmployeeOrderState.draggedIndex = parseInt(this.dataset.index);
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.innerHTML);
        });
        
        // ドラッグ終了
        item.addEventListener('dragend', function(e) {
            this.classList.remove('dragging');
            EmployeeOrderState.draggedElement = null;
            EmployeeOrderState.draggedIndex = null;
            
            // すべてのover状態をクリア
            items.forEach(i => i.classList.remove('drag-over'));
        });
        
        // ドラッグオーバー
        item.addEventListener('dragover', function(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';
            
            const draggedElement = EmployeeOrderState.draggedElement;
            if (draggedElement && draggedElement !== this) {
                this.classList.add('drag-over');
            }
            
            return false;
        });
        
        // ドラッグ離脱
        item.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });
        
        // ドロップ
        item.addEventListener('drop', function(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            
            this.classList.remove('drag-over');
            
            const draggedElement = EmployeeOrderState.draggedElement;
            const draggedIndex = EmployeeOrderState.draggedIndex;
            const targetIndex = parseInt(this.dataset.index);
            
            if (draggedElement && draggedIndex !== targetIndex) {
                // 配列の要素を入れ替え
                const draggedEmployee = EmployeeOrderState.employees[draggedIndex];
                EmployeeOrderState.employees.splice(draggedIndex, 1);
                EmployeeOrderState.employees.splice(targetIndex, 0, draggedEmployee);
                
                // 再描画
                renderEmployeeOrderList();
            }
            
            return false;
        });
    });
}

// 並び順を保存
async function saveEmployeeOrder() {
    if (EmployeeOrderState.employees.length === 0) {
        showMessage('保存する従業員がいません');
        return;
    }
    
    // 保存データを作成
    const orders = EmployeeOrderState.employees.map((emp, index) => ({
        employee_id: emp.employee_id,
        store_id: emp.store_id,
        display_order: index + 1
    }));
    
    try {
        const response = await fetch('api/employee-order.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orders: orders })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('並び順を保存しました');
        } else {
            showMessage('並び順の保存に失敗しました: ' + result.error);
        }
    } catch (error) {
        console.error('並び順保存エラー:', error);
        showMessage('並び順の保存に失敗しました');
    }
}

// 並び順をリセット（従業員ID順）
function resetEmployeeOrder() {
    if (!confirm('並び順を従業員ID順にリセットしますか？')) {
        return;
    }
    
    // employee_idでソート
    EmployeeOrderState.employees.sort((a, b) => {
        return a.employee_id.localeCompare(b.employee_id);
    });
    
    renderEmployeeOrderList();
    showMessage('並び順をリセットしました（保存ボタンを押してください）');
}

// グローバルに公開
window.initEmployeeOrderManagement = initEmployeeOrderManagement;
window.saveEmployeeOrder = saveEmployeeOrder;
window.resetEmployeeOrder = resetEmployeeOrder;
