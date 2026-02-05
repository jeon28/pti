const API_URL = 'http://localhost:3001/api';

export const getPTIRecords = async () => {
    try {
        const response = await fetch(`${API_URL}/pti`);
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

export const updatePTIRecord = async (updatedRecord) => {
    try {
        const response = await fetch(`${API_URL}/pti/${updatedRecord.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedRecord)
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

export const movePTIToTrash = async (recordsToMove) => {
    try {
        const ids = recordsToMove.map(r => r.id);
        await fetch(`${API_URL}/trash/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
    } catch (error) {
        console.error('Error moving records to trash', error);
    }
};

export const restorePTIRecords = async (ids) => {
    try {
        await fetch(`${API_URL}/trash/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
    } catch (error) {
        console.error('Error restoring records', error);
    }
};

export const clearTrash = async () => {
    try {
        await fetch(`${API_URL}/trash/clear`, { method: 'DELETE' });
    } catch (error) {
        console.error('Error clearing trash', error);
    }
};

export const getEmailSettings = async () => {
    try {
        const response = await fetch(`${API_URL}/settings/email`);
        const data = await response.json();

        const defaultSettings = {
            recipients: [
                { id: '1', matchType: 'Location', matchValue: 'SNCT', emailType: 'To', emailAddress: 'ops@snct.com' },
                { id: '2', matchType: 'Location', matchValue: 'SNCT', emailType: 'CC', emailAddress: 'office@snct.com' },
                { id: '3', matchType: 'Location', matchValue: 'HJIT', emailType: 'To', emailAddress: 'ops@hjit.co.kr' },
                { id: '4', matchType: 'Location', matchValue: 'HJIT', emailType: 'CC', emailAddress: 'office@hjit.co.kr' },
                { id: '5', matchType: 'Location', matchValue: 'ICT', emailType: 'To', emailAddress: 'ops@ict.co.kr' },
                { id: '6', matchType: 'Location', matchValue: 'ICT', emailType: 'CC', emailAddress: 'office@ict.co.kr' },
                { id: '7', matchType: 'Location', matchValue: 'E1', emailType: 'To', emailAddress: 'ops@e1ct.co.kr' },
                { id: '8', matchType: 'Location', matchValue: 'E1', emailType: 'CC', emailAddress: 'office@e1ct.co.kr' },
            ],
            template: {
                subject: '[PTI Request] {location} - {shippingLine} - {bookingNo}',
                body: `Dear Team,\n\nPlease process the following PTI request:\n\nCustomer: {customer}\nBooking No: {bookingNo}\nQty: {qty} units\nContainer No: {containerNo}\nSize: {size}\nTemp: {temperature}\nVent: {vent}\nPickup Date: {pickupDate}\n\nThank you.\n`
            }
        };

        return data ? { ...defaultSettings, ...data } : defaultSettings;
    } catch (error) {
        console.error('Error fetching email settings', error);
        return { recipients: [], template: { subject: '', body: '' } };
    }
};

export const saveEmailSettings = async (settings) => {
    try {
        await fetch(`${API_URL}/settings/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
    } catch (error) {
        console.error('Error saving email settings', error);
    }
};
