// attendance-check.js - 勤怠確認画面の機能（サーバー版 - データベース対応）


// フィルター条件を保持
let currentFilter = {
    filterType: 'employee', // 'employee' または 'all'
    employeeId: '',
    startDate: null,
    endDate: null
};

// カレンダー表示状態
let calendarVisible = false;
let selectedDate = new Date();

// 勤怠確認画面の初期化
function initAttendanceCheck() {
    console.log('勤怠確認画面の初期化');
    
    // イベントリスナーの設定
    setupAttendanceCheckListeners();
    
    // 今日の日付を初期値として設定
    const today = new Date();
    currentFilter.startDate = formatDate(today);
    currentFilter.endDate = formatDate(today);
    updateDatePickerInput();
    
    // 「今日」ボタンをアクティブにする - attendance-check-screen内のボタンのみ対象
    const periodButtons = document.querySelectorAll('#attendance-check-screen .btn-period');
    periodButtons.forEach(btn => btn.classList.remove('active'));
    const todayBtn = document.querySelector('#attendance-check-screen .btn-period[data-period="today"]');
    if (todayBtn) {
        todayBtn.classList.add('active');
    }
    
    // 初期データを表示
    filterAndDisplayData();
}

// イベントリスナーの設定
function setupAttendanceCheckListeners() {
    // ラジオボタンの変更
    const radioButtons = document.querySelectorAll('input[name="filter-type"]');
    radioButtons.forEach(radio => {
        // 既存のイベントリスナーを削除
        radio.removeEventListener('change', handleFilterTypeChange);
        radio.addEventListener('change', handleFilterTypeChange);
    });
    
    // 従業員ID入力フィールド
    const employeeIdInput = document.getElementById('filter-employee-id');
    if (employeeIdInput) {
        employeeIdInput.removeEventListener('input', handleEmployeeIdInput);
        employeeIdInput.addEventListener('input', handleEmployeeIdInput);
    }
    
    // カレンダーボタン
    const calendarBtn = document.getElementById('show-calendar-btn');
    if (calendarBtn) {
        calendarBtn.removeEventListener('click', toggleCalendar);
        calendarBtn.addEventListener('click', toggleCalendar);
    }
    
    // 表示ボタン
    const displayBtn = document.getElementById('display-btn');
    if (displayBtn) {
        displayBtn.removeEventListener('click', filterAndDisplayData);
        displayBtn.addEventListener('click', filterAndDisplayData);
    }
    
    // 期間ボタン - attendance-check-screen内のボタンのみ対象
    const periodButtons = document.querySelectorAll('#attendance-check-screen .btn-period');
    periodButtons.forEach(btn => {
        btn.removeEventListener('click', handlePeriodButtonClick);
        btn.addEventListener('click', handlePeriodButtonClick);
    });
}

// イベントハンドラー関数を定義
function handleFilterTypeChange(e) {
    currentFilter.filterType = this.value;
    const employeeIdInput = document.getElementById('filter-employee-id');
    
    if (this.value === 'all') {
        employeeIdInput.disabled = true;
        employeeIdInput.value = '';
        currentFilter.employeeId = '';
    } else {
        employeeIdInput.disabled = false;
        employeeIdInput.focus();
    }
}

function handleEmployeeIdInput(e) {
    currentFilter.employeeId = this.value;
}

function handlePeriodButtonClick(e) {
    const button = e.currentTarget;
    const period = button.getAttribute('data-period');
    setPeriod(period);
    filterAndDisplayData();
    
    // アクティブ状態の切り替え - attendance-check-screen内のボタンのみ対象
    const periodButtons = document.querySelectorAll('#attendance-check-screen .btn-period');
    periodButtons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
}

// 期間を設定
function setPeriod(period) {
    const today = new Date();
    let startDate, endDate;
    
    switch(period) {
        case 'today':
            startDate = new Date(today);
            endDate = new Date(today);
            break;
            
        case 'this-week':
            // 今週の月曜日から日曜日
            const dayOfWeek = today.getDay();
            const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜日からの差
            startDate = new Date(today);
            startDate.setDate(today.getDate() - diff);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            break;
            
        case 'prev-week':
            // 先週の月曜日から日曜日
            const prevWeekStart = new Date(today);
            const dayOfWeek2 = today.getDay();
            const diff2 = dayOfWeek2 === 0 ? 6 : dayOfWeek2 - 1;
            prevWeekStart.setDate(today.getDate() - diff2 - 7);
            startDate = prevWeekStart;
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            break;
            
        case 'this-month':
            // 今月の1日から末日
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
            
        case 'prev-month':
            // 先月の1日から末日
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
    }
    
    currentFilter.startDate = formatDate(startDate);
    currentFilter.endDate = formatDate(endDate);
    updateDatePickerInput();
}

// カレンダーの表示/非表示を切り替え
function toggleCalendar(e) {
    if (e) {
        e.stopPropagation();
    }
    
    // 既存のカレンダーを全て削除
    const existingCalendars = document.querySelectorAll('.custom-calendar');
    existingCalendars.forEach(cal => cal.remove());
    
    calendarVisible = !calendarVisible;
    
    if (calendarVisible) {
        showCalendar();
    }
}

// カレンダーを表示
function showCalendar() {
    // 念のため既存のカレンダーを全て削除
    const existingCalendars = document.querySelectorAll('.custom-calendar');
    existingCalendars.forEach(cal => cal.remove());
    
    const calendarDiv = document.createElement('div');
    calendarDiv.className = 'custom-calendar';
    calendarDiv.innerHTML = generateCalendarHTML();
    
    // カレンダーボタンの近くに配置
    const calendarBtn = document.getElementById('show-calendar-btn');
    const btnRect = calendarBtn.getBoundingClientRect();
    calendarDiv.style.position = 'absolute';
    calendarDiv.style.top = (btnRect.bottom + window.scrollY + 10) + 'px';
    calendarDiv.style.left = btnRect.left + 'px';
    calendarDiv.style.zIndex = '1000';
    
    document.body.appendChild(calendarDiv);
    
    // カレンダー内のイベントリスナー
    setupCalendarListeners();
    
    // 外側をクリックしたら閉じる
    setTimeout(() => {
        document.addEventListener('click', closeCalendarOnOutsideClick, { once: true });
    }, 100);
}

// カレンダーを非表示
function hideCalendar() {
    const calendars = document.querySelectorAll('.custom-calendar');
    calendars.forEach(cal => cal.remove());
    calendarVisible = false;
    document.removeEventListener('click', closeCalendarOnOutsideClick);
}

// カレンダー外をクリックしたら閉じる
function closeCalendarOnOutsideClick(e) {
    const calendar = document.querySelector('.custom-calendar');
    const calendarBtn = document.getElementById('show-calendar-btn');
    
    if (calendar && !calendar.contains(e.target) && e.target !== calendarBtn) {
        hideCalendar();
    }
}

// カレンダーのHTMLを生成
function generateCalendarHTML() {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();
    
    let html = `
        <div class="calendar-header">
            <button class="calendar-nav-btn" id="prev-month-btn">◀</button>
            <div class="calendar-title">${year}年 ${month + 1}月</div>
            <button class="calendar-nav-btn" id="next-month-btn">▶</button>
        </div>
        <div class="calendar-weekdays">
            <div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div>
        </div>
        <div class="calendar-days">
    `;
    
    // 前月の日付
    const startDay = firstDayOfWeek === 0 ? 0 : firstDayOfWeek;
    for (let i = startDay - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        html += `<div class="calendar-day prev-month">${day}</div>`;
    }
    
    // 今月の日付
    const today = new Date();
    for (let day = 1; day <= lastDate; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const isToday = dateStr === formatDate(today);
        const isSelected = dateStr === currentFilter.startDate;
        
        let className = 'calendar-day';
        if (isToday) className += ' today';
        if (isSelected) className += ' selected';
        
        html += `<div class="${className}" data-date="${dateStr}">${day}</div>`;
    }
    
    // 次月の日付（カレンダーを埋める）
    const totalCells = startDay + lastDate;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="calendar-day next-month">${day}</div>`;
    }
    
    html += '</div>';
    
    return html;
}

// カレンダーのイベントリスナー設定
function setupCalendarListeners() {
    // 前月ボタン
    const prevBtn = document.getElementById('prev-month-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            selectedDate.setMonth(selectedDate.getMonth() - 1);
            showCalendar();
        });
    }
    
    // 次月ボタン
    const nextBtn = document.getElementById('next-month-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            selectedDate.setMonth(selectedDate.getMonth() + 1);
            showCalendar();
        });
    }
    
    // 日付クリック
    const dayElements = document.querySelectorAll('.calendar-day:not(.prev-month):not(.next-month)');
    dayElements.forEach(day => {
        day.addEventListener('click', function(e) {
            e.stopPropagation();
            const dateStr = this.getAttribute('data-date');
            if (dateStr) {
                currentFilter.startDate = dateStr;
                currentFilter.endDate = dateStr;
                updateDatePickerInput();
                hideCalendar();
                calendarVisible = false;
                
                // 選択した日付を表示
                filterAndDisplayData();
            }
        });
    });
}

// 日付入力フィールドを更新
function updateDatePickerInput() {
    const input = document.getElementById('date-picker-input');
    if (input && currentFilter.startDate) {
        if (currentFilter.startDate === currentFilter.endDate) {
            input.value = formatDateJapanese(currentFilter.startDate);
        } else {
            input.value = `${formatDateJapanese(currentFilter.startDate)} 〜 ${formatDateJapanese(currentFilter.endDate)}`;
        }
    }
}

// データをフィルタリングして表示

// データをフィルタリングして表示
async function filterAndDisplayData() {
    console.log('フィルター条件:', currentFilter);
    
    try {
        // 従業員IDの取得
        let employeeId = null;
        let prefix = null;
        
        if (currentFilter.filterType === 'employee' && currentFilter.employeeId) {
            employeeId = currentFilter.employeeId;
        } else {
            // 「全員」の場合は選択中の店舗プレフィックスでフィルタ
            prefix = typeof getSelectedStorePrefix === 'function' ? getSelectedStorePrefix() : null;
        }
        
        // APIからデータを取得
        const response = await apiGetAttendanceList(
            currentFilter.startDate,
            currentFilter.endDate,
            employeeId,
            null,
            prefix
        );
        
        if (!response.success || !response.data) {
            console.error('データ取得失敗:', response.message);
            displayAttendanceTable([]);
            return;
        }
        
        const data = response.data;
        console.log('取得データ:', data.length + '件');
        
        displayAttendanceTable(data);
        
    } catch (error) {
        console.error('データ取得エラー:', error);
        displayAttendanceTable([]);
    }
}

// テーブルにデータを表示
function displayAttendanceTable(data) {
    const tbody = document.getElementById('attendance-table-body');
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">データがありません</td></tr>';
        return;
    }
    
    let html = '';
    data.forEach(record => {
        const breakStatus = record.is_on_break ? '休憩中' : '-';
        const clockOut = record.clock_out || '勤務中';
        
        html += `
            <tr>
                <td>${formatDateJapanese(record.date)}</td>
                <td>${record.employee_name}</td>
                <td>${record.clock_in || '-'}</td>
                <td>${clockOut}</td>
                <td>${record.break_count}</td>
                <td>${record.total_break}</td>
                <td>${record.work_hours}</td>
                <td>${breakStatus}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// 日付をフォーマット (YYYY-MM-DD)
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 日付を日本語形式でフォーマット
function formatDateJapanese(dateStr) {
    if (!dateStr) return '';
    
    // ハイフンまたはスラッシュで分割
    let parts;
    if (dateStr.includes('-')) {
        parts = dateStr.split('-');
    } else if (dateStr.includes('/')) {
        parts = dateStr.split('/');
    } else {
        return dateStr; // 分割できない場合はそのまま返す
    }
    
    const [year, month, day] = parts;
    if (!year || !month || !day) return dateStr;
    
    return `${year}年${parseInt(month)}月${parseInt(day)}日`;
}

// 画面が表示されたときに初期化
document.addEventListener('DOMContentLoaded', function() {
    // 勤怠確認画面に遷移したときの初期化
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.id === 'attendance-check-screen' && mutation.target.classList.contains('active')) {
                console.log('勤怠確認画面がアクティブになりました');
                initAttendanceCheck();
            }
        });
    });
    
    const attendanceScreen = document.getElementById('attendance-check-screen');
    if (attendanceScreen) {
        observer.observe(attendanceScreen, { attributes: true, attributeFilter: ['class'] });
        
        // 既にアクティブな場合は即座に初期化
        if (attendanceScreen.classList.contains('active')) {
            console.log('勤怠確認画面が既にアクティブです');
            initAttendanceCheck();
        }
    }
});
