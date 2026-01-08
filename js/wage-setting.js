// wage-setting.js - 時給設定機能（サーバー版）

// 店舗のプレフィックスを取得するヘルパー関数
function getStorePrefixForWage() {
    // main.jsのgetSelectedStorePrefixを使用
    if (typeof getSelectedStorePrefix === 'function') {
        return getSelectedStorePrefix();
    }
    // フォールバック
    if (AppState.currentUser) {
        const storeId = AppState.currentUser.storeId;
        const storeAccount = config.storeAccounts[storeId];
        if (storeAccount && storeAccount.prefix) {
            return storeAccount.prefix;
        }
    }
    return null;
}

// 時給設定画面の初期化
async function initWageSetting() {
    console.log('時給設定画面を初期化');
    await updateWageMemberSelect();
    await displayWageList();
    setupWageSettingListeners();
}

// メンバー選択ドロップダウンを更新
async function updateWageMemberSelect() {
    const select = document.getElementById('wage-member-select');
    if (!select) return;
    
    try {
        // サーバーから従業員リストを取得（プレフィックスでフィルタ）
        const prefix = getStorePrefixForWage();
        const response = await apiGetAllEmployees(null, prefix);
        
        // 既存のオプションをクリア（デフォルト以外）
        select.innerHTML = '<option value="">選択してください</option>';
        
        if (response.success && response.data) {
            const employees = response.data;
            
            // メンバーをドロップダウンに追加
            employees.forEach(employee => {
                const option = document.createElement('option');
                option.value = employee.employee_id;
                option.textContent = `${employee.employee_name} (${employee.employee_id})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load employees for wage setting:', error);
    }
}

// 時給一覧を表示
async function displayWageList() {
    const tbody = document.getElementById('wage-list-tbody');
    if (!tbody) return;
    
    try {
        // サーバーから従業員リストを取得（プレフィックスでフィルタ）
        const prefix = getStorePrefixForWage();
        const response = await apiGetAllEmployees(null, prefix);
        
        if (!response.success || !response.data) {
            tbody.innerHTML = '<tr><td colspan="2" style="padding: 40px; text-align: center; color: #999;">データの読み込みに失敗しました</td></tr>';
            return;
        }
        
        const employees = response.data;
        
        if (employees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="padding: 40px; text-align: center; color: #999;">登録されているメンバーがいません</td></tr>';
            return;
        }
        
        let html = '';
        employees.forEach(employee => {
            const wage = employee.hourly_wage || 0;
            const wageDisplay = wage > 0 ? wage.toLocaleString() + '円' : '-';
            
            html += `
                <tr data-member-id="${employee.employee_id}">
                    <td>${employee.employee_name}</td>
                    <td class="wage-amount">${wageDisplay}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load wage list:', error);
        tbody.innerHTML = '<tr><td colspan="2" style="padding: 40px; text-align: center; color: #f44;">データの読み込みに失敗しました</td></tr>';
    }
}

// イベントリスナーの設定
function setupWageSettingListeners() {
    // メンバー選択の変更時
    const memberSelect = document.getElementById('wage-member-select');
    if (memberSelect) {
        memberSelect.removeEventListener('change', handleWageMemberSelect);
        memberSelect.addEventListener('change', handleWageMemberSelect);
    }
    
    // 金額入力フィールドでEnterキー押下時
    const amountInput = document.getElementById('wage-amount-input');
    if (amountInput) {
        amountInput.removeEventListener('keypress', handleWageInputKeypress);
        amountInput.addEventListener('keypress', handleWageInputKeypress);
    }
}

// メンバー選択時のハンドラー
async function handleWageMemberSelect(e) {
    const memberId = e.target.value;
    const amountInput = document.getElementById('wage-amount-input');
    
    if (memberId && amountInput) {
        try {
            // 選択されたメンバーの情報を取得
            const response = await apiGetEmployee(memberId);
            
            if (response.success && response.data) {
                // 現在の時給を表示
                const currentWage = response.data.hourly_wage || 0;
                amountInput.value = currentWage > 0 ? currentWage : '';
                amountInput.focus();
            }
        } catch (error) {
            console.error('Failed to load employee wage:', error);
            amountInput.value = '';
            amountInput.focus();
        }
    }
}

// 金額入力でEnterキー押下時のハンドラー
function handleWageInputKeypress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        confirmWageSetting();
    }
}

// 時給設定確認画面への遷移
async function confirmWageSetting() {
    const memberSelect = document.getElementById('wage-member-select');
    const amountInput = document.getElementById('wage-amount-input');
    
    if (!memberSelect || !amountInput) return;
    
    const memberId = memberSelect.value;
    const amount = amountInput.value.trim();
    
    if (!memberId) {
        showMessage('メンバーを選択してください');
        return;
    }
    
    if (!amount || isNaN(amount) || parseInt(amount) < 0) {
        showMessage('正しい金額を入力してください');
        return;
    }
    
    try {
        // 選択されたメンバーの情報を取得
        const response = await apiGetEmployee(memberId);
        
        if (!response.success || !response.data) {
            showMessage('メンバー情報の取得に失敗しました');
            return;
        }
        
        const member = response.data;
        const wageAmount = parseInt(amount);
        
        // 確認画面に情報を表示
        document.getElementById('confirm-wage-name').textContent = member.employee_name;
        document.getElementById('confirm-wage-amount').textContent = wageAmount.toLocaleString() + '円';
        
        // データを一時保存
        window.tempWageData = {
            memberId: memberId,
            memberName: member.employee_name,
            amount: wageAmount
        };
        
        // 確認画面へ遷移
        showScreen('wage-confirm-screen');
        
    } catch (error) {
        console.error('Failed to confirm wage setting:', error);
        showMessage('エラーが発生しました');
    }
}

// 時給設定を実際に保存
async function executeWageSetting() {
    if (!window.tempWageData) {
        showMessage('データが見つかりません');
        return;
    }
    
    const { memberId, memberName, amount } = window.tempWageData;
    
    try {
        // サーバーに時給を保存
        const response = await apiUpdateEmployee(memberId, memberName, amount);
        
        if (response.success) {
            showMessage(`${memberName}の時給を設定しました`);
            
            // 時給設定画面に戻る
            showScreen('wage-setting-screen');
            
            // 一覧を更新
            setTimeout(async () => {
                await initWageSetting();
            }, 100);
            
            // フォームをクリア
            document.getElementById('wage-member-select').value = '';
            document.getElementById('wage-amount-input').value = '';
        } else {
            showMessage('時給の設定に失敗しました: ' + response.message);
            showScreen('wage-setting-screen');
        }
        
    } catch (error) {
        console.error('Failed to save wage:', error);
        showMessage('時給の設定に失敗しました');
        showScreen('wage-setting-screen');
    }
    
    // 一時データをクリア
    window.tempWageData = null;
}

// 時給設定入力画面に戻る
function backToWageInput() {
    showScreen('wage-setting-screen');
    
    // フォームの値を復元
    if (window.tempWageData) {
        document.getElementById('wage-member-select').value = window.tempWageData.memberId;
        document.getElementById('wage-amount-input').value = window.tempWageData.amount;
    }
}

// 時給設定画面に戻る（キャンセル）
function backToWageSettingScreen() {
    showScreen('wage-setting-screen');
    
    // フォームをクリア
    document.getElementById('wage-member-select').value = '';
    document.getElementById('wage-amount-input').value = '';
    
    // 一時データをクリア
    window.tempWageData = null;
    
    // 一覧を更新
    setTimeout(async () => {
        await initWageSetting();
    }, 100);
}

// 画面表示時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // 時給設定画面の初期化
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.id === 'wage-setting-screen' && mutation.target.classList.contains('active')) {
                console.log('時給設定画面がアクティブになりました');
                initWageSetting();
            }
        });
    });
    
    const wageScreen = document.getElementById('wage-setting-screen');
    if (wageScreen) {
        observer.observe(wageScreen, { attributes: true, attributeFilter: ['class'] });
        
        if (wageScreen.classList.contains('active')) {
            initWageSetting();
        }
    }
});
