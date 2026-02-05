const STORAGE_KEY = 'pti_data';

export const getPTIRecords = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading from localStorage', error);
        return [];
    }
};

export const savePTIRecords = (records) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
        console.error('Error saving to localStorage', error);
    }
};

export const addPTIRecord = (record) => {
    const records = getPTIRecords();
    const newRecords = [record, ...records];
    savePTIRecords(newRecords);
    return newRecords;
};

export const updatePTIRecord = (updatedRecord) => {
    const records = getPTIRecords();
    const newRecords = records.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    savePTIRecords(newRecords);
    return newRecords;
};

export const deletePTIRecord = (id) => {
    const records = getPTIRecords();
    const newRecords = records.filter(r => r.id !== id);
    savePTIRecords(newRecords);
    return newRecords;
};

const STORAGE_TRASH_KEY = 'pti_trash';

export const getTrashRecords = () => {
    try {
        const data = localStorage.getItem(STORAGE_TRASH_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        return [];
    }
};

export const saveTrashRecords = (records) => {
    try {
        localStorage.setItem(STORAGE_TRASH_KEY, JSON.stringify(records));
    } catch (error) {
        console.error('Error saving to trash', error);
    }
};

export const movePTIToTrash = (recordsToMove) => {
    const trash = getTrashRecords();
    const timestamp = new Date().toISOString();
    const trashItems = recordsToMove.map(r => ({ ...r, deletedAt: timestamp }));
    saveTrashRecords([...trashItems, ...trash]);
};

const EMAIL_SETTINGS_KEY = 'pti_email_settings';

export const getEmailSettings = () => {
    try {
        const data = localStorage.getItem(EMAIL_SETTINGS_KEY);
        // Default template and rules
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
        return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    } catch (error) {
        return { recipients: [], template: { subject: '', body: '' } };
    }
};

export const saveEmailSettings = (settings) => {
    try {
        localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving email settings', error);
    }
};
