// navigation.js - 画面遷移制御

// 画面遷移履歴の管理
const navigationHistory = [];

// 画面遷移関数
function showScreen(screenId) {
    // 画面遷移前の処理
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) {
        navigationHistory.push(currentScreen.id);
    }
    
    // すべての画面を非表示
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
        screen.setAttribute('aria-hidden', 'true');
    });
    
    // 指定された画面を表示
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        targetScreen.setAttribute('aria-hidden', 'false');
        
        // 画面遷移のログ
        debugLog(`画面遷移: ${screenId}`);
        
        // 画面ごとの初期化処理
        initializeScreen(screenId);
        
        // フォーカス管理
        manageFocus(targetScreen);
    }
}

// 画面初期化処理
function initializeScreen(screenId) {
    switch(screenId) {
        case 'login-screen':
            clearLoginForm();
            focusFirstInput(screenId);
            break;
            
        case 'employee-id-screen':
            clearEmployeeIdForm();
            focusFirstInput(screenId);
            break;
            
        case 'work-type-screen':
            displayEmployeeName();
            updateWorkStatus();
            break;
            
        case 'clock-in-screen':
            displayEmployeeName();
            break;
            
        case 'break-clock-screen':
            displayEmployeeName();
            updateButtonStates();
            break;
            
        case 'store-select-screen':
            displayEmployeeName();
            loadStoreList();
            break;
            
        case 'clock-in-complete':
            playSuccessSound();
            break;
            
        case 'clock-out-complete':
            playCompleteSound();
            break;
            
        case 'admin-attendance-check-screen':
            if (typeof initAdminAttendanceCheck === 'function') {
                initAdminAttendanceCheck();
            }
            break;
            
        case 'help-check-screen':
            if (typeof initHelpCheck === 'function') {
                initHelpCheck();
            }
            break;
            
        case 'help-edit-screen':
            if (typeof initHelpEdit === 'function') {
                initHelpEdit();
            }
            break;
            
        case 'member-management-screen':
            if (typeof initMemberManagement === 'function') {
                initMemberManagement();
            }
            break;
            
        case 'wage-setting-screen':
            if (typeof initWageSetting === 'function') {
                initWageSetting();
            }
            break;
            
        case 'excel-output-screen':
            if (typeof initExcelOutput === 'function') {
                initExcelOutput();
            }
            break;
            
        case 'attendance-check-screen':
            if (typeof initAttendanceCheck === 'function') {
                initAttendanceCheck();
            }
            break;
    }
}

// フォームクリア関数
function clearLoginForm() {
    const form = document.getElementById('login-form');
    if (form) {
        form.reset();
        const errorMsg = document.getElementById('login-error');
        if (errorMsg) errorMsg.style.display = 'none';
    }
}

function clearEmployeeIdForm() {
    const form = document.getElementById('employee-id-form');
    if (form) {
        form.reset();
        const errorMsg = document.getElementById('error-msg');
        if (errorMsg) errorMsg.style.display = 'none';
    }
}

// ステータス更新関数
function updateWorkStatus() {
    const statusText = document.querySelector('#work-type-screen .status-text');
    if (statusText && AppState.workStatus === 'working') {
        statusText.textContent = 'ヘルプで出勤状態です';
        statusText.style.color = '#4CAF50';
    } else if (statusText) {
        statusText.textContent = '通常で出勤状態です';
        statusText.style.color = '#FF4444';
    }
}

// 従業員名表示
function displayEmployeeName() {
    const nameElements = document.querySelectorAll('.employee-name');
    nameElements.forEach(el => {
        if (AppState.currentUser && AppState.currentUser.name) {
            el.textContent = AppState.currentUser.name;
        } else {
            el.textContent = '従業員';
        }
    });
}

// ボタン状態更新
function updateButtonStates() {
    const breakStartBtn = document.querySelector('[data-action="break-start"]');
    const breakEndBtn = document.querySelector('[data-action="break-end"]');
    const clockOutBtn = document.querySelector('[data-action="clock-out"]');
    
    if (AppState.workStatus === 'onBreak') {
        // 休憩中
        if (breakStartBtn) {
            breakStartBtn.disabled = true;
            breakStartBtn.classList.add('disabled');
        }
        if (breakEndBtn) {
            breakEndBtn.disabled = false;
            breakEndBtn.classList.remove('disabled');
        }
        if (clockOutBtn) {
            clockOutBtn.disabled = true;
            clockOutBtn.classList.add('disabled');
        }
    } else if (AppState.workStatus === 'working') {
        // 勤務中
        if (breakStartBtn) {
            breakStartBtn.disabled = false;
            breakStartBtn.classList.remove('disabled');
        }
        if (breakEndBtn) {
            breakEndBtn.disabled = true;
            breakEndBtn.classList.add('disabled');
        }
        if (clockOutBtn) {
            clockOutBtn.disabled = false;
            clockOutBtn.classList.remove('disabled');
        }
    }
}

// 店舗リスト読み込み
function loadStoreList() {
    const selectField = document.querySelector('#store-select-screen .select-field');
    if (selectField && config.stores) {
        selectField.innerHTML = '<option value="">店舗を選択</option>';
        config.stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            selectField.appendChild(option);
        });
    }
}

// フォーカス管理
function manageFocus(screen) {
    // 最初のインタラクティブ要素にフォーカス
    const focusable = screen.querySelector('input:not([disabled]), button:not([disabled]), select:not([disabled])');
    if (focusable) {
        setTimeout(() => focusable.focus(), 100);
    }
}

// 最初の入力フィールドにフォーカス
function focusFirstInput(screenId) {
    const screen = document.getElementById(screenId);
    if (screen) {
        const firstInput = screen.querySelector('input:not([disabled])');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

// 成功音
function playSuccessSound() {
    // 音声フィードバック（オプション）
    if ('speechSynthesis' in window && config.enableSound) {
        const utterance = new SpeechSynthesisUtterance('出勤しました');
        utterance.lang = 'ja-JP';
        speechSynthesis.speak(utterance);
    }
}

// 完了音
function playCompleteSound() {
    // 音声フィードバック（オプション）
    if ('speechSynthesis' in window && config.enableSound) {
        const utterance = new SpeechSynthesisUtterance('お疲れ様でした');
        utterance.lang = 'ja-JP';
        speechSynthesis.speak(utterance);
    }
}

// 前の画面に戻る
function goToPreviousScreen() {
    if (navigationHistory.length > 0) {
        const previousScreen = navigationHistory.pop();
        showScreen(previousScreen);
    }
}