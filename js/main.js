// KINTAIKUN v2.0 - Server Edition (2024-11-17)
// このファイルはサーバー用に最適化されています
// main.js - メインアプリケーション機能

// アプリケーションの状態管理
const AppState = {
    currentUser: null,
    currentScreen: 'login-screen',
    workStatus: 'notStarted', // notStarted, working, onBreak
    breakStartTime: null,
    workStartTime: null
};

// ========== Cookie操作関数（ログイン保持用） ==========

// Cookieを設定（デフォルト7日間保持）
function setCookie(name, value, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

// Cookieを取得
function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name && cookieValue) {
            try {
                return JSON.parse(decodeURIComponent(cookieValue));
            } catch {
                return null;
            }
        }
    }
    return null;
}

// Cookieを削除
function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// 自動ログインチェック（Cookieから復元）
async function checkAutoLogin() {
    const session = getCookie('kintaikun_session');
    
    if (!session || !session.loginId || !session.password) {
        return false;
    }
    
    // 有効期限チェック（7日以内か）
    const elapsed = Date.now() - session.loginTime;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7日
    
    if (elapsed > maxAge) {
        // 期限切れ - Cookie削除
        deleteCookie('kintaikun_session');
        return false;
    }
    
    try {
        // APIで再認証
        const response = await apiLogin(session.loginId, session.password);
        
        if (response.success && response.data) {
            const storeData = response.data;
            const storeAccount = config.storeAccounts[session.loginId];
            const isAdmin = storeAccount && storeAccount.isAdmin === true;
            
            AppState.currentUser = { 
                id: session.loginId, 
                role: 'admin', 
                storeId: storeData.store_id,
                employeePrefix: storeData.employee_prefix,
                isAdmin: isAdmin,
                selectedStorePrefix: null
            };
            config.storeName = storeData.store_name;
            
            // ヘッダーの店舗名を更新
            updateStoreNameDisplay();
            
            // 全店舗選択リストを更新
            updateAllStoreSelects(storeData.store_id);
            
            if (isAdmin) {
                initAdminStoreSelect();
                showScreen('admin-menu-screen');
                if (typeof initMemberManagement === 'function') {
                    setTimeout(() => initMemberManagement(), 100);
                }
            } else {
                showScreen('employee-id-screen');
            }
            
            console.log('自動ログイン成功');
            return true;
        }
    } catch (error) {
        console.error('自動ログイン失敗:', error);
        deleteCookie('kintaikun_session');
    }
    
    return false;
}

// 初回インストール画面の処理
function checkFirstTimeAccess() {
    const installKey = 'kintaikun_installed';
    const isInstalled = localStorage.getItem(installKey);
    
    if (isInstalled) {
        // 既にインストール済み - 画面を非表示
        const installScreen = document.getElementById('install-screen');
        if (installScreen) {
            installScreen.style.display = 'none';
        }
        return Promise.resolve();
    }
    
    // 初回アクセス - インストール画面を表示
    return new Promise((resolve) => {
        const installScreen = document.getElementById('install-screen');
        if (!installScreen) {
            resolve();
            return;
        }
        
        installScreen.style.display = 'flex';
        
        const progressFill = installScreen.querySelector('.install-progress-fill');
        const percentText = installScreen.querySelector('.install-percent');
        const statusText = installScreen.querySelector('.install-status');
        const detailText = installScreen.querySelector('.install-detail');
        const iconElement = installScreen.querySelector('.install-icon');
        
        // プログレス詳細メッセージ
        const progressSteps = [
            { percent: 0, detail: '端末情報を取得しています...' },
            { percent: 15, detail: 'セキュリティ認証を確認中...' },
            { percent: 30, detail: 'ライセンスを検証しています...' },
            { percent: 45, detail: 'アプリケーションデータを準備中...' },
            { percent: 60, detail: 'ローカル設定を構成しています...' },
            { percent: 75, detail: 'データベース接続を確立中...' },
            { percent: 90, detail: '最終チェックを実行しています...' },
            { percent: 100, detail: 'インストール完了！' }
        ];
        
        let currentStep = 0;
        let currentPercent = 0;
        
        const updateProgress = () => {
            if (currentStep >= progressSteps.length) {
                // 完了処理
                statusText.textContent = '完了';
                iconElement.textContent = '✅';
                installScreen.classList.add('install-complete');
                
                // localStorageに保存
                localStorage.setItem(installKey, Date.now().toString());
                
                // フェードアウトして終了
                setTimeout(() => {
                    installScreen.classList.add('fade-out');
                    setTimeout(() => {
                        installScreen.style.display = 'none';
                        resolve();
                    }, 800);
                }, 500);
                return;
            }
            
            const targetPercent = progressSteps[currentStep].percent;
            const targetDetail = progressSteps[currentStep].detail;
            
            // パーセンテージをアニメーション
            const animatePercent = () => {
                if (currentPercent < targetPercent) {
                    currentPercent += 1;
                    progressFill.style.width = currentPercent + '%';
                    percentText.textContent = currentPercent + '%';
                    setTimeout(animatePercent, 30 + Math.random() * 50);
                } else {
                    detailText.textContent = targetDetail;
                    currentStep++;
                    // 次のステップへ（ランダムな遅延）
                    setTimeout(updateProgress, 300 + Math.random() * 500);
                }
            };
            
            animatePercent();
        };
        
        // 少し遅延してから開始（演出用）
        setTimeout(updateProgress, 800);
    });
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('アプリケーション初期化開始');
    
    // 初回インストールチェック
    await checkFirstTimeAccess();
    
    // 時計の初期化と開始
    updateTime();
    setInterval(updateTime, 1000);
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // フォームの検証設定
    setupFormValidation();
    
    // 自動ログインチェック（Cookieから復元）
    const autoLoggedIn = await checkAutoLogin();
    
    if (!autoLoggedIn) {
        // 自動ログインできなかった場合はログイン画面を表示
        showScreen('login-screen');
    }
});

// イベントリスナーのセットアップ
function setupEventListeners() {
    // ログインフォーム
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 従業員IDフォーム
    const employeeForm = document.getElementById('employee-id-form');
    if (employeeForm) {
        employeeForm.addEventListener('submit', handleEmployeeIdSubmit);
    }
    
    // 店舗選択フォーム
    const storeForm = document.getElementById('store-select-form');
    if (storeForm) {
        storeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            confirmStoreSelection();
        });
    }
    
    // 管理者パスワードフォーム
    const adminPasswordForm = document.getElementById('admin-password-form');
    const adminPasswordInput = document.getElementById('admin-password-input');
    if (adminPasswordForm && adminPasswordInput) {
        // Enterキーでパスワード検証
        adminPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            verifyAdminPassword();
        });
        
        // 入力時の処理
        adminPasswordInput.addEventListener('input', function() {
            const errorMsg = document.getElementById('admin-password-error');
            if (errorMsg) {
                errorMsg.style.display = 'none';
            }
            
            // 4桁入力されたら自動的にチェック
            if (this.value.length === 4) {
                setTimeout(() => {
                    verifyAdminPassword();
                }, 100);
            }
        });
    }
    
    // ボタンのクリックイベント（data-action属性を使用）
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action]')) {
            const action = e.target.getAttribute('data-action');
            handleAction(action, e.target);
        }
    });
    
    // 英数字のみ入力制限と自動遷移
    const employeeIdInput = document.getElementById('employee-id-input');
    if (employeeIdInput) {
        employeeIdInput.addEventListener('input', function(e) {
            // 英数字のみに制限
            this.value = this.value.replace(/[^A-Za-z0-9]/g, '');
            
            // 4桁入力されたら自動的に次の画面へ
            if (this.value.length === 4) {
                setTimeout(async () => {
                    await handleEmployeeIdSubmit(new Event('submit'));
                }, 300); // 少し遅延を入れてユーザーに入力を確認させる
            }
        });
    }
}

// アクション処理
function handleAction(action, element) {
    switch(action) {
        case 'login':
            // フォーム送信で処理
            break;
        case 'verify-employee':
            // フォーム送信で処理
            break;
        case 'select-regular':
            selectWorkType('regular');
            break;
        case 'select-help':
            selectWorkType('help');
            break;
        case 'clock-in':
            performClockIn();
            break;
        case 'break-start':
            startBreak();
            break;
        case 'break-end':
            endBreak();
            break;
        case 'clock-out':
            performClockOut();
            break;
        case 'back-to-top':
            backToTop();
            break;
        case 'back':
            goBack();
            break;
        case 'confirm-store':
            confirmStoreSelection();
            break;
        case 'menu':
            toggleMenu();
            break;
        case 'close-menu':
            closeMenu();
            break;
        case 'goto-employee-id':
            closeMenu();
            showScreen('employee-id-screen');
            break;
        case 'goto-attendance-check':
            closeMenu();
            showScreen('attendance-check-screen');
            // 勤怠確認画面の初期化を呼ぶ
            if (typeof initAttendanceCheck === 'function') {
                setTimeout(function() {
                    initAttendanceCheck();
                }, 100);
            }
            break;
        case 'goto-shift-check':
            closeMenu();
            showScreen('shift-check-screen');
            if (typeof initShiftCheck === 'function') {
                setTimeout(function() {
                    initShiftCheck();
                }, 100);
            }
            break;
        case 'goto-shift-management':
            closeMenu();
            showScreen('shift-management-screen');
            if (typeof initShiftManagement === 'function') {
                setTimeout(function() {
                    initShiftManagement();
                }, 100);
            }
            break;
        case 'goto-contract-management':
            // admin専用
            if (AppState.currentUser && AppState.currentUser.isAdmin) {
                closeMenu();
                showScreen('contract-management-screen');
                if (typeof initContractManagement === 'function') {
                    setTimeout(function() {
                        initContractManagement();
                    }, 100);
                }
            }
            break;
        case 'goto-admin-password':
            closeMenu();
            showScreen('admin-password-screen');
            // パスワード入力欄をクリア
            const passwordInput = document.getElementById('admin-password-input');
            const passwordError = document.getElementById('admin-password-error');
            if (passwordInput) passwordInput.value = '';
            if (passwordError) passwordError.style.display = 'none';
            // パスワード入力欄にフォーカス
            if (passwordInput) {
                setTimeout(() => passwordInput.focus(), 100);
            }
            break;
        case 'back-from-admin-password':
            showScreen('employee-id-screen');
            break;
        case 'verify-admin-password':
            verifyAdminPassword();
            break;
        case 'goto-admin-menu':
            closeMenu();
            showScreen('admin-menu-screen');
            // メンバー管理画面の初期化
            if (typeof initMemberManagement === 'function') {
                setTimeout(function() {
                    initMemberManagement();
                }, 100);
            }
            break;
        case 'goto-member-management':
            showScreen('admin-menu-screen');
            if (typeof initMemberManagement === 'function') {
                setTimeout(function() {
                    initMemberManagement();
                }, 100);
            }
            break;
        case 'goto-member-add':
            showScreen('member-add-screen');
            // ID自動生成を含む初期化
            if (typeof initMemberAddScreen === 'function') {
                initMemberAddScreen();
            }
            break;
        case 'confirm-add-member':
            if (typeof confirmAddMember === 'function') {
                confirmAddMember();
            }
            break;
        case 'execute-add-member':
            if (typeof executeAddMember === 'function') {
                executeAddMember();
            }
            break;
        case 'back-to-add-form':
            if (typeof backToAddForm === 'function') {
                backToAddForm();
            }
            break;
        case 'back-to-member-management':
            if (typeof backToMemberManagement === 'function') {
                backToMemberManagement();
            }
            break;
        case 'edit-selected-member':
            if (typeof editSelectedMember === 'function') {
                editSelectedMember();
            }
            break;
        case 'delete-selected-member':
            if (typeof deleteSelectedMember === 'function') {
                deleteSelectedMember();
            }
            break;
        case 'confirm-edit-member':
            if (typeof confirmEditMember === 'function') {
                confirmEditMember();
            }
            break;
        case 'execute-edit-member':
            if (typeof executeEditMember === 'function') {
                executeEditMember();
            }
            break;
        case 'back-to-edit-form':
            if (typeof backToEditForm === 'function') {
                backToEditForm();
            }
            break;
        case 'show-delete-confirm':
            if (typeof showDeleteConfirm === 'function') {
                showDeleteConfirm();
            }
            break;
        case 'execute-delete-member':
            if (typeof executeDeleteMember === 'function') {
                executeDeleteMember();
            }
            break;
        case 'cancel-delete':
            if (typeof cancelDelete === 'function') {
                cancelDelete();
            }
            break;
        case 'execute-excel-output':
            if (typeof executeExcelOutput === 'function') {
                executeExcelOutput();
            }
            break;
        case 'clear-excel-form':
            if (typeof clearExcelForm === 'function') {
                clearExcelForm();
            }
            break;
        case 'select-excel-file':
            if (typeof selectExcelFile === 'function') {
                selectExcelFile();
            }
            break;
        case 'goto-wage-setting':
            closeMenu();
            showScreen('wage-setting-screen');
            if (typeof initWageSetting === 'function') {
                setTimeout(function() {
                    initWageSetting();
                }, 100);
            }
            break;
        case 'set-wage':
            if (typeof confirmWageSetting === 'function') {
                confirmWageSetting();
            }
            break;
        case 'execute-wage-setting':
            if (typeof executeWageSetting === 'function') {
                executeWageSetting();
            }
            break;
        case 'back-to-wage-input':
            if (typeof backToWageInput === 'function') {
                backToWageInput();
            }
            break;
        case 'display-attendance-record':
            if (typeof displayAttendanceRecord === 'function') {
                displayAttendanceRecord();
            }
            break;
        case 'load-attendance-new':
            if (typeof loadAttendanceNew === 'function') {
                loadAttendanceNew();
            }
            break;
        case 'clear-work-time':
            if (typeof clearWorkTime === 'function') {
                clearWorkTime();
            }
            break;
        case 'clear-break1':
            if (typeof clearBreak1 === 'function') {
                clearBreak1();
            }
            break;
        case 'clear-break2':
            if (typeof clearBreak2 === 'function') {
                clearBreak2();
            }
            break;
        case 'clear-break3':
            if (typeof clearBreak3 === 'function') {
                clearBreak3();
            }
            break;
        case 'save-attendance-edit':
            if (typeof saveAttendanceEdit === 'function') {
                saveAttendanceEdit();
            }
            break;
        case 'delete-attendance':
            if (typeof deleteAttendance === 'function') {
                deleteAttendance();
            }
            break;
        case 'back-to-attendance-check':
            if (typeof backToAttendanceCheck === 'function') {
                backToAttendanceCheck();
            }
            break;
        // ヘルプ勤怠編集関連
        case 'load-help-attendance':
            if (typeof loadHelpAttendance === 'function') {
                loadHelpAttendance();
            }
            break;
        case 'clear-help-work-time':
            if (typeof clearHelpWorkTime === 'function') {
                clearHelpWorkTime();
            }
            break;
        case 'clear-help-break1':
            if (typeof clearHelpBreak1 === 'function') {
                clearHelpBreak1();
            }
            break;
        case 'clear-help-break2':
            if (typeof clearHelpBreak2 === 'function') {
                clearHelpBreak2();
            }
            break;
        case 'clear-help-break3':
            if (typeof clearHelpBreak3 === 'function') {
                clearHelpBreak3();
            }
            break;
        case 'save-help-attendance-edit':
            if (typeof saveHelpAttendanceEdit === 'function') {
                saveHelpAttendanceEdit();
            }
            break;
        case 'delete-help-attendance':
            if (typeof deleteHelpAttendance === 'function') {
                deleteHelpAttendance();
            }
            break;
        case 'back-to-help-check':
            if (typeof backToHelpCheck === 'function') {
                backToHelpCheck();
            }
            break;
        case 'goto-admin-attendance-check':
            closeMenu();
            showScreen('admin-attendance-check-screen');
            if (typeof initAdminAttendanceCheck === 'function') {
                setTimeout(function() {
                    initAdminAttendanceCheck();
                }, 100);
            }
            break;
        case 'goto-help-check':
            closeMenu();
            showScreen('help-check-screen');
            if (typeof initHelpCheck === 'function') {
                setTimeout(function() {
                    initHelpCheck();
                }, 100);
            }
            break;
        case 'show-admin-attendance':
            if (typeof showAdminAttendanceData === 'function') {
                showAdminAttendanceData();
            }
            break;
        case 'show-help-attendance':
            if (typeof showHelpAttendanceData === 'function') {
                showHelpAttendanceData();
            }
            break;
        case 'goto-attendance-edit-from-admin':
            if (typeof gotoAttendanceEditFromAdmin === 'function') {
                gotoAttendanceEditFromAdmin();
            }
            break;
        case 'goto-help-edit':
            if (typeof gotoHelpEdit === 'function') {
                gotoHelpEdit();
            }
            break;
        case 'goto-help-confirm':
            // 後方互換性のため、goto-help-checkにリダイレクト
            closeMenu();
            showScreen('help-check-screen');
            if (typeof initHelpCheck === 'function') {
                setTimeout(function() {
                    initHelpCheck();
                }, 100);
            }
            break;
        case 'goto-excel-output':
            closeMenu();
            showScreen('excel-output-screen');
            if (typeof initExcelOutput === 'function') {
                setTimeout(function() {
                    initExcelOutput();
                }, 100);
            }
            break;
        case 'logout':
            closeMenu();
            resetApp();
            break;
    }
}

// ログイン処理
async function handleLogin(e) {
    e.preventDefault();
    
    const loginId = document.getElementById('login-id').value;
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error');
    
    try {
        // APIでログイン認証
        const response = await apiLogin(loginId, password);
        
        if (response.success && response.data) {
            // ログイン成功
            const storeData = response.data;
            const storeAccount = config.storeAccounts[loginId];
            const isAdmin = storeAccount && storeAccount.isAdmin === true;
            
            AppState.currentUser = { 
                id: loginId, 
                role: 'admin', 
                storeId: storeData.store_id,
                employeePrefix: storeData.employee_prefix,
                isAdmin: isAdmin,
                selectedStorePrefix: null // 管理者用：選択中の店舗プレフィックス
            };
            config.storeName = storeData.store_name;
            
            // Cookieにログイン情報を保存（7日間保持）
            setCookie('kintaikun_session', {
                loginId: loginId,
                password: password,
                loginTime: Date.now()
            }, 7);
            
            // ヘッダーの店舗名を更新
            updateStoreNameDisplay();
            
            // 全店舗選択リストを更新
            updateAllStoreSelects(storeData.store_id);
            
            if (isAdmin) {
                // 管理者の場合は直接管理者メニューへ
                initAdminStoreSelect(); // 店舗選択UIを初期化
                showScreen('admin-menu-screen');
                if (typeof initMemberManagement === 'function') {
                    setTimeout(function() {
                        initMemberManagement();
                    }, 100);
                }
            } else {
                // 通常店舗の場合は従業員ID入力画面へ
                showScreen('employee-id-screen');
            }
            errorMsg.style.display = 'none';
        } else {
            // ログイン失敗
            errorMsg.textContent = 'ログインIDまたはパスワードが正しくありません';
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorMsg.textContent = 'ログインIDまたはパスワードが正しくありません';
        errorMsg.style.display = 'block';
    }
}

// 管理者用店舗選択UIを初期化
function initAdminStoreSelect() {
    // 管理者の場合のみ全ての店舗選択UIを表示・初期化
    if (AppState.currentUser && AppState.currentUser.isAdmin) {
        // 全ての店舗選択ラッパーを表示
        const wrappers = document.querySelectorAll('.admin-store-select-wrapper');
        wrappers.forEach(wrapper => {
            wrapper.style.display = 'flex';
        });
        
        // 旧UIも表示（admin-menu-screen用）
        const oldContainer = document.getElementById('admin-store-select-container');
        if (oldContainer) {
            oldContainer.style.display = 'flex';
        }
        
        // 全ての店舗選択セレクトボックスを初期化
        const selects = document.querySelectorAll('.admin-store-filter-common');
        selects.forEach(select => {
            select.innerHTML = '<option value="">全店舗</option>';
            config.stores.forEach(store => {
                const option = document.createElement('option');
                option.value = store.prefix;
                option.textContent = store.name;
                select.appendChild(option);
            });
            
            // 現在の選択状態を反映
            if (AppState.currentUser.selectedStorePrefix) {
                select.value = AppState.currentUser.selectedStorePrefix;
            }
            
            // 変更イベント
            select.removeEventListener('change', handleAdminStoreChangeCommon);
            select.addEventListener('change', handleAdminStoreChangeCommon);
        });
        
        // 旧UIのセレクトも初期化
        const oldSelect = document.getElementById('admin-store-filter');
        if (oldSelect) {
            oldSelect.innerHTML = '<option value="">全店舗</option>';
            config.stores.forEach(store => {
                const option = document.createElement('option');
                option.value = store.prefix;
                option.textContent = store.name;
                oldSelect.appendChild(option);
            });
            
            if (AppState.currentUser.selectedStorePrefix) {
                oldSelect.value = AppState.currentUser.selectedStorePrefix;
            }
            
            oldSelect.removeEventListener('change', handleAdminStoreChangeCommon);
            oldSelect.addEventListener('change', handleAdminStoreChangeCommon);
        }
        
        // 契約管理メニューを全サイドバーに追加（admin専用）
        if (typeof showContractManagementMenu === 'function') {
            showContractManagementMenu();
        }
    } else {
        // 管理者でない場合は非表示
        const wrappers = document.querySelectorAll('.admin-store-select-wrapper');
        wrappers.forEach(wrapper => {
            wrapper.style.display = 'none';
        });
        
        const oldContainer = document.getElementById('admin-store-select-container');
        if (oldContainer) {
            oldContainer.style.display = 'none';
        }
    }
}

// 管理者用店舗選択変更時の処理（共通）
function handleAdminStoreChangeCommon(e) {
    const selectedPrefix = e.target.value || null;
    if (AppState.currentUser) {
        AppState.currentUser.selectedStorePrefix = selectedPrefix;
    }
    
    // 全ての店舗選択UIを同期
    syncAllStoreSelects(selectedPrefix);
    
    // 現在の画面に応じてデータを再読み込み
    refreshCurrentAdminData();
}

// 全ての店舗選択UIを同期
function syncAllStoreSelects(selectedPrefix) {
    const selects = document.querySelectorAll('.admin-store-filter-common');
    selects.forEach(select => {
        select.value = selectedPrefix || '';
    });
    
    const oldSelect = document.getElementById('admin-store-filter');
    if (oldSelect) {
        oldSelect.value = selectedPrefix || '';
    }
}

// 現在の管理者画面のデータを再読み込み
function refreshCurrentAdminData() {
    // メンバー管理
    if (typeof displayMemberList === 'function') {
        displayMemberList();
    }
    // 勤怠確認（管理者）
    if (typeof showAdminAttendanceData === 'function') {
        showAdminAttendanceData();
    }
    // 時給設定
    if (typeof displayWageList === 'function') {
        displayWageList();
    }
    if (typeof updateWageMemberSelect === 'function') {
        updateWageMemberSelect();
    }
    // ヘルプ確認
    if (typeof displayHelpData === 'function') {
        displayHelpData();
    }
    // シフト管理
    if (typeof loadShiftData === 'function') {
        loadShiftData();
    }
}

// 現在選択中の店舗プレフィックスを取得（管理者用）
function getSelectedStorePrefix() {
    if (AppState.currentUser) {
        // 管理者の場合は選択中の店舗
        if (AppState.currentUser.isAdmin) {
            return AppState.currentUser.selectedStorePrefix;
        }
        // 通常店舗の場合は自店舗のプレフィックス
        const storeId = AppState.currentUser.storeId;
        const storeAccount = config.storeAccounts[storeId];
        if (storeAccount && storeAccount.prefix) {
            return storeAccount.prefix;
        }
    }
    return null;
}

// ヘッダーの店舗名を更新
function updateStoreNameDisplay() {
    const storeNameElements = document.querySelectorAll('.store-name');
    storeNameElements.forEach(el => {
        el.textContent = config.storeName;
    });
}

// ヘルプ先店舗リストを更新（自店舗を除外）
function updateHelpStoreList(currentStoreId) {
    const storeSelect = document.getElementById('store-select');
    if (!storeSelect) return;
    
    // 既存のオプションをクリア（最初の「店舗を選択」以外）
    storeSelect.innerHTML = '<option value="">店舗を選択</option>';
    
    // 自店舗以外を追加
    config.stores.forEach(store => {
        if (store.id !== currentStoreId) {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            storeSelect.appendChild(option);
        }
    });
}

// 全ての店舗選択リストを更新（ヘルプ確認、Excel出力など）
function updateAllStoreSelects(currentStoreId) {
    // ヘルプ先店舗選択
    updateHelpStoreList(currentStoreId);
    
    // ヘルプ確認画面の店舗選択
    const helpStoreSelect = document.getElementById('help-store-select');
    if (helpStoreSelect) {
        helpStoreSelect.innerHTML = '<option value="">選択してください</option>';
        config.stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            helpStoreSelect.appendChild(option);
        });
    }
    
    // Excel出力画面の店舗選択
    const excelStoreSelect = document.getElementById('excel-store-select');
    if (excelStoreSelect) {
        excelStoreSelect.innerHTML = '<option value="">選択してください</option>';
        config.stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            excelStoreSelect.appendChild(option);
        });
    }
}

// 従業員ID処理
async function handleEmployeeIdSubmit(e) {
    e.preventDefault();
    
    const employeeIdInput = document.getElementById('employee-id-input');
    const employeeId = employeeIdInput.value;
    const errorMsg = document.getElementById('error-msg');
    
    if (employeeId.length === 4 && /^[A-Za-z0-9]{4}$/.test(employeeId)) {
        try {
            // サーバーから従業員情報を取得
            const response = await apiGetEmployee(employeeId);
            
            if (response.success && response.data) {
                // 従業員が見つかった
                AppState.currentUser = {
                    ...AppState.currentUser,
                    employeeId: employeeId,
                    name: response.data.employee_name
                };
                errorMsg.style.display = 'none';
                employeeIdInput.value = ''; // 入力をクリア
                
                // 保存されている状態を読み込む
                await loadWorkState(employeeId);
                
                // 状態に応じて適切な画面に遷移
                if (AppState.workStatus === 'working' || AppState.workStatus === 'onBreak') {
                    // 出勤中または休憩中の場合は休憩・退勤画面へ
                    updateBreakButtons();
                    showScreen('break-clock-screen');
                    // ヘルプモードかチェック
                    if (AppState.workType === 'help') {
                        addHelpModeClass('break-clock-screen');
                    } else {
                        removeHelpModeClass();
                    }
                } else {
                    // 未出勤または退勤済みの場合は勤務形態選択画面へ
                    showScreen('work-type-screen');
                    removeHelpModeClass();
                }
            } else {
                // 従業員が見つからない
                errorMsg.textContent = '※IDが間違っています';
                errorMsg.style.display = 'block';
                employeeIdInput.value = '';
            }
        } catch (error) {
            console.error('Employee validation error:', error);
            errorMsg.textContent = '※IDが間違っています';
            errorMsg.style.display = 'block';
            employeeIdInput.value = '';
        }
    } else {
        errorMsg.textContent = '※IDが間違っています';
        errorMsg.style.display = 'block';
        employeeIdInput.value = '';
    }
}

// 勤務形態選択
function selectWorkType(type) {
    AppState.workType = type;
    
    if (type === 'regular') {
        showScreen('clock-in-screen');
        // 通常モードの背景に設定
        removeHelpModeClass();
    } else if (type === 'help') {
        showScreen('store-select-screen');
        // ヘルプモードの背景に設定
        addHelpModeClass('store-select-screen');
    }
}

// 店舗選択確定
function confirmStoreSelection() {
    const storeSelect = document.getElementById('store-select');
    
    if (!storeSelect || !storeSelect.value) {
        showMessage('店舗を選択してください');
        return;
    }
    
    // 選択された店舗を保存
    AppState.helpStore = storeSelect.value;
    
    // 出勤画面に遷移（ヘルプモード）
    showScreen('clock-in-screen');
    addHelpModeClass('clock-in-screen');
}

// 出勤処理
async function performClockIn() {
    if (!AppState.currentUser) return;
    
    try {
        let result;
        
        // ヘルプの場合は別テーブルに保存
        if (AppState.workType === 'help' && AppState.helpStore) {
            result = await apiHelpClockIn(
                AppState.currentUser.employeeId,
                AppState.helpStore
            );
        } else {
            // 通常勤務
            result = await apiClockIn(
                AppState.currentUser.employeeId,
                'regular',
                null
            );
        }
        
        if (!result.success) {
            showMessage('出勤を記録できませんでした');
            return;
        }
        
        AppState.workStatus = 'working';
        AppState.workStartTime = new Date();
        
        saveWorkState();
        
        // 出勤完了画面を表示
        showScreen('clock-in-complete');
        
        // 5秒後にID入力画面に戻る（まだ出勤完了画面にいる場合のみ）
        setTimeout(() => {
            const currentScreen = document.querySelector('.screen.active');
            if (currentScreen && currentScreen.id === 'clock-in-complete') {
                removeHelpModeClass();
                showScreen('employee-id-screen');
            }
        }, 5000);
    } catch (error) {
        console.error('Clock-in error:', error);
        showMessage('出勤処理に失敗しました');
    }
}

// 休憩開始
async function startBreak() {
    if (!AppState.currentUser) return;
    
    try {
        let result;
        
        // ヘルプの場合は別テーブルに記録
        if (AppState.workType === 'help') {
            result = await apiHelpBreakStart(AppState.currentUser.employeeId);
        } else {
            result = await apiBreakStart(AppState.currentUser.employeeId);
        }
        
        if (!result.success) {
            showMessage('休憩を開始できませんでした');
            return;
        }
        
        AppState.workStatus = 'onBreak';
        AppState.breakStartTime = new Date();
        
        // 状態を保存
        saveWorkState();
        
        // ID入力画面に戻る（ヘルプモードをクリア）
        removeHelpModeClass();
        showScreen('employee-id-screen');
        showMessage('休憩を開始しました');
    } catch (error) {
        console.error('Break-start error:', error);
        showMessage('休憩開始処理に失敗しました');
    }
}

// 休憩終了
async function endBreak() {
    if (!AppState.currentUser) return;
    
    try {
        let result;
        
        // ヘルプの場合は別テーブルに記録
        if (AppState.workType === 'help') {
            result = await apiHelpBreakEnd(AppState.currentUser.employeeId);
        } else {
            result = await apiBreakEnd(AppState.currentUser.employeeId);
        }
        
        if (!result.success) {
            showMessage('休憩を終了できませんでした');
            return;
        }
        
        AppState.workStatus = 'working';
        AppState.breakStartTime = null;
        
        // 状態を保存
        saveWorkState();
        
        // ID入力画面に戻る（ヘルプモードをクリア）
        removeHelpModeClass();
        showScreen('employee-id-screen');
        showMessage('休憩を終了しました');
    } catch (error) {
        console.error('Break-end error:', error);
        showMessage('休憩終了処理に失敗しました');
    }
}

// 退勤処理
async function performClockOut() {
    if (!AppState.currentUser) return;
    
    try {
        let result;
        
        // ヘルプの場合は別テーブルに記録
        if (AppState.workType === 'help') {
            result = await apiHelpClockOut(AppState.currentUser.employeeId);
        } else {
            result = await apiClockOut(AppState.currentUser.employeeId);
        }
        
        if (!result.success) {
            showMessage('退勤を記録できませんでした');
            return;
        }
        
        AppState.workStatus = 'notStarted';
        AppState.workStartTime = null;
        AppState.workType = null;
        AppState.helpStore = null;
        
        // 状態を保存
        saveWorkState();
        
        // 退勤完了画面を表示
        showScreen('clock-out-complete');
        
        // 5秒後にID入力画面に戻る（まだ退勤完了画面にいる場合のみ）
        setTimeout(() => {
            const currentScreen = document.querySelector('.screen.active');
            if (currentScreen && currentScreen.id === 'clock-out-complete') {
                removeHelpModeClass();
                showScreen('employee-id-screen');
            }
        }, 5000);
    } catch (error) {
        console.error('Clock-out error:', error);
        showMessage('退勤処理に失敗しました');
    }
}

// アプリリセット
function resetApp() {
    AppState.currentUser = null;
    AppState.workStatus = 'notStarted';
    AppState.workStartTime = null;
    AppState.breakStartTime = null;
    
    // ログインCookieを削除
    deleteCookie('kintaikun_session');
    
    showScreen('login-screen');
    
    // フォームクリア
    const forms = document.querySelectorAll('form');
    forms.forEach(form => form.reset());
}

// TOPへ戻る
function backToTop() {
    // 現在の画面を取得
    const currentScreen = document.querySelector('.screen.active');
    const currentScreenId = currentScreen ? currentScreen.id : '';
    
    // 出勤完了画面または退勤完了画面からは、常にemployee-id-screenに戻る
    // （次の従業員が打刻できるようにするため）
    if (currentScreenId === 'clock-in-complete' || currentScreenId === 'clock-out-complete') {
        removeHelpModeClass();
        showScreen('employee-id-screen');
        return;
    }
    
    if (AppState.workStatus === 'working' || AppState.workStatus === 'onBreak') {
        showScreen('break-clock-screen');
        // ヘルプモードの場合は背景を維持
        if (AppState.workType === 'help') {
            addHelpModeClass('break-clock-screen');
        } else {
            removeHelpModeClass();
        }
    } else {
        removeHelpModeClass();
        showScreen('employee-id-screen');
    }
}

// 戻る処理
function goBack() {
    const screenMap = {
        'work-type-screen': 'employee-id-screen',
        'clock-in-screen': 'work-type-screen',
        'store-select-screen': 'work-type-screen',
        'break-clock-screen': 'employee-id-screen'
    };
    
    const currentScreen = document.querySelector('.screen.active').id;
    const previousScreen = screenMap[currentScreen];
    
    if (previousScreen) {
        showScreen(previousScreen);
    }
}

// メニュー表示切り替え
// メニュー表示切り替え
function toggleMenu() {
    const menu = document.getElementById('hamburger-menu');
    if (menu) {
        menu.classList.add('active');
    }
}

// メニューを閉じる
function closeMenu() {
    const menu = document.getElementById('hamburger-menu');
    if (menu) {
        menu.classList.remove('active');
    }
}

// メッセージ表示
function showMessage(message) {
    // トースト通知の実装
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// フォーム検証の設定
function setupFormValidation() {
    // HTML5の検証を有効化
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.setAttribute('novalidate', 'false');
    });
}

// グローバル設定
const config = {
    apiUrl: '',
    timeout: 30000,
    storeName: '○○店',
    // 店舗マスタ（ログインID → 店舗情報）
    // numberRange: [開始番号, 終了番号] で従業員ID生成時の番号範囲を指定
    storeAccounts: {
        // デモ用アカウント
        'demo': { name: 'デモ店', password: 'demo1234', prefix: 'D', numberRange: [1, 99], isAdmin: false },
        'admin': { name: '管理本部', password: 'admin1234', prefix: 'A', numberRange: null, isAdmin: true },
        // 以下は本番用（デモでは使用しない）
        'shichirin': { name: '南柏西口店', password: '4552', prefix: 'M', numberRange: [100, 199] },
        'nikumaru': { name: '南柏東口店', password: '5355', prefix: 'N', numberRange: [200, 299] },
        'fujishiro': { name: '藤代店', password: '2929', prefix: 'F', numberRange: [300, 399] },
        'hitachino': { name: 'ひたち野うしく店', password: '2919', prefix: 'H', numberRange: [600, 699] },
        'ushiku': { name: '牛久店', password: '2991', prefix: 'U', numberRange: [500, 599] },
        'sanuki': { name: '佐貫店', password: '2987', prefix: 'S', numberRange: [400, 499] }
    },
    // ヘルプ先店舗リスト
    stores: [
        { id: 'demo', name: 'デモ店', prefix: 'D' },
        { id: 'shichirin', name: '南柏西口店', prefix: 'M' },
        { id: 'nikumaru', name: '南柏東口店', prefix: 'N' },
        { id: 'fujishiro', name: '藤代店', prefix: 'F' },
        { id: 'hitachino', name: 'ひたち野うしく店', prefix: 'H' },
        { id: 'ushiku', name: '牛久店', prefix: 'U' },
        { id: 'sanuki', name: '佐貫店', prefix: 'S' }
    ],
    enableSound: false,
    debugMode: true
};

// デバッグログ
function debugLog(message) {
    if (config.debugMode) {
        console.log(`[勤怠KUN] ${message}`);
    }
}

// 状態を保存（サーバー版では不要 - 状態はサーバーで管理）
function saveWorkState() {
    // サーバー版ではLocalStorageを使用しない
    // すべての状態はサーバーのデータベースで管理されます
    return;
}

// 状態を読み込む
async function loadWorkState(employeeId) {
    try {
        console.log('loadWorkState開始:', employeeId);
        
        // まず通常勤務の状態を確認
        const regularResponse = await apiGetWorkStatus(employeeId);
        console.log('通常勤務状態:', regularResponse);
        
        // 通常勤務が勤務中または休憩中の場合
        if (regularResponse.success && regularResponse.data && 
            (regularResponse.data.status === 'working' || regularResponse.data.status === 'onBreak')) {
            const data = regularResponse.data;
            AppState.workStatus = data.status;
            AppState.workStartTime = data.clock_in ? parseTime(data.clock_in) : null;
            AppState.workType = 'regular';
            AppState.helpStore = null;
            
            if (AppState.workStatus === 'onBreak' && data.breaks && data.breaks.length > 0) {
                const lastBreak = data.breaks[data.breaks.length - 1];
                AppState.breakStartTime = lastBreak.start ? parseTime(lastBreak.start) : null;
            } else {
                AppState.breakStartTime = null;
            }
            console.log('通常勤務中と判定:', AppState.workStatus);
            return;
        }
        
        // 通常勤務が勤務中でない場合、ヘルプ勤務の状態を確認
        try {
            const helpResponse = await apiGetHelpWorkStatus(employeeId);
            console.log('ヘルプ勤務状態:', helpResponse);
            
            if (helpResponse.success && helpResponse.data && 
                (helpResponse.data.status === 'working' || helpResponse.data.status === 'on_break')) {
                const data = helpResponse.data;
                // ヘルプのstatusを統一（on_break → onBreak）
                AppState.workStatus = data.status === 'on_break' ? 'onBreak' : data.status;
                AppState.workStartTime = data.clock_in ? parseTime(data.clock_in) : null;
                AppState.workType = 'help';
                AppState.helpStore = data.help_store || null;
                AppState.breakStartTime = data.is_on_break ? new Date() : null;
                console.log('ヘルプ勤務中と判定:', AppState.workStatus, 'ヘルプ先:', AppState.helpStore);
                return;
            }
        } catch (helpError) {
            console.error('ヘルプ状態取得エラー:', helpError);
            // ヘルプ状態取得に失敗しても続行
        }
        
        // どちらも勤務中でない場合は未出勤
        console.log('未出勤と判定');
        AppState.workStatus = 'notStarted';
        AppState.workStartTime = null;
        AppState.breakStartTime = null;
        AppState.workType = null;
        AppState.helpStore = null;
        
    } catch (error) {
        console.error('Error loading work state:', error);
        AppState.workStatus = 'notStarted';
        AppState.workStartTime = null;
        AppState.breakStartTime = null;
        AppState.workType = null;
        AppState.helpStore = null;
    }
}

// 休憩・退勤画面のボタン状態を更新
function updateBreakButtons() {
    const breakStartBtn = document.querySelector('[data-action="break-start"]');
    const breakEndBtn = document.querySelector('[data-action="break-end"]');
    
    if (AppState.workStatus === 'working') {
        // 勤務中：休憩入が有効、休憩終が無効
        if (breakStartBtn) breakStartBtn.disabled = false;
        if (breakEndBtn) breakEndBtn.disabled = true;
    } else if (AppState.workStatus === 'onBreak') {
        // 休憩中：休憩入が無効、休憩終が有効
        if (breakStartBtn) breakStartBtn.disabled = true;
        if (breakEndBtn) breakEndBtn.disabled = false;
    }
    
    // 従業員名を更新
    const employeeNameEl = document.querySelector('#break-clock-screen .employee-name');
    if (employeeNameEl && AppState.currentUser) {
        employeeNameEl.textContent = AppState.currentUser.name;
    }
}

// ヘルプモードのクラスを追加
function addHelpModeClass(screenId) {
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('help-mode');
    }
}

// ヘルプモードのクラスを削除
function removeHelpModeClass() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('help-mode');
    });
}

// 管理者パスワードの検証
function verifyAdminPassword() {
    const passwordInput = document.getElementById('admin-password-input');
    const errorMsg = document.getElementById('admin-password-error');
    const correctPassword = '2939';
    
    if (!passwordInput || !errorMsg) return;
    
    const inputPassword = passwordInput.value.trim();
    
    if (inputPassword === correctPassword) {
        // パスワードが正しい場合、管理者メニューへ遷移
        errorMsg.style.display = 'none';
        passwordInput.value = '';
        showScreen('admin-menu-screen');
        
        // メンバー管理画面の初期化
        if (typeof initMemberManagement === 'function') {
            setTimeout(function() {
                initMemberManagement();
            }, 100);
        }
    } else {
        // パスワードが間違っている場合、エラーメッセージを表示
        errorMsg.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
    }
}