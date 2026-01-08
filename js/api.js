// KINTAIKUN v2.0 - Server Edition (2024-11-17)
// api.js - API通信用の共通関数

// APIのベースURL（環境に応じて変更してください）
const API_BASE_URL = 'api'; // 相対パス

/**
 * API通信の共通関数
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * 出勤打刻
 */
async function apiClockIn(employeeId, workType, helpStore = null) {
    return await apiRequest('/clock-in.php', 'POST', {
        employee_id: employeeId,
        work_type: workType,
        help_store: helpStore
    });
}

/**
 * 休憩開始
 */
async function apiBreakStart(employeeId) {
    return await apiRequest('/break-start.php', 'POST', {
        employee_id: employeeId
    });
}

/**
 * 休憩終了
 */
async function apiBreakEnd(employeeId) {
    return await apiRequest('/break-end.php', 'POST', {
        employee_id: employeeId
    });
}

/**
 * 退勤打刻
 */
async function apiClockOut(employeeId) {
    return await apiRequest('/clock-out.php', 'POST', {
        employee_id: employeeId
    });
}

/**
 * 勤務状態取得
 */
async function apiGetWorkStatus(employeeId) {
    return await apiRequest(`/work-status.php?employee_id=${employeeId}`, 'GET');
}

/**
 * 日付別勤怠データ取得（店舗IDまたはプレフィックスでフィルタ可能）
 */
async function apiGetAttendanceByDate(date, storeId = null, prefix = null) {
    let url = `/attendance-by-date.php?date=${date}`;
    if (prefix) {
        url += `&prefix=${prefix}`;
    } else if (storeId) {
        url += `&store_id=${storeId}`;
    }
    return await apiRequest(url, 'GET');
}

/**
 * 勤怠データ一覧取得（日付範囲と従業員ID、店舗ID、プレフィックスでフィルタリング）
 */
async function apiGetAttendanceList(startDate, endDate, employeeId = null, storeId = null, prefix = null) {
    let url = `/attendance-list.php?start_date=${startDate}&end_date=${endDate}`;
    if (employeeId) {
        url += `&employee_id=${employeeId}`;
    }
    if (prefix) {
        url += `&prefix=${prefix}`;
    } else if (storeId) {
        url += `&store_id=${storeId}`;
    }
    return await apiRequest(url, 'GET');
}

/**
 * 従業員情報取得
 */
async function apiGetEmployee(employeeId) {
    return await apiRequest(`/employees.php?employee_id=${employeeId}`, 'GET');
}

/**
 * 全従業員リスト取得（プレフィックスまたは店舗IDでフィルタ）
 */
async function apiGetAllEmployees(storeId = null, prefix = null) {
    let url = '/employees.php';
    let params = [];
    if (prefix) {
        params.push(`prefix=${prefix}`);
    } else if (storeId) {
        params.push(`store_id=${storeId}`);
    }
    if (params.length > 0) {
        url += '?' + params.join('&');
    }
    return await apiRequest(url, 'GET');
}

/**
 * 従業員追加（店舗ID付き）
 */
async function apiAddEmployee(employeeId, employeeName, hourlyWage = 0, storeId = null) {
    return await apiRequest('/employee-management.php', 'POST', {
        employee_id: employeeId,
        employee_name: employeeName,
        hourly_wage: hourlyWage,
        store_id: storeId
    });
}

/**
 * 従業員更新
 */
async function apiUpdateEmployee(employeeId, employeeName, hourlyWage = null) {
    const data = {
        employee_id: employeeId,
        employee_name: employeeName
    };
    if (hourlyWage !== null) {
        data.hourly_wage = hourlyWage;
    }
    return await apiRequest('/employee-management.php', 'PUT', data);
}

/**
 * 従業員削除
 */
async function apiDeleteEmployee(employeeId) {
    return await apiRequest('/employee-management.php', 'DELETE', {
        employee_id: employeeId
    });
}

/**
 * 店舗ログイン認証
 */
async function apiLogin(loginId, password) {
    return await apiRequest('/login.php', 'POST', {
        login_id: loginId,
        password: password
    });
}

/**
 * 勤怠編集データを保存
 */
async function apiSaveAttendanceEdit(data) {
    return await apiRequest('/attendance-edit.php', 'POST', data);
}

/**
 * ヘルプ勤怠データを取得（所属店舗の従業員が行ったヘルプ）
 */
async function apiGetHelpAttendance(startDate, endDate, homeStoreId = null, helpStoreId = null, prefix = null, employeeId = null) {
    let url = `/help-attendance.php?start_date=${startDate}&end_date=${endDate}`;
    if (employeeId) {
        url += `&employee_id=${employeeId}`;
    } else if (prefix) {
        url += `&prefix=${prefix}`;
    } else if (homeStoreId) {
        url += `&home_store_id=${homeStoreId}`;
    }
    if (helpStoreId) {
        url += `&help_store_id=${helpStoreId}`;
    }
    return await apiRequest(url, 'GET');
}

/**
 * ヘルプ出勤打刻
 */
async function apiHelpClockIn(employeeId, helpStore) {
    return await apiRequest('/help-clock-in.php', 'POST', {
        employee_id: employeeId,
        help_store: helpStore
    });
}

/**
 * ヘルプ休憩開始
 */
async function apiHelpBreakStart(employeeId) {
    return await apiRequest('/help-break-start.php', 'POST', {
        employee_id: employeeId
    });
}

/**
 * ヘルプ休憩終了
 */
async function apiHelpBreakEnd(employeeId) {
    return await apiRequest('/help-break-end.php', 'POST', {
        employee_id: employeeId
    });
}

/**
 * ヘルプ退勤打刻
 */
async function apiHelpClockOut(employeeId) {
    return await apiRequest('/help-clock-out.php', 'POST', {
        employee_id: employeeId
    });
}

/**
 * ヘルプ勤務状態取得
 */
async function apiGetHelpWorkStatus(employeeId) {
    return await apiRequest(`/help-work-status.php?employee_id=${employeeId}`, 'GET');
}

/**
 * 勤怠データ削除
 */
async function apiDeleteAttendance(employeeId, workDate) {
    return await apiRequest('/attendance-delete.php', 'POST', {
        employee_id: employeeId,
        work_date: workDate
    });
}

/**
 * ヘルプ勤怠編集データを保存
 */
async function apiSaveHelpAttendanceEdit(data) {
    return await apiRequest('/help-attendance-edit.php', 'POST', data);
}

/**
 * ヘルプ勤怠データ削除
 */
async function apiDeleteHelpAttendance(employeeId, workDate) {
    return await apiRequest('/help-attendance-delete.php', 'POST', {
        employee_id: employeeId,
        work_date: workDate
    });
}
