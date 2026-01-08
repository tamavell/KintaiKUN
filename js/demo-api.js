// ============================================
// KINTAIKUN Demo Mode - Mock API
// LocalStorageを使用したフロントエンドのみで動作するデモ版
// ============================================

const DEMO_MODE = true;

// ============================================
// 初期サンプルデータ
// ============================================
const DEMO_STORES = {
    'demo': {
        id: 'demo',
        name: 'デモ店',
        prefix: 'D',
        password: 'demo1234',
        isAdmin: false
    },
    'admin': {
        id: 'admin', 
        name: '管理本部',
        prefix: 'A',
        password: 'admin1234',
        isAdmin: true
    }
};

const INITIAL_EMPLOYEES = [
    { employee_id: 'D001', employee_name: '山田 太郎', hourly_wage: 1100, store_id: 'demo' },
    { employee_id: 'D002', employee_name: '佐藤 花子', hourly_wage: 1050, store_id: 'demo' },
    { employee_id: 'D003', employee_name: '鈴木 一郎', hourly_wage: 1200, store_id: 'demo' },
    { employee_id: 'D004', employee_name: '田中 美咲', hourly_wage: 1000, store_id: 'demo' },
    { employee_id: 'D005', employee_name: '高橋 健太', hourly_wage: 1150, store_id: 'demo' }
];

// 過去7日分のサンプル勤怠データを生成
function generateSampleAttendance() {
    const attendance = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // 各従業員のランダムな勤怠
        INITIAL_EMPLOYEES.forEach((emp, index) => {
            if (Math.random() > 0.3) { // 70%の確率で出勤
                const clockInHour = 9 + Math.floor(Math.random() * 3);
                const clockOutHour = 17 + Math.floor(Math.random() * 3);
                
                attendance.push({
                    id: attendance.length + 1,
                    employee_id: emp.employee_id,
                    work_date: dateStr,
                    clock_in: `${String(clockInHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
                    clock_out: `${String(clockOutHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
                    work_type: 'regular',
                    help_store: null,
                    breaks: Math.random() > 0.5 ? [{
                        break_start: '12:00:00',
                        break_end: '13:00:00'
                    }] : []
                });
            }
        });
    }
    
    return attendance;
}

// ============================================
// LocalStorage 操作
// ============================================
const STORAGE_KEYS = {
    EMPLOYEES: 'kintaikun_demo_employees',
    ATTENDANCE: 'kintaikun_demo_attendance',
    BREAKS: 'kintaikun_demo_breaks',
    INITIALIZED: 'kintaikun_demo_initialized'
};

function initializeDemoData() {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(generateSampleAttendance()));
        localStorage.setItem(STORAGE_KEYS.BREAKS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        console.log('📦 デモデータを初期化しました');
    }
}

function getEmployees() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]');
}

function setEmployees(employees) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
}

function getAttendance() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
}

function setAttendance(attendance) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
}

function resetDemoData() {
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.BREAKS);
    initializeDemoData();
    console.log('🔄 デモデータをリセットしました');
}

// ============================================
// Mock API Functions
// ============================================

async function apiLogin(loginId, password) {
    await simulateDelay();
    
    const store = DEMO_STORES[loginId];
    if (store && store.password === password) {
        return {
            success: true,
            data: {
                store_id: store.id,
                store_name: store.name,
                employee_prefix: store.prefix
            }
        };
    }
    
    throw new Error('ログインIDまたはパスワードが正しくありません');
}

async function apiGetEmployee(employeeId) {
    await simulateDelay();
    
    const employees = getEmployees();
    const employee = employees.find(e => e.employee_id === employeeId);
    
    if (employee) {
        return {
            success: true,
            data: employee
        };
    }
    
    throw new Error('従業員が見つかりません');
}

async function apiGetAllEmployees(storeId = null, prefix = null) {
    await simulateDelay();
    
    let employees = getEmployees();
    
    if (prefix) {
        employees = employees.filter(e => e.employee_id.startsWith(prefix));
    } else if (storeId) {
        employees = employees.filter(e => e.store_id === storeId);
    }
    
    return {
        success: true,
        data: employees
    };
}

async function apiClockIn(employeeId, workType = 'regular', helpStore = null) {
    await simulateDelay();
    
    const attendance = getAttendance();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    
    // 既存の勤怠をチェック
    const existing = attendance.find(a => a.employee_id === employeeId && a.work_date === today);
    if (existing && existing.clock_in) {
        throw new Error('本日は既に出勤打刻済みです');
    }
    
    const newAttendance = {
        id: attendance.length + 1,
        employee_id: employeeId,
        work_date: today,
        clock_in: timeStr,
        clock_out: null,
        work_type: workType,
        help_store: helpStore,
        breaks: []
    };
    
    attendance.push(newAttendance);
    setAttendance(attendance);
    
    return {
        success: true,
        message: '出勤を記録しました',
        data: {
            clock_in: timeStr
        }
    };
}

async function apiClockOut(employeeId) {
    await simulateDelay();
    
    const attendance = getAttendance();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    
    const record = attendance.find(a => a.employee_id === employeeId && a.work_date === today);
    if (!record) {
        throw new Error('本日の出勤記録がありません');
    }
    
    if (record.clock_out) {
        throw new Error('本日は既に退勤打刻済みです');
    }
    
    record.clock_out = timeStr;
    setAttendance(attendance);
    
    return {
        success: true,
        message: '退勤を記録しました',
        data: {
            clock_out: timeStr
        }
    };
}

async function apiBreakStart(employeeId) {
    await simulateDelay();
    
    const attendance = getAttendance();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    
    const record = attendance.find(a => a.employee_id === employeeId && a.work_date === today);
    if (!record) {
        throw new Error('本日の出勤記録がありません');
    }
    
    if (!record.breaks) record.breaks = [];
    
    // 未終了の休憩があるかチェック
    const ongoingBreak = record.breaks.find(b => !b.break_end);
    if (ongoingBreak) {
        throw new Error('既に休憩中です');
    }
    
    record.breaks.push({
        break_start: timeStr,
        break_end: null
    });
    setAttendance(attendance);
    
    return {
        success: true,
        message: '休憩開始を記録しました',
        data: {
            break_start: timeStr
        }
    };
}

async function apiBreakEnd(employeeId) {
    await simulateDelay();
    
    const attendance = getAttendance();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    
    const record = attendance.find(a => a.employee_id === employeeId && a.work_date === today);
    if (!record || !record.breaks) {
        throw new Error('休憩記録がありません');
    }
    
    const ongoingBreak = record.breaks.find(b => !b.break_end);
    if (!ongoingBreak) {
        throw new Error('休憩中ではありません');
    }
    
    ongoingBreak.break_end = timeStr;
    setAttendance(attendance);
    
    return {
        success: true,
        message: '休憩終了を記録しました',
        data: {
            break_end: timeStr
        }
    };
}

async function apiGetWorkStatus(employeeId) {
    await simulateDelay();
    
    const attendance = getAttendance();
    const today = new Date().toISOString().split('T')[0];
    
    const record = attendance.find(a => a.employee_id === employeeId && a.work_date === today);
    
    if (!record || !record.clock_in) {
        return {
            success: true,
            data: {
                status: 'not_started',
                clock_in: null,
                clock_out: null,
                on_break: false
            }
        };
    }
    
    if (record.clock_out) {
        return {
            success: true,
            data: {
                status: 'finished',
                clock_in: record.clock_in,
                clock_out: record.clock_out,
                on_break: false
            }
        };
    }
    
    const onBreak = record.breaks && record.breaks.some(b => b.break_start && !b.break_end);
    
    return {
        success: true,
        data: {
            status: onBreak ? 'on_break' : 'working',
            clock_in: record.clock_in,
            clock_out: null,
            on_break: onBreak,
            breaks: record.breaks || []
        }
    };
}

async function apiGetAttendanceByDate(date, storeId = null, prefix = null) {
    await simulateDelay();
    
    const attendance = getAttendance();
    const employees = getEmployees();
    
    let filtered = attendance.filter(a => a.work_date === date);
    
    if (prefix) {
        filtered = filtered.filter(a => a.employee_id.startsWith(prefix));
    } else if (storeId) {
        const storeEmployeeIds = employees.filter(e => e.store_id === storeId).map(e => e.employee_id);
        filtered = filtered.filter(a => storeEmployeeIds.includes(a.employee_id));
    }
    
    // 従業員情報を付加
    const result = filtered.map(a => {
        const emp = employees.find(e => e.employee_id === a.employee_id);
        return {
            ...a,
            employee_name: emp ? emp.employee_name : '不明',
            hourly_wage: emp ? emp.hourly_wage : 0
        };
    });
    
    return {
        success: true,
        data: result
    };
}

async function apiGetAttendanceList(startDate, endDate, employeeId = null, storeId = null, prefix = null) {
    await simulateDelay();
    
    const attendance = getAttendance();
    const employees = getEmployees();
    
    let filtered = attendance.filter(a => {
        const date = a.work_date;
        return date >= startDate && date <= endDate;
    });
    
    if (employeeId) {
        filtered = filtered.filter(a => a.employee_id === employeeId);
    } else if (prefix) {
        filtered = filtered.filter(a => a.employee_id.startsWith(prefix));
    } else if (storeId) {
        const storeEmployeeIds = employees.filter(e => e.store_id === storeId).map(e => e.employee_id);
        filtered = filtered.filter(a => storeEmployeeIds.includes(a.employee_id));
    }
    
    const result = filtered.map(a => {
        const emp = employees.find(e => e.employee_id === a.employee_id);
        return {
            ...a,
            employee_name: emp ? emp.employee_name : '不明',
            hourly_wage: emp ? emp.hourly_wage : 0
        };
    });
    
    return {
        success: true,
        data: result
    };
}

async function apiAddEmployee(employeeId, employeeName, hourlyWage = 0, storeId = null) {
    await simulateDelay();
    
    const employees = getEmployees();
    
    if (employees.find(e => e.employee_id === employeeId)) {
        throw new Error('この従業員IDは既に使用されています');
    }
    
    employees.push({
        employee_id: employeeId,
        employee_name: employeeName,
        hourly_wage: hourlyWage,
        store_id: storeId || 'demo'
    });
    
    setEmployees(employees);
    
    return {
        success: true,
        message: '従業員を追加しました'
    };
}

async function apiUpdateEmployee(employeeId, employeeName, hourlyWage = null) {
    await simulateDelay();
    
    const employees = getEmployees();
    const index = employees.findIndex(e => e.employee_id === employeeId);
    
    if (index === -1) {
        throw new Error('従業員が見つかりません');
    }
    
    employees[index].employee_name = employeeName;
    if (hourlyWage !== null) {
        employees[index].hourly_wage = hourlyWage;
    }
    
    setEmployees(employees);
    
    return {
        success: true,
        message: '従業員情報を更新しました'
    };
}

async function apiDeleteEmployee(employeeId) {
    await simulateDelay();
    
    let employees = getEmployees();
    employees = employees.filter(e => e.employee_id !== employeeId);
    setEmployees(employees);
    
    return {
        success: true,
        message: '従業員を削除しました'
    };
}

async function apiSaveAttendanceEdit(data) {
    await simulateDelay();
    
    const attendance = getAttendance();
    const index = attendance.findIndex(a => 
        a.employee_id === data.employee_id && a.work_date === data.work_date
    );
    
    if (index === -1) {
        // 新規作成
        attendance.push({
            id: attendance.length + 1,
            employee_id: data.employee_id,
            work_date: data.work_date,
            clock_in: data.clock_in,
            clock_out: data.clock_out,
            work_type: data.work_type || 'regular',
            help_store: null,
            breaks: data.breaks || []
        });
    } else {
        // 更新
        attendance[index] = {
            ...attendance[index],
            clock_in: data.clock_in,
            clock_out: data.clock_out,
            breaks: data.breaks || attendance[index].breaks
        };
    }
    
    setAttendance(attendance);
    
    return {
        success: true,
        message: '勤怠データを保存しました'
    };
}

async function apiDeleteAttendance(employeeId, workDate) {
    await simulateDelay();
    
    let attendance = getAttendance();
    attendance = attendance.filter(a => 
        !(a.employee_id === employeeId && a.work_date === workDate)
    );
    setAttendance(attendance);
    
    return {
        success: true,
        message: '勤怠データを削除しました'
    };
}

// ヘルプ勤務用API（デモ版では通常と同じ処理）
async function apiHelpClockIn(employeeId, helpStore) {
    return apiClockIn(employeeId, 'help', helpStore);
}

async function apiHelpBreakStart(employeeId) {
    return apiBreakStart(employeeId);
}

async function apiHelpBreakEnd(employeeId) {
    return apiBreakEnd(employeeId);
}

async function apiHelpClockOut(employeeId) {
    return apiClockOut(employeeId);
}

async function apiGetHelpWorkStatus(employeeId) {
    return apiGetWorkStatus(employeeId);
}

async function apiGetHelpAttendance(startDate, endDate, homeStoreId = null, helpStoreId = null, prefix = null, employeeId = null) {
    return apiGetAttendanceList(startDate, endDate, employeeId, homeStoreId, prefix);
}

async function apiSaveHelpAttendanceEdit(data) {
    return apiSaveAttendanceEdit(data);
}

async function apiDeleteHelpAttendance(employeeId, workDate) {
    return apiDeleteAttendance(employeeId, workDate);
}

// ============================================
// ユーティリティ
// ============================================
function simulateDelay(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeDemoData();
    console.log('🎮 デモモードで起動しました');
    console.log('📋 ログイン情報:');
    console.log('   店舗用: ID=demo, PW=demo1234');
    console.log('   管理者: ID=admin, PW=admin1234');
});
