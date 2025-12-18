
// Login
export const submitLogin = async (data) => {
    const url = import.meta.env.VITE_EMPLOYEE_SHEET_URL || import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) {
        throw new Error('Employee Sheet URL is not configured.');
    }

    // Google Apps Script Web App is best accessed via FormData to avoid CORS preflight
    // and ensure compatibility.
    const formBody = new FormData();
    formBody.append('action', 'login');
    for (const key in data) {
        formBody.append(key, data[key]);
    }

    const response = await fetch(url, {
        method: 'POST',
        body: formBody,
        // No headers needed, browser sets correct multipart/form-data boundary
    });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const text = await response.text();
    let result;
    try {
        result = JSON.parse(text);
    } catch (e) {
        console.error('Failed to parse backend response:', text);
        // Check if it's an HTML error page
        if (text.includes('<!DOCTYPE html>')) {
            throw new Error('Connection Error: The Google Sheet URL returned an HTML page instead of JSON. Check permissions or deployment URL.');
        }
        throw new Error('Invalid response from backend. Check console for details.');
    }

    if (result.result === 'error') {
        const errMsg = typeof result.error === 'object' ? JSON.stringify(result.error) : result.error;
        throw new Error(errMsg);
    }

    return result;
};

// Add stock to inventory
export const addStock = async (data) => {
    const url = import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) {
        throw new Error('Google Sheet URL is not configured.');
    }

    const formBody = new FormData();
    formBody.append('action', 'addStock');
    formBody.append('color', data.color);
    formBody.append('quantity', data.quantity);
    formBody.append('notes', data.notes || '');

    const response = await fetch(url, {
        method: 'POST',
        body: formBody,
    });

    if (!response.ok) {
        throw new Error('Failed to add stock');
    }

    return await response.json();
};

// Record stock usage
export const useStock = async (data) => {
    const url = import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) {
        throw new Error('Google Sheet URL is not configured.');
    }

    const formBody = new FormData();
    formBody.append('action', 'useStock');
    formBody.append('color', data.color);
    formBody.append('quantity', data.quantity);

    const response = await fetch(url, {
        method: 'POST',
        body: formBody,
    });

    if (!response.ok) {
        throw new Error('Failed to record usage');
    }

    return await response.json();
};

// Get current inventory
export const getInventory = async () => {
    const url = import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) {
        throw new Error('Google Sheet URL is not configured.');
    }

    const response = await fetch(`${url}?action=getInventory&_t=${Date.now()}`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch inventory');
    }

    const result = await response.json();
    return result.inventory || [];
};

// Add new color
export const addColor = async (colorName, imageData) => {
    const url = import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) {
        throw new Error('Google Sheet URL is not configured.');
    }

    const formBody = new FormData();
    formBody.append('action', 'addColor');
    formBody.append('colorName', colorName);
    formBody.append('imageData', imageData || '');

    const response = await fetch(url, {
        method: 'POST',
        body: formBody,
    });

    if (!response.ok) {
        throw new Error('Failed to add color');
    }

    const result = await response.json();
    if (result.result === 'error') {
        throw new Error(typeof result.error === 'object' ? JSON.stringify(result.error) : result.error);
    }
    return result;
};

// Get all colors
export const getColors = async () => {
    const url = import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) {
        throw new Error('Google Sheet URL is not configured.');
    }

    const response = await fetch(`${url}?action=getColors&_t=${Date.now()}`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch colors');
    }

    const result = await response.json();
    return result.colors || [];
};

// Delete color
export const deleteColor = async (colorName) => {
    const url = import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) {
        throw new Error('Google Sheet URL is not configured.');
    }

    const formBody = new FormData();
    formBody.append('action', 'deleteColor');
    formBody.append('colorName', colorName);

    const response = await fetch(url, {
        method: 'POST',
        body: formBody,
    });

    if (!response.ok) {
        throw new Error('Failed to delete color');
    }

    const result = await response.json();
    if (result.result === 'error') {
        throw new Error(typeof result.error === 'object' ? JSON.stringify(result.error) : result.error);
    }
    return result;
};

// --- Employees Management ---

// Get all employees
export const getEmployees = async () => {
    const url = import.meta.env.VITE_EMPLOYEE_SHEET_URL || import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) throw new Error('Employee Sheet URL is not configured.');

    const response = await fetch(`${url}?action=getEmployees&_t=${Date.now()}`, { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch employees');

    const result = await response.json();
    return result.employees || [];
};

// Add new employee
export const addEmployee = async (data) => {
    const url = import.meta.env.VITE_EMPLOYEE_SHEET_URL || import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) throw new Error('Employee Sheet URL is not configured.');

    const formBody = new FormData();
    formBody.append('action', 'addEmployee');
    formBody.append('name', data.name);
    formBody.append('position', data.position);
    formBody.append('salaryPerDay', data.salaryPerDay); // Changed from salary to salaryPerDay
    formBody.append('dateOfJoining', data.dateOfJoining);
    formBody.append('photo', data.photo || ''); // Base64 string

    const response = await fetch(url, { method: 'POST', body: formBody });
    if (!response.ok) throw new Error('Failed to add employee');

    const text = await response.text();
    let result;
    try {
        result = JSON.parse(text);
    } catch (e) {
        console.error('Failed to parse backend response:', text);
        throw new Error('Invalid response from backend. Check console for details.');
    }

    if (result.result === 'error') {
        const errMsg = typeof result.error === 'object' ? JSON.stringify(result.error) : result.error;
        throw new Error(errMsg);
    }
    return result;
};

// Delete employee
export const deleteEmployee = async (id) => {
    const url = import.meta.env.VITE_EMPLOYEE_SHEET_URL || import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) throw new Error('Employee Sheet URL is not configured.');

    const formBody = new FormData();
    formBody.append('action', 'deleteEmployee');
    formBody.append('id', id);

    const response = await fetch(url, { method: 'POST', body: formBody });
    if (!response.ok) throw new Error('Failed to delete employee');

    return await response.json();
};

// Update employee (specifically salary)
export const updateEmployee = async (data) => {
    const url = import.meta.env.VITE_EMPLOYEE_SHEET_URL || import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) throw new Error('Employee Sheet URL is not configured.');

    const formBody = new FormData();
    formBody.append('action', 'updateEmployee');
    formBody.append('id', data.id);
    formBody.append('salaryPerDay', data.salaryPerDay);

    const response = await fetch(url, { method: 'POST', body: formBody });
    if (!response.ok) throw new Error('Failed to update employee');

    return await response.json();
};

// Get attendance by date range
export const getAttendanceByRange = async (startDate, endDate) => {
    const url = import.meta.env.VITE_EMPLOYEE_SHEET_URL || import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) throw new Error('Employee Sheet URL is not configured.');

    const response = await fetch(`${url}?action=getAttendance&startDate=${startDate}&endDate=${endDate}&_t=${Date.now()}`, { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch attendance');

    const result = await response.json();

    // Log debug info if available
    if (result.debug) {
        console.log('Attendance API Debug:', result.debug);
    }

    // Return just the array to match frontend expectation
    return result.attendance || [];
};

// Mark attendance
export const markAttendance = async (date, attendanceData) => {
    const url = import.meta.env.VITE_EMPLOYEE_SHEET_URL || import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) throw new Error('Employee Sheet URL is not configured.');

    const formBody = new FormData();
    formBody.append('action', 'markAttendance');
    formBody.append('date', date);
    formBody.append('attendance', JSON.stringify(attendanceData));

    const response = await fetch(url, { method: 'POST', body: formBody });
    if (!response.ok) throw new Error('Failed to mark attendance');

    return await response.json();
};

export const savePayment = async (data) => {
    const url = import.meta.env.VITE_EMPLOYEE_SHEET_URL || import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) throw new Error('Employee Sheet URL is not configured.');

    const formBody = new FormData();
    formBody.append('action', 'savePayment');
    formBody.append('employeeId', data.employeeId);
    formBody.append('amount', data.amount);
    formBody.append('note', data.note);
    formBody.append('startDate', data.startDate);
    formBody.append('endDate', data.endDate);

    const response = await fetch(url, { method: 'POST', body: formBody });
    if (!response.ok) throw new Error('Failed to save payment');

    return await response.json();
};

export const getPayments = async (startDate, endDate) => {
    const url = import.meta.env.VITE_EMPLOYEE_SHEET_URL || import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) throw new Error('Employee Sheet URL is not configured.');

    const response = await fetch(`${url}?action=getPayments&startDate=${startDate}&endDate=${endDate}&_t=${Date.now()}`, { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch payments');

    const result = await response.json();
    return result.payments || [];
};

