// validation.js - フォーム検証とエラー処理

// ログインフォーム検証
function validateLogin() {
    const loginId = document.querySelector('#login-screen input[type="text"]').value;
    const password = document.querySelector('#login-screen input[type="password"]').value;
    
    if (!loginId || !password) {
        showError('ログインIDとパスワードを入力してください');
        return false;
    }
    
    // 実際の実装ではここでAPI呼び出し
    return true;
}

// 従業員ID検証
function validateEmployeeId() {
    const employeeId = document.querySelector('#employee-id-screen .input-field-large').value;
    const errorMsg = document.getElementById('error-msg');
    
    if (!employeeId) {
        if (errorMsg) {
            errorMsg.textContent = '従業員IDを入力してください';
            errorMsg.style.display = 'block';
        }
        return false;
    }
    
    // ID形式チェック（英数字、4桁）
    if (!/^[A-Za-z0-9]{4}$/.test(employeeId)) {
        if (errorMsg) {
            errorMsg.textContent = '※IDが間違っています';
            errorMsg.style.display = 'block';
        }
        return false;
    }
    
    // エラーメッセージを隠す
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
    
    return true;
}

// 店舗選択検証
function validateStoreSelection() {
    const storeSelect = document.querySelector('#store-select-screen .select-field');
    
    if (!storeSelect || !storeSelect.value) {
        showError('ヘルプ先店舗を選択してください');
        return false;
    }
    
    return true;
}

// エラー表示関数
function showError(message) {
    // トースト通知やモーダルでエラーを表示
    console.error(message);
    alert(message); // 仮実装
}

// 成功メッセージ表示
function showSuccess(message) {
    console.log(message);
}

// 入力制限（数字のみ）
function restrictToNumbers(input) {
    input.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
}

// 入力制限（英数字のみ）
function restrictToAlphanumeric(input) {
    input.addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z0-9]/g, '');
    });
}

// フォームのリセット
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.value = '';
        });
    }
}