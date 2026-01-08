// KINTAIKUN v2.0 - Server Edition (2024-11-17)
// member-management.js - メンバー管理機能（サーバー版）

// 一時保存用データ
let tempMemberData = {
    name: '',
    id: '',
    originalId: ''
};

// 従業員ID自動生成
function generateEmployeeId() {
    // 現在ログイン中のユーザーからプレフィックスと番号範囲を取得
    let prefix = 'X';
    let numberRange = [100, 999]; // デフォルト範囲
    
    if (AppState.currentUser) {
        // 管理者の場合は選択中の店舗を使用
        if (AppState.currentUser.isAdmin) {
            const selectedPrefix = AppState.currentUser.selectedStorePrefix;
            if (selectedPrefix) {
                // 選択中の店舗を探す
                const store = config.stores.find(s => s.prefix === selectedPrefix);
                if (store) {
                    const storeAccount = config.storeAccounts[store.id];
                    if (storeAccount) {
                        prefix = storeAccount.prefix;
                        if (storeAccount.numberRange) {
                            numberRange = storeAccount.numberRange;
                        }
                    }
                }
            } else {
                // 「全店舗」選択時はID生成不可
                return null;
            }
        } else {
            // 通常店舗の場合
            // APIから取得したemployeePrefixを優先
            if (AppState.currentUser.employeePrefix) {
                prefix = AppState.currentUser.employeePrefix;
            }
            
            // configから番号範囲を取得
            const storeId = AppState.currentUser.storeId;
            const storeAccount = config.storeAccounts[storeId];
            if (storeAccount) {
                if (!AppState.currentUser.employeePrefix && storeAccount.prefix) {
                    prefix = storeAccount.prefix;
                }
                if (storeAccount.numberRange) {
                    numberRange = storeAccount.numberRange;
                }
            }
        }
    }
    
    // 指定範囲内でランダムな数字を生成
    const min = numberRange[0];
    const max = numberRange[1];
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    
    return prefix + String(randomNum);
}

// ユニークな従業員IDを生成（既存IDと重複しないように）
async function generateUniqueEmployeeId() {
    let newId = generateEmployeeId();
    
    // 管理者が「全店舗」選択時はnullが返る
    if (newId === null) {
        return null;
    }
    
    let attempts = 0;
    const maxAttempts = 50; // 最大試行回数
    
    while (attempts < maxAttempts) {
        try {
            const response = await apiGetEmployee(newId);
            if (!response.success || !response.data) {
                // 存在しない = 使用可能
                return newId;
            }
            // 存在する場合は再生成
            newId = generateEmployeeId();
            if (newId === null) return null;
            attempts++;
        } catch (error) {
            // エラー（404など）= 存在しない = 使用可能
            return newId;
        }
    }
    
    // 最大試行回数に達した場合はそのまま返す
    return newId;
}

// メンバー追加画面を開く時にID自動生成
async function initMemberAddScreen() {
    const nameInput = document.getElementById('add-member-name');
    const idInput = document.getElementById('add-member-id');
    
    // 管理者が「全店舗」選択時はエラー表示
    if (AppState.currentUser && AppState.currentUser.isAdmin && !AppState.currentUser.selectedStorePrefix) {
        showMessage('メンバーを追加するには、先に店舗を選択してください');
        showScreen('admin-menu-screen');
        return;
    }
    
    // フォームをクリア
    if (nameInput) nameInput.value = '';
    
    // IDを自動生成して表示
    if (idInput) {
        const newId = await generateUniqueEmployeeId();
        if (newId === null) {
            showMessage('店舗を選択してください');
            showScreen('admin-menu-screen');
            return;
        }
        idInput.value = newId;
    }
    
    // 名前入力欄にフォーカス
    if (nameInput) {
        setTimeout(() => nameInput.focus(), 100);
    }
}

// メンバー管理画面の初期化
async function initMemberManagement() {
    console.log('メンバー管理画面を初期化');
    await displayMemberList();
    setupMemberManagementListeners();
}

// メンバーリストを表示
async function displayMemberList() {
    const tbody = document.getElementById('member-list-tbody');
    if (!tbody) return;
    
    try {
        // 選択中の店舗プレフィックスを取得
        const prefix = typeof getSelectedStorePrefix === 'function' ? getSelectedStorePrefix() : null;
        
        // サーバーから従業員リストを取得（プレフィックスでフィルタ）
        const response = await apiGetAllEmployees(null, prefix);
        
        if (!response.success || !response.data) {
            tbody.innerHTML = '<tr><td colspan="2" style="padding: 40px; text-align: center; color: #999;">データの読み込みに失敗しました</td></tr>';
            return;
        }
        
        const membersData = response.data;
        
        if (membersData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="padding: 40px; text-align: center; color: #999;">登録されているメンバーがいません</td></tr>';
            return;
        }
        
        // テーブルにメンバーを表示
        let html = '';
        membersData.forEach(member => {
            html += `
                <tr data-member-id="${member.employee_id}">
                    <td>${member.employee_name}</td>
                    <td>${member.employee_id}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        
        // 行クリックイベント
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            row.addEventListener('click', function() {
                // 全ての行から選択状態を解除
                rows.forEach(r => r.classList.remove('selected'));
                
                // クリックした行を選択状態にする
                this.classList.add('selected');
                
                // ボタンの状態を更新
                updateMemberActionButtons();
            });
        });
        
        // 初期状態でボタンを無効化
        updateMemberActionButtons();
        
    } catch (error) {
        console.error('Failed to load members:', error);
        tbody.innerHTML = '<tr><td colspan="2" style="padding: 40px; text-align: center; color: #f44;">データの読み込みに失敗しました</td></tr>';
    }
}

// メンバー管理画面のイベントリスナー設定
function setupMemberManagementListeners() {
    // 何もしない
}

// メンバーアクションボタンの状態を更新
function updateMemberActionButtons() {
    const selectedRow = document.querySelector('#member-list-tbody tr.selected');
    const editBtn = document.getElementById('edit-member-btn');
    const deleteBtn = document.getElementById('delete-member-btn');
    
    if (editBtn && deleteBtn) {
        if (selectedRow) {
            editBtn.disabled = false;
            deleteBtn.disabled = false;
        } else {
            editBtn.disabled = true;
            deleteBtn.disabled = true;
        }
    }
}

// 選択されたメンバーを編集
function editSelectedMember() {
    const selectedRow = document.querySelector('#member-list-tbody tr.selected');
    if (selectedRow) {
        const memberId = selectedRow.getAttribute('data-member-id');
        showMemberEditScreen(memberId);
    }
}

// 選択されたメンバーを削除
function deleteSelectedMember() {
    const selectedRow = document.querySelector('#member-list-tbody tr.selected');
    if (selectedRow) {
        const memberId = selectedRow.getAttribute('data-member-id');
        showMemberDeleteConfirmScreen(memberId);
    }
}

// メンバー編集画面を表示
async function showMemberEditScreen(memberId) {
    try {
        // サーバーから従業員情報を取得
        const response = await apiGetEmployee(memberId);
        
        if (!response.success || !response.data) {
            showMessage('従業員情報の取得に失敗しました');
            return;
        }
        
        const member = response.data;
        
        console.log('メンバー編集:', member);
        
        // 一時データに保存（元のデータを保持）
        tempMemberData.originalId = member.employee_id;
        tempMemberData.name = member.employee_name;
        tempMemberData.id = member.employee_id;
        
        // フォームに現在の値を設定
        document.getElementById('edit-member-name').value = member.employee_name;
        document.getElementById('edit-member-id').value = member.employee_id;
        
        // 編集画面へ遷移
        showScreen('member-edit-screen');
        
    } catch (error) {
        console.error('Failed to load member:', error);
        showMessage('従業員情報の取得に失敗しました');
    }
}

// メンバー追加確認画面への遷移
async function confirmAddMember() {
    const name = document.getElementById('add-member-name').value.trim();
    const id = document.getElementById('add-member-id').value.trim();
    
    if (!name) {
        showMessage('名前を入力してください');
        return;
    }
    
    if (!id) {
        showMessage('IDが生成されていません');
        return;
    }
    
    // IDの形式チェック（4桁の英数字）
    if (id.length !== 4 || !/^[A-Za-z0-9]{4}$/.test(id)) {
        showMessage('従業員IDの形式が不正です');
        return;
    }
    
    try {
        // 既に存在するIDかチェック（念のため再確認）
        const response = await apiGetEmployee(id);
        if (response.success && response.data) {
            showMessage('この従業員IDは既に登録されています');
            // 新しいIDを再生成
            const newId = await generateUniqueEmployeeId();
            document.getElementById('add-member-id').value = newId;
            return;
        }
    } catch (error) {
        // 404エラー（存在しない）は正常なので続行
    }
    
    // 一時保存
    tempMemberData.name = name;
    tempMemberData.id = id;
    
    // 確認画面に情報を表示
    document.getElementById('confirm-add-name').textContent = name;
    document.getElementById('confirm-add-id').textContent = id;
    
    // 確認画面へ遷移
    showScreen('member-add-confirm-screen');
}

// メンバーを実際に追加
async function executeAddMember() {
    try {
        // 現在ログイン中の店舗IDを取得
        const storeId = AppState.currentUser ? AppState.currentUser.storeId : null;
        
        // サーバーに従業員を追加（店舗ID付き）
        const response = await apiAddEmployee(tempMemberData.id, tempMemberData.name, 0, storeId);
        
        if (response.success) {
            // 成功メッセージ
            showMessage(`${tempMemberData.name}を追加しました`);
            
            // メンバー管理画面に戻る
            showScreen('admin-menu-screen');
            
            // リストを更新
            setTimeout(async () => {
                await initMemberManagement();
            }, 100);
        } else {
            showMessage('追加に失敗しました: ' + response.message);
            showScreen('member-add-screen');
        }
        
    } catch (error) {
        console.error('Failed to add member:', error);
        showMessage('追加に失敗しました');
        showScreen('member-add-screen');
    }
    
    // 一時データをクリア
    tempMemberData = { name: '', id: '', originalId: '' };
}

// メンバー追加フォームに戻る
function backToAddForm() {
    showScreen('member-add-screen');
    // フォームの値を復元
    document.getElementById('add-member-name').value = tempMemberData.name;
    document.getElementById('add-member-id').value = tempMemberData.id;
}

// メンバー管理画面に戻る
function backToMemberManagement() {
    showScreen('admin-menu-screen');
    setTimeout(async () => {
        await initMemberManagement();
    }, 100);
}

// メンバー編集確認画面への遷移
function confirmEditMember() {
    const name = document.getElementById('edit-member-name').value.trim();
    const id = document.getElementById('edit-member-id').value.trim();
    
    if (!name) {
        showMessage('名前を入力してください');
        return;
    }
    
    // 一時保存
    tempMemberData.name = name;
    tempMemberData.id = id;
    
    // 確認画面に情報を表示
    document.getElementById('confirm-edit-name').textContent = name;
    document.getElementById('confirm-edit-id').textContent = id;
    
    // 確認画面へ遷移
    showScreen('member-edit-confirm-screen');
}

// メンバーを実際に編集
async function executeEditMember() {
    try {
        // サーバーの従業員情報を更新
        const response = await apiUpdateEmployee(tempMemberData.originalId, tempMemberData.name);
        
        if (response.success) {
            // 成功メッセージ
            showMessage(`${tempMemberData.name}を更新しました`);
            
            // メンバー管理画面に戻る
            showScreen('admin-menu-screen');
            
            // リストを更新
            setTimeout(async () => {
                await initMemberManagement();
            }, 100);
        } else {
            showMessage('更新に失敗しました: ' + response.message);
            showScreen('member-edit-screen');
        }
        
    } catch (error) {
        console.error('Failed to update member:', error);
        showMessage('更新に失敗しました');
        showScreen('member-edit-screen');
    }
    
    // 一時データをクリア
    tempMemberData = { name: '', id: '', originalId: '' };
}

// メンバー編集フォームに戻る
function backToEditForm() {
    showScreen('member-edit-screen');
    // フォームの値を復元
    document.getElementById('edit-member-name').value = tempMemberData.name;
    document.getElementById('edit-member-id').value = tempMemberData.id;
}

// メンバー削除確認画面を表示
function showMemberDeleteConfirmScreen(memberId) {
    // 選択された行から情報を取得
    const selectedRow = document.querySelector(`#member-list-tbody tr[data-member-id="${memberId}"]`);
    if (!selectedRow) return;
    
    const name = selectedRow.cells[0].textContent;
    const id = selectedRow.cells[1].textContent;
    
    // 一時データに保存
    tempMemberData.originalId = id;
    tempMemberData.name = name;
    tempMemberData.id = id;
    
    // 確認画面に情報を表示
    document.getElementById('confirm-delete-name').textContent = name;
    document.getElementById('confirm-delete-id').textContent = id;
    
    // 削除確認画面へ遷移
    showScreen('member-delete-confirm-screen');
}

// メンバーを実際に削除
async function executeDeleteMember() {
    try {
        // サーバーから従業員を削除
        const response = await apiDeleteEmployee(tempMemberData.originalId);
        
        if (response.success) {
            // 成功メッセージ
            showMessage(`${tempMemberData.name}を削除しました`);
            
            // メンバー管理画面に戻る
            showScreen('admin-menu-screen');
            
            // リストを更新
            setTimeout(async () => {
                await initMemberManagement();
            }, 100);
        } else {
            showMessage('削除に失敗しました: ' + response.message);
            showScreen('admin-menu-screen');
        }
        
    } catch (error) {
        console.error('Failed to delete member:', error);
        showMessage('削除に失敗しました');
        showScreen('admin-menu-screen');
    }
    
    // 一時データをクリア
    tempMemberData = { name: '', id: '', originalId: '' };
}

// 削除をキャンセル
function cancelDelete() {
    // メンバー管理画面に戻る
    showScreen('admin-menu-screen');
    setTimeout(async () => {
        await initMemberManagement();
    }, 100);
}

// 画面表示時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // 管理者メニュー画面の初期化
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.id === 'admin-menu-screen' && mutation.target.classList.contains('active')) {
                console.log('管理者メニュー画面がアクティブになりました');
                initMemberManagement();
            }
        });
    });
    
    const adminScreen = document.getElementById('admin-menu-screen');
    if (adminScreen) {
        observer.observe(adminScreen, { attributes: true, attributeFilter: ['class'] });
        
        if (adminScreen.classList.contains('active')) {
            initMemberManagement();
        }
    }
});
