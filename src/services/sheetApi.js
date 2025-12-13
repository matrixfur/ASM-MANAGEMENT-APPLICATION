
export const submitLogin = async (data) => {
    const url = import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) {
        throw new Error('Google Sheet URL is not configured.');
    }

    // Google Apps Script Web App is best accessed via FormData to avoid CORS preflight
    // and ensure compatibility.
    const formBody = new FormData();
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

    return await response.json();
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

    const response = await fetch(`${url}?action=getInventory`, {
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

    return await response.json();
};

// Get all colors
export const getColors = async () => {
    const url = import.meta.env.VITE_GOOGLE_SHEET_URL;
    if (!url) {
        throw new Error('Google Sheet URL is not configured.');
    }

    const response = await fetch(`${url}?action=getColors`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch colors');
    }

    const result = await response.json();
    return result.colors || [];
};
