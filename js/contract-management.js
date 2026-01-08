// contract-management.js - 契約管理機能

// 契約一覧データ
let contractList = [];

// 契約管理の初期化
function initContractManagement() {
    console.log('契約管理を初期化');
    
    // タブ切り替えイベント
    document.querySelectorAll('.contract-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchContractTab(this.dataset.tab);
        });
    });
    
    // 契約フォーム送信
    const contractForm = document.getElementById('contract-form');
    if (contractForm) {
        contractForm.addEventListener('submit', handleContractSubmit);
    }
    
    // 契約書プレビューリンク
    const previewLink = document.getElementById('preview-contract-link');
    if (previewLink) {
        previewLink.addEventListener('click', function(e) {
            e.preventDefault();
            showContractPreview();
        });
    }
    
    // 契約一覧を読み込み
    loadContractList();
}

// タブ切り替え
function switchContractTab(tabId) {
    // タブボタンのアクティブ切り替え
    document.querySelectorAll('.contract-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabId) {
            tab.classList.add('active');
        }
    });
    
    // コンテンツの表示切り替え
    document.querySelectorAll('.contract-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.style.display = 'block';
    }
}

// 契約一覧を読み込み
async function loadContractList() {
    try {
        const response = await fetch(`${config.apiBase}/contract.php?action=list`);
        const result = await response.json();
        
        if (result.success) {
            contractList = result.data || [];
            renderContractList();
        } else {
            console.error('契約一覧の取得に失敗:', result.message);
        }
    } catch (error) {
        console.error('契約一覧の取得エラー:', error);
    }
}

// 契約一覧を描画
function renderContractList() {
    const tbody = document.getElementById('contract-list-tbody');
    const countEl = document.getElementById('contract-total-count');
    
    if (!tbody) return;
    
    if (countEl) {
        countEl.textContent = contractList.length;
    }
    
    if (contractList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">契約データがありません</td></tr>';
        return;
    }
    
    tbody.innerHTML = contractList.map(contract => `
        <tr data-id="${contract.id}">
            <td>${formatDate(contract.contract_date)}</td>
            <td>${escapeHtml(contract.company_name)}</td>
            <td>${getPlanName(contract.plan)}</td>
            <td><span class="status-badge status-${contract.status}">${getStatusName(contract.status)}</span></td>
            <td>
                <button class="btn btn-small btn-view" onclick="viewContract(${contract.id})">詳細</button>
                <button class="btn btn-small btn-pdf" onclick="downloadContract(${contract.id})">PDF</button>
            </td>
        </tr>
    `).join('');
}

// 契約フォーム送信
async function handleContractSubmit(e) {
    e.preventDefault();
    
    const agreeCheckbox = document.getElementById('contract-agree');
    if (!agreeCheckbox.checked) {
        alert('契約内容への同意が必要です');
        return;
    }
    
    const formData = {
        company_name: document.getElementById('contract-company-name').value,
        address: document.getElementById('contract-address').value,
        representative: document.getElementById('contract-representative').value,
        email: document.getElementById('contract-email').value,
        phone: document.getElementById('contract-phone').value || '',
        plan: document.querySelector('input[name="contract-plan"]:checked').value,
        agreed_at: new Date().toISOString(),
        ip_address: '', // サーバー側で取得
        user_agent: navigator.userAgent
    };
    
    try {
        const response = await fetch(`${config.apiBase}/contract.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'create',
                data: formData
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('契約を登録しました。確認メールを送信しました。');
            // フォームリセット
            document.getElementById('contract-form').reset();
            // 一覧に切り替え
            switchContractTab('contract-list');
            // 一覧を再読み込み
            loadContractList();
        } else {
            alert('エラー: ' + result.message);
        }
    } catch (error) {
        console.error('契約登録エラー:', error);
        alert('契約の登録に失敗しました');
    }
}

// 契約詳細を表示
async function viewContract(contractId) {
    try {
        const response = await fetch(`${config.apiBase}/contract.php?action=get&id=${contractId}`);
        const result = await response.json();
        
        if (result.success) {
            showContractDetail(result.data);
        } else {
            alert('契約情報の取得に失敗しました');
        }
    } catch (error) {
        console.error('契約詳細取得エラー:', error);
    }
}

// 契約詳細モーダル表示
function showContractDetail(contract) {
    const modal = document.getElementById('contract-preview-modal');
    const iframe = document.getElementById('contract-preview-iframe');
    
    if (modal && iframe) {
        // 契約情報を含むHTMLを生成
        iframe.srcdoc = generateContractHTML(contract);
        modal.style.display = 'flex';
    }
}

// 契約書プレビュー表示
function showContractPreview() {
    const modal = document.getElementById('contract-preview-modal');
    const iframe = document.getElementById('contract-preview-iframe');
    
    if (modal && iframe) {
        // 空のテンプレートを表示
        iframe.srcdoc = generateContractHTML({
            company_name: document.getElementById('contract-company-name').value || '（会社名）',
            address: document.getElementById('contract-address').value || '（住所）',
            representative: document.getElementById('contract-representative').value || '（代表者）',
            contract_date: new Date().toISOString()
        });
        modal.style.display = 'flex';
    }
}

// 契約書HTMLを生成
function generateContractHTML(contract) {
    const contractDate = contract.contract_date ? new Date(contract.contract_date) : new Date();
    const year = contractDate.getFullYear() - 2018; // 令和換算
    const month = contractDate.getMonth() + 1;
    const day = contractDate.getDate();
    
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>契約書</title>
    <style>
        body {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-family: 'Times New Roman', serif;
            line-height: 1.8;
            color: #000;
            background: white;
        }
        .contract-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 30px 0;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
        }
        .contract-date {
            text-align: right;
            margin: 20px 0;
        }
        .party-info {
            margin: 20px 0;
            border: 1px solid #000;
            padding: 15px;
        }
        .article {
            margin: 20px 0;
        }
        .article-title {
            font-weight: bold;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        .article-content {
            margin-left: 20px;
        }
        .signature-box {
            border: 1px solid #000;
            padding: 20px;
            margin: 20px 0;
            min-height: 100px;
        }
        .agreement-stamp {
            text-align: center;
            padding: 20px;
            background: #f0f0f0;
            border: 2px solid #333;
            margin: 30px 0;
        }
    </style>
</head>
<body>
    <h1 class="contract-title">勤怠KUN-PREMIUM-<br>サブスクリプションサービス利用契約書</h1>
    
    <div class="contract-date">
        契約締結日：令和${year}年${month}月${day}日
    </div>
    
    <p>甲および乙は、完全オーダーメイド勤怠管理アプリ「勤怠KUN-PREMIUM-」のサブスクリプションサービスの利用について、以下のとおり契約を締結する。</p>
    
    <div class="party-info">
        <strong>甲（サービス提供者）</strong><br>
        Sound Ripple<br>
        〒104-0061<br>
        東京都中央区銀座1-22-11　銀座大竹ビジデンス2F
    </div>
    
    <div class="party-info">
        <strong>乙（契約者・利用者）</strong><br>
        住所：${escapeHtml(contract.address || '')}<br>
        氏名：${escapeHtml(contract.company_name || '')}　${escapeHtml(contract.representative || '')}
    </div>
    
    <div class="article">
        <div class="article-title">第1条（契約の目的）</div>
        <div class="article-content">
            本契約は、甲が提供する勤怠管理アプリ「勤怠KUN-PREMIUM-」のサブスクリプションサービスの利用条件について定めることを目的とする。
        </div>
    </div>
    
    <div class="article">
        <div class="article-title">第2条（サービス内容）</div>
        <div class="article-content">
            甲は、乙に対して以下のサービスを提供する。<br>
            1. 完全オーダーメイド勤怠管理アプリの提供<br>
            2. アプリケーション管理<br>
            3. 技術サポート・トラブル対応<br>
            4. データバックアップ・セキュリティ管理<br>
            5. ユーザーサポート<br>
            6. 機能改善・カスタマイズ対応（別途見積もり）
        </div>
    </div>
    
    <div class="article">
        <div class="article-title">第3条（料金プラン）</div>
        <div class="article-content">
            選択プラン：<strong>${getPlanName(contract.plan || 'store-monthly')}</strong>
        </div>
    </div>
    
    <!-- 以下省略 -->
    
    ${contract.agreed_at ? `
    <div class="agreement-stamp">
        <strong>電子署名情報</strong><br>
        同意日時：${new Date(contract.agreed_at).toLocaleString('ja-JP')}<br>
        ${contract.ip_address ? `IPアドレス：${contract.ip_address}<br>` : ''}
        署名ハッシュ：${contract.signature_hash || '未生成'}
    </div>
    ` : ''}
    
    <div class="signature-box">
        <strong>甲（サービス提供者）</strong><br>
        Sound Ripple<br>
        代表者氏名：吉留礼美
    </div>
    
    <div class="signature-box">
        <strong>乙（契約者）</strong><br>
        ${escapeHtml(contract.company_name || '')}<br>
        代表者：${escapeHtml(contract.representative || '')}
    </div>
</body>
</html>
    `;
}

// 契約書プレビューを閉じる
function closeContractPreview() {
    const modal = document.getElementById('contract-preview-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 契約書PDFダウンロード
function downloadContractPDF() {
    const iframe = document.getElementById('contract-preview-iframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.print();
    }
}

// 個別契約のPDFダウンロード
async function downloadContract(contractId) {
    try {
        const response = await fetch(`${config.apiBase}/contract.php?action=get&id=${contractId}`);
        const result = await response.json();
        
        if (result.success) {
            const iframe = document.getElementById('contract-preview-iframe');
            const modal = document.getElementById('contract-preview-modal');
            
            if (iframe && modal) {
                iframe.srcdoc = generateContractHTML(result.data);
                modal.style.display = 'flex';
                
                // 少し待ってから印刷ダイアログを開く
                setTimeout(() => {
                    iframe.contentWindow.print();
                }, 500);
            }
        }
    } catch (error) {
        console.error('契約PDF生成エラー:', error);
    }
}

// ユーティリティ関数
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

function getPlanName(plan) {
    const plans = {
        'store-monthly': '店舗単位（月額）',
        'store-yearly': '店舗単位（年額）',
        'employee-monthly': '従業員単位（月額）',
        'employee-yearly': '従業員単位（年額）'
    };
    return plans[plan] || plan;
}

function getStatusName(status) {
    const statuses = {
        'active': '有効',
        'pending': '確認中',
        'expired': '期限切れ',
        'cancelled': '解約済'
    };
    return statuses[status] || status;
}

// admin専用メニューの表示制御
function showContractManagementMenu() {
    // 全画面のサイドバーに契約管理メニューを追加（admin専用）
    if (AppState.currentUser && AppState.currentUser.isAdmin) {
        document.querySelectorAll('.admin-sidebar').forEach(sidebar => {
            // 既に追加済みかチェック
            if (!sidebar.querySelector('[data-action="goto-contract-management"]')) {
                const menuItem = document.createElement('div');
                menuItem.className = 'sidebar-item';
                menuItem.setAttribute('data-action', 'goto-contract-management');
                menuItem.innerHTML = '<span class="sidebar-icon">📄</span><span>契約管理</span>';
                sidebar.appendChild(menuItem);
            }
        });
    }
}
