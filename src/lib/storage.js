const API_URL = 'http://localhost:3001/api';

export const getPTIRecords = async (type) => {
    try {
        const url = type ? `${API_URL}/pti?type=${type}` : `${API_URL}/pti`;
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Error fetching PTI records', error);
        return [];
    }
};

export const addPTIRecord = async (record) => {
    try {
        const response = await fetch(`${API_URL}/pti`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        return await response.json();
    } catch (error) {
        console.error('Error adding PTI record', error);
    }
};

export const updatePTIRecord = async (record) => {
    try {
        const response = await fetch(`${API_URL}/pti/${record.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        return await response.json();
    } catch (error) {
        console.error('Error updating PTI record', error);
    }
};

export const deletePTIRecord = async (id) => {
    try {
        await fetch(`${API_URL}/pti/${id}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Error deleting PTI record', error);
    }
};

export const getTrashRecords = async () => {
    try {
        const response = await fetch(`${API_URL}/trash`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching trash records', error);
        return [];
    }
};

export const movePTIToTrash = async (records) => {
    try {
        const response = await fetch(`${API_URL}/trash`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(records)
        });
        return await response.json();
    } catch (error) {
        console.error('Error moving records to trash', error);
    }
};

export const recoverFromTrash = async (record) => {
    try {
        const response = await fetch(`${API_URL}/trash/recover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        return await response.json();
    } catch (error) {
        console.error('Error recovering record from trash', error);
    }
};

export const deleteFromTrash = async (id) => {
    try {
        await fetch(`${API_URL}/trash/${id}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Error deleting record from trash', error);
    }
};

export const getEmailSettings = async () => {
    try {
        const response = await fetch(`${API_URL}/settings/email`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching email settings', error);
        return null;
    }
};

export const saveEmailSettings = async (settings) => {
    try {
        const response = await fetch(`${API_URL}/settings/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        return await response.json();
    } catch (error) {
        console.error('Error saving email settings', error);
    }
};
