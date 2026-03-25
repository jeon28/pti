import { useState, useEffect } from 'react';
import { X, Clipboard, Save, Trash2, AlertCircle } from 'lucide-react';

export default function BulkPasteModal({ onClose, onSave, initialText = '', type = 'PTI' }) {
    const [pastedText, setPastedText] = useState(initialText);
    const [parsedData, setParsedData] = useState([]);

    useEffect(() => {
        if (initialText) {
            handleParse(initialText);
        }
    }, [initialText]);

    const handleParse = (textToParse = pastedText) => {
        if (!textToParse?.trim()) return;

        // Check if this is tab-delimited data (Excel) or free-form text
        const hasTabDelimiters = textToParse.includes('\t');

        if (hasTabDelimiters) {
            // Parse tab-delimited Excel data
            parseTabDelimitedData(textToParse);
        } else {
            // Parse free-form text (Smart Paste logic) for both SPECIAL and PTI
            parseFreeFormText(textToParse);
        }
    };

    const parseFreeFormText = (text) => {
        // Split by double newlines or numbered items (1., 2., 3., etc.)
        const itemPattern = /\n\s*\n|(?:\n|^)\s*\d+\.?\s+/;
        const items = text.split(itemPattern).filter(item => item.trim());

        const newData = items.map((item, idx) => {
            // Extract booking number
            const bookingMatch = item.match(/(HASLK\d{11}|SNKO\d{12})/i);
            const bookingNo = bookingMatch ? bookingMatch[0].toUpperCase() : '';

            let shippingLine = '';
            if (bookingNo.startsWith('HASL')) shippingLine = 'HAL';
            else if (bookingNo.startsWith('SNKO')) shippingLine = 'SKR';

            // Extract customer from line with booking number
            let customer = '';
            const customerMatch = item.match(new RegExp(`${bookingNo}\\s*\\/\\s*([^\\n]+)`, 'i'));
            if (customerMatch) {
                customer = customerMatch[1].trim();
            }

            // Extract pickup date (M/D, MM/DD format, or "02 월 26 일")
            const dateMatch = item.match(/픽업\s*(?:일|날짜)?\s*[:=]?\s*(\d{4})[\/\-.년\s]*(\d{1,2})[\/\-.월\s]*(\d{1,2})[일\s]*/) ||
                item.match(/\b(\d{4})[\/\-.년\s]+(\d{1,2})[\/\-.월\s]+(\d{1,2})[일\s]*/) ||
                item.match(/\b(\d{4})(\d{2})(\d{2})\b/) ||
                item.match(/\b(\d{1,2})[\/\-.월\s]+(\d{1,2})[일\s]*/);
            let pickupDate = '';
            if (dateMatch) {
                const currentYear = new Date().getFullYear();
                if (dateMatch[1] && dateMatch[2] && dateMatch[3]) { // YYYY MM DD
                    const year = dateMatch[1].length === 2 ? `20${dateMatch[1]}` : dateMatch[1];
                    const month = dateMatch[2].padStart(2, '0');
                    const day = dateMatch[3].padStart(2, '0');
                    pickupDate = `${year}-${month}-${day}`;
                } else if (dateMatch[1] && dateMatch[2]) { // MM DD
                    const month = dateMatch[1].padStart(2, '0');
                    const day = dateMatch[2].padStart(2, '0');
                    pickupDate = `${currentYear}-${month}-${day}`;
                }
            }

            // Extract container numbers (format: 4 letters + 7 digits)
            const containerRegex = /\b([A-Z]{4}\d{7})\b/ig;
            const foundContainers = [...item.matchAll(containerRegex)].map(m => m[1].toUpperCase());

            // Extract size and quantity
            // Pattern: "42PC X 1", "22PC  X 3", "RF22REx1" etc. (handles multiple spaces)
            const sizeQtyMatch = item.match(/([a-zA-Z]{0,2}\d{2}(?:PC|UT|FLAT|FR|OT|RE|RT|OPEN))\s*[xX*×]\s*(\d{1,2})/i) ||
                item.match(/사이즈\s*[:：]\s*(\d{2}(?:PC|UT|FLAT|FR|OT|RE|RT|OPEN))\s*[xX*×]\s*(\d{1,2})/i);
            let size = '42PC';
            let quantity = 1;

            if (sizeQtyMatch) {
                const sizeStr = sizeQtyMatch[1].toUpperCase();
                quantity = parseInt(sizeQtyMatch[2], 10);

                // Normalize size
                if (sizeStr.match(/^(?:RF|)[2](0|2).*(PC|FLAT|FR)/i)) size = '22PC';
                else if (sizeStr.match(/^(?:RF|)[2](0|2).*(UT|OT|OPEN)/i)) size = '22UT';
                else if (sizeStr.match(/^(?:RF|)40.*(PC|FLAT|FR)/i)) size = '42PC';
                else if (sizeStr.match(/^(?:RF|)45.*(PC|FLAT|FR)/i)) size = '45PC';
                else if (sizeStr.match(/^(?:RF|)(40|42).*(UT|OT|OPEN)/i)) size = '42UT';
                else if (sizeStr.match(/RE/i)) size = sizeStr.replace('RF', ''); // keep 22RE or 42RE 
                else size = sizeStr.replace('RF', '');
            } else {
                // Try fallback for size without quantity if "X" is missing
                const sizeOnlyMatch = item.match(/([a-zA-Z]{0,2}\d{2}(?:PC|UT|FLAT|FR|OT|RE|RT|OPEN))/i);
                if (sizeOnlyMatch) {
                    const sizeStr = sizeOnlyMatch[1].toUpperCase();
                    if (sizeStr.match(/^(?:RF|)[2](0|2).*(PC|FLAT|FR)/i)) size = '22PC';
                    else if (sizeStr.match(/^(?:RF|)[2](0|2).*(UT|OT|OPEN)/i)) size = '22UT';
                    else if (sizeStr.match(/^(?:RF|)40.*(PC|FLAT|FR)/i)) size = '42PC';
                    else if (sizeStr.match(/^(?:RF|)45.*(PC|FLAT|FR)/i)) size = '45PC';
                    else if (sizeStr.match(/^(?:RF|)(40|42).*(UT|OT|OPEN)/i)) size = '42UT';
                    else if (sizeStr.match(/RE|RT/i)) size = sizeStr.replace('RF', ''); // keep 22RE or 42RE 
                    else size = sizeStr.replace('RF', '');
                }
            }

            // Smart parsing for PTI specific fields (Temp, Vent, etc.)
            let temperature = '';
            let vent = type === 'PTI' ? 'CLOSED' : '';
            if (type === 'PTI') {
                const tempLabeledMatch = item.match(/(?:Temp|온도)\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)/i);
                const tempUnitMatch = item.match(/\b([+-]?\d{1,2}(?:\.\d+)?)\s*(?:도|'C|C|°C)\b/i);
                const tempSignedMatch = item.match(/(?<![\d/-])[+-]\d{1,2}(?:\.\d+)?(?!\d)/);
                if (tempLabeledMatch) temperature = tempLabeledMatch[1];
                else if (tempUnitMatch) temperature = tempUnitMatch[1];
                else if (tempSignedMatch) temperature = tempSignedMatch[0];

                const ventMatch = item.match(/(?:VENT|환기구|개폐구|환기|VENTILATION)\s*[:=]?\s*(CLOSE|CLOSED|OPEN|\d+)\s*%?/i);
                if (ventMatch) {
                    const val = ventMatch[1].toUpperCase();
                    if (val === 'CLOSE' || val === 'CLOSED' || val === '0') vent = 'CLOSED';
                    else vent = val;
                } else if (item.match(/CLOSE|CLOSED/i)) {
                    vent = 'CLOSED';
                }
            }

            // Create records for each container
            const records = [];

            if (foundContainers.length > 0) {
                // If container numbers are provided, create one record per container
                foundContainers.forEach((containerNo, i) => {
                    records.push({
                        id: `bulk-${Date.now()}-${idx}-${i}`,
                        shippingLine: shippingLine,
                        location: '',
                        customer: customer,
                        bookingNo: bookingNo,
                        containerNo: containerNo,
                        size: size,
                        temperature: temperature,
                        vent: vent,
                        humidity: '',
                        requestDate: new Date().toISOString().split('T')[0],
                        pickupDate: pickupDate,
                        ptiStatus: 'In Progress', // Has container number
                        remarks: '',
                        pickupStatus: 'Not Picked Up',
                        type: type
                    });
                });
            } else {
                // If no container numbers, create records based on quantity
                for (let i = 0; i < quantity; i++) {
                    records.push({
                        id: `bulk-${Date.now()}-${idx}-${i}`,
                        shippingLine: shippingLine,
                        location: '',
                        customer: customer,
                        bookingNo: bookingNo,
                        containerNo: '',
                        size: size,
                        temperature: temperature,
                        vent: vent,
                        humidity: '',
                        requestDate: new Date().toISOString().split('T')[0],
                        pickupDate: pickupDate,
                        ptiStatus: 'Pending', // No container number yet
                        remarks: '',
                        pickupStatus: 'Not Picked Up',
                        type: type
                    });
                }
            }

            return records;
        }).flat().filter(Boolean);

        setParsedData(newData);
    };

    const parseTabDelimitedData = (text) => {
        const lines = text.split('\n');
        const rows = lines
            .map(line => line.split('\t'))
            .filter(cols => cols.some(col => col.trim().length > 0)); // Filter out completely empty rows

        if (rows.length === 0) return;

        // --- Helper Regexes ---
        const isBooking = (val) => val.match(/^(HASL|SNKO)[A-Z0-9]{5,}/i);
        const isContainer = (val) => val.match(/^[A-Z]{4}\d{7}$/i);
        const isSizeOrQty = (val) => val.match(/(20|22|40|42|45).*(PC|UT|FLAT|FR|OT|RE|OPEN)/i);
        const isLocation = (val) => val.match(/^(SNCT|HJIT|ICT|E1)$/i);
        const isShippingLine = (val) => val.match(/^(HAL|SKR)$/i);
        const isDate = (val) => val.match(/\d{1,4}[/\-.년\s]*\d{1,2}[/\-.월\s]*\d{1,2}[일\s]*/);
        const isTemp = (val) => val.match(/^[-+]?\d+(\.\d+)?\s*(C|F|도)?$/i);

        // --- 1. Find the first row that contains actual data (not headers) ---
        let firstDataRowIdx = 0;
        for (let i = 0; i < rows.length; i++) {
            const cols = rows[i];
            const upperStr = cols.join(' ').toUpperCase();
            // Header heuristic
            if (upperStr.includes('BOOKING') || upperStr.includes('BKG') || upperStr.includes('LOCATION') || upperStr.includes('LINE')) {
                continue; // Skip header
            }
            if (cols.some(c => isBooking(c.trim()) || isContainer(c.trim()) || isSizeOrQty(c.trim()))) {
                firstDataRowIdx = i;
                break;
            }
        }

        const firstDataRow = rows[firstDataRowIdx] || rows[0];

        // --- 2. Infer column indices based on the FIRST data row's format & lengths ---
        const colMap = {
            booking: -1,
            container: -1,
            size: -1,
            pickupDate: -1,
            requestDate: -1,
            temp: -1,
            location: -1,
            customer: -1,
            shippingLine: -1,
            vent: -1,
            remark: -1
        };

        let dateColumns = [];

        firstDataRow.forEach((col, idx) => {
            const val = col.trim();
            if (!val) return;

            if (colMap.booking === -1 && isBooking(val)) colMap.booking = idx;
            else if (colMap.container === -1 && isContainer(val)) colMap.container = idx;
            else if (colMap.size === -1 && isSizeOrQty(val)) colMap.size = idx;
            else if (colMap.location === -1 && isLocation(val)) colMap.location = idx;
            else if (colMap.shippingLine === -1 && isShippingLine(val)) colMap.shippingLine = idx;
            else if (isDate(val)) dateColumns.push(idx);
            else if (type === 'PTI' && colMap.temp === -1 && isTemp(val) && !val.match(/^(20|22|40|42|45)/)) colMap.temp = idx;
        });

        // Assign dates
        if (dateColumns.length === 1) {
            colMap.pickupDate = dateColumns[0];
            if (type === 'PTI') colMap.requestDate = dateColumns[0]; // Optional fallback
        } else if (dateColumns.length >= 2) {
            // Heuristic: earlier date might be request date, later is pickup date
            colMap.requestDate = dateColumns[0];
            colMap.pickupDate = dateColumns[1];
        }

        // Assign customer & remark
        firstDataRow.forEach((col, idx) => {
            const val = col.trim();
            if (!val) return;
            if (Object.values(colMap).includes(idx) || dateColumns.includes(idx)) return;

            if (type === 'PTI' && colMap.vent === -1 && val.match(/^(CLOSED|OPEN|\d+\s*(CM|%))$/i)) {
                colMap.vent = idx;
                return;
            }

            if (colMap.customer === -1 && isNaN(Number(val)) && val.length > 1) {
                colMap.customer = idx;
            } else if (colMap.remark === -1) {
                colMap.remark = idx;
            }
        });

        // Date parser (Handles M/D, YYYY-MM-DD, 02 월 26 일)
        const parseDateDynamic = (dateStr) => {
            if (!dateStr || dateStr.trim() === '') return '';
            let trimmed = dateStr.trim();

            trimmed = trimmed.replace(/\s*년\s*/g, '-').replace(/\s*월\s*/g, '-').replace(/\s*일\s*/g, '');
            trimmed = trimmed.replace(/[/\.]/g, '-');

            const currentYear = new Date().getFullYear();

            let match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (match) {
                return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
            }
            match = trimmed.match(/^(\d{1,2})-(\d{1,2})$/);
            if (match) {
                return `${currentYear}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
            }

            const numbers = dateStr.match(/\d+/g);
            if (numbers && numbers.length >= 2) {
                if (numbers[0].length === 4) {
                    return `${numbers[0]}-${numbers[1].padStart(2, '0')}-${(numbers[2] || '01').padStart(2, '0')}`;
                } else {
                    return `${currentYear}-${numbers[0].padStart(2, '0')}-${numbers[1].padStart(2, '0')}`;
                }
            }
            return dateStr;
        };

        // --- 3. Process all rows based on colMap ---
        const newData = [];

        rows.slice(firstDataRowIdx).forEach((cols, idx) => {
            const getVal = (idxNum) => (idxNum !== -1 && cols[idxNum] !== undefined) ? cols[idxNum].trim() : '';

            let bookingNo = getVal(colMap.booking);
            let containerNo = getVal(colMap.container);
            let sizeQtyRaw = getVal(colMap.size);
            let location = getVal(colMap.location);
            let shippingLine = getVal(colMap.shippingLine);
            let customer = getVal(colMap.customer);
            let pickupDateRaw = getVal(colMap.pickupDate);
            let tempRaw = getVal(colMap.temp);
            let ventRaw = getVal(colMap.vent);
            let remarkRaw = getVal(colMap.remark);

            // Fallback: search per row if colMap missed it or row is unstructured
            if (!bookingNo) bookingNo = (cols.find(c => isBooking(c.trim())) || '').trim();
            if (!containerNo) containerNo = (cols.find(c => isContainer(c.trim())) || '').trim();
            if (!sizeQtyRaw) sizeQtyRaw = (cols.find(c => isSizeOrQty(c.trim())) || '').trim();

            if (!shippingLine && bookingNo) {
                if (bookingNo.toUpperCase().startsWith('HASL')) shippingLine = 'HAL';
                else if (bookingNo.toUpperCase().startsWith('SNKO')) shippingLine = 'SKR';
            }

            if (!bookingNo && !containerNo) return; // Skip invalid rows

            let size = type === 'PTI' ? '40RE' : '42PC';
            let quantity = 1;

            if (sizeQtyRaw) {
                const sMatch = sizeQtyRaw.match(/(\d{2}(?:PC|UT|FLAT|FR|OT|RE|OPEN))/i);
                if (sMatch) {
                    const s = sMatch[1].toUpperCase();
                    if (s.match(/^(20|22).*(PC|FLAT|FR)/i)) size = '22PC';
                    else if (s.match(/^(20|22).*(UT|OT|OPEN)/i)) size = '22UT';
                    else if (s.match(/^40.*(PC|FLAT|FR)/i)) size = '42PC';
                    else if (s.match(/^45.*(PC|FLAT|FR)/i)) size = '45PC';
                    else if (s.match(/^(40|42).*(UT|OT|OPEN)/i)) size = '42UT';
                    else size = s;
                }

                if (type === 'SPECIAL') {
                    const qMatch = sizeQtyRaw.match(/[xX*×]\s*(\d{1,2})/);
                    if (qMatch) {
                        quantity = parseInt(qMatch[1], 10);
                    }
                }
            }

            const pickupDate = parseDateDynamic(pickupDateRaw);
            const requestDate = type === 'PTI'
                ? (parseDateDynamic(getVal(colMap.requestDate)) || new Date().toISOString().split('T')[0])
                : new Date().toISOString().split('T')[0];

            let status = 'Pending';
            if (containerNo && containerNo.length > 0) {
                status = 'In Progress';
            }

            const count = (type === 'SPECIAL' && !containerNo && quantity > 1) ? quantity : 1;

            for (let i = 0; i < count; i++) {
                newData.push({
                    id: `bulk-${Date.now()}-${idx}-${i}`,
                    shippingLine: shippingLine,
                    location: location,
                    customer: customer,
                    bookingNo: bookingNo,
                    containerNo: count > 1 ? '' : containerNo,
                    size: size,
                    temperature: type === 'SPECIAL' ? '' : tempRaw,
                    vent: type === 'SPECIAL' ? '' : (ventRaw || 'CLOSED'),
                    humidity: '',
                    requestDate: requestDate,
                    pickupDate: pickupDate,
                    ptiStatus: count > 1 ? 'Pending' : status,
                    remarks: remarkRaw,
                    pickupStatus: 'Not Picked Up',
                    type: type
                });
            }
        });

        setParsedData(newData);
    };

    const handleSave = () => {
        if (parsedData.length === 0) return;
        onSave(parsedData);
        onClose();
    };

    const clearParsed = () => {
        setParsedData([]);
        setPastedText('');
    };

    const groupedData = useMemo(() => {
        const groups = {};
        const orderedKeys = [];
        parsedData.forEach(r => {
            const key = r.bookingNo || `temp-${r.id}`;
            if (!groups[key]) {
                groups[key] = [];
                orderedKeys.push(key);
            }
            groups[key].push(r);
        });
        return orderedKeys.map(k => groups[k]);
    }, [parsedData]);

    const updateGroupField = (groupIdx, field, value) => {
        const group = groupedData[groupIdx];
        const ids = group.map(r => r.id);
        
        setParsedData(prev => prev.map(r => {
            if (ids.includes(r.id)) {
                return { ...r, [field]: value };
            }
            return r;
        }));
    };

    const updateSingleField = (id, field, value) => {
        setParsedData(prev => prev.map(r => {
            if (r.id === id) return { ...r, [field]: value };
            return r;
        }));
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(5, 10, 20, 0.75)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '2rem'
        }}>
            <div className="glass-panel animate-fade-in" style={{
                width: '1100px',
                maxWidth: '95vw',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem 2rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {type === 'SPECIAL' ? 'Special Container Bulk Import' : 'Bulk Data Import'}
                        </h2>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {type === 'SPECIAL'
                                ? 'Excel Columns: BKG | CNTR | SIZE | (ANY DATE -> PICK DATE)'
                                : 'Excel Columns: BKG | CNTR | SIZE | TEMP | VENT | HUM | REQ | PICK'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>


                    {parsedData.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                                <Clipboard size={48} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: '0.5rem' }} />
                                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0 }}>복사한 엑셀 데이터를 아래 영역에 붙여넣어 주세요.</p>
                            </div>

                            {/* Column Headers Guide */}
                            <div style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '12px',
                                padding: '1rem',
                                display: 'flex',
                                justifyContent: 'space-around',
                                alignItems: 'center',
                                gap: '0.5rem',
                                flexWrap: 'wrap'
                            }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', minWidth: '80px', textAlign: 'center' }}>BKG No</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', minWidth: '80px', textAlign: 'center' }}>CNTR No</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', minWidth: '60px', textAlign: 'center' }}>SIZE</span>
                                {type === 'PTI' && (
                                    <>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', minWidth: '60px', textAlign: 'center' }}>TEMP</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', minWidth: '60px', textAlign: 'center' }}>VENT</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', minWidth: '60px', textAlign: 'center' }}>HUM</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', minWidth: '80px', textAlign: 'center' }}>REQ DATE</span>
                                    </>
                                )}
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', minWidth: '80px', textAlign: 'center' }}>PICK DATE</span>
                            </div>

                            <textarea
                                value={pastedText}
                                onChange={(e) => {
                                    setPastedText(e.target.value);
                                    if (e.target.value.includes('\t')) {
                                        handleParse(e.target.value);
                                    }
                                }}
                                placeholder="Paste here (CSV/TSV from Excel)..."
                                style={{
                                    minHeight: '200px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    color: '#fff',
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    resize: 'vertical',
                                    outline: 'none',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                }}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={() => handleParse()}
                                disabled={!pastedText.trim()}
                                style={{ alignSelf: 'center', padding: '1rem 3rem', fontSize: '1rem', borderRadius: '12px' }}
                            >
                                <Clipboard size={20} />
                                데이터 분석 시작 (Parse)
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ background: 'var(--primary)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
                                        {parsedData.length} Records Found
                                    </div>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>데이터를 검토해 주세요.</span>
                                </div>
                                <button onClick={clearParsed} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                    <Trash2 size={16} /> 다시 붙여넣기
                                </button>
                            </div>

                            <div className="table-container" style={{
                                maxHeight: '50vh',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                overflow: 'auto'
                            }}>
                                <table style={{ fontSize: '0.95rem', width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
                                        <tr>
                                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>Line</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>Location</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>Customer</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>BKG No</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>CNTR No</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>Size</th>
                                            {type === 'PTI' && (
                                                <>
                                                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>Temp</th>
                                                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>요청일</th>
                                                </>
                                            )}
                                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>픽업일</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>STATUS</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>Remark</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedData.map((group, groupIdx) => {
                                            const row = group[0];
                                            const isSpecial = type === 'SPECIAL';

                                            // Get status color
                                            const getStatusColor = (status) => {
                                                switch (status) {
                                                    case 'Pass': return { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399' };
                                                    case 'In Progress': return { bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' };
                                                    case 'Cancelled': return { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171' };
                                                    default: return { bg: 'rgba(156, 163, 175, 0.2)', color: '#9ca3af' };
                                                }
                                            };

                                            const statusColors = getStatusColor(row.ptiStatus);

                                            return (
                                                <tr key={groupIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <input
                                                            value={row.shippingLine || ''}
                                                            onChange={(e) => updateGroupField(groupIdx, 'shippingLine', e.target.value)}
                                                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <select
                                                            value={row.location || ''}
                                                            onChange={(e) => updateGroupField(groupIdx, 'location', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.5rem',
                                                                fontSize: '0.9rem',
                                                                background: 'rgba(255,255,255,0.05)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '6px',
                                                                color: '#fff',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="SNCT">SNCT</option>
                                                            <option value="HJIT">HJIT</option>
                                                            <option value="ICT">ICT</option>
                                                            <option value="E1">E1</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <input
                                                            type="text"
                                                            value={row.customer || ''}
                                                            onChange={(e) => updateGroupField(groupIdx, 'customer', e.target.value)}
                                                            placeholder="Customer"
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.5rem',
                                                                fontSize: '0.9rem',
                                                                background: 'rgba(255,255,255,0.05)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '6px',
                                                                color: '#fff'
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <input
                                                            value={row.bookingNo || ''}
                                                            onChange={(e) => updateGroupField(groupIdx, 'bookingNo', e.target.value)}
                                                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {group.map((r, ri) => (
                                                                <input
                                                                    key={ri}
                                                                    value={r.containerNo || ''}
                                                                    onChange={(e) => updateSingleField(r.id, 'containerNo', e.target.value)}
                                                                    style={{ width: '100%', padding: '0.3rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--primary)' }}
                                                                    placeholder={`Container ${ri + 1}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <input
                                                            value={row.size || ''}
                                                            onChange={(e) => updateGroupField(groupIdx, 'size', e.target.value)}
                                                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                                                        />
                                                    </td>
                                                    {type === 'PTI' && (
                                                        <>
                                                            <td style={{ padding: '0.5rem' }}>
                                                                <input
                                                                    value={row.temperature || ''}
                                                                    onChange={(e) => updateGroupField(groupIdx, 'temperature', e.target.value)}
                                                                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#60a5fa' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '0.5rem' }}>
                                                                <input
                                                                    type="date"
                                                                    value={row.requestDate || ''}
                                                                    onChange={(e) => updateGroupField(groupIdx, 'requestDate', e.target.value)}
                                                                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fbbf24' }}
                                                                />
                                                            </td>
                                                        </>
                                                    )}
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <input
                                                            type="date"
                                                            value={row.pickupDate || ''}
                                                            onChange={(e) => updateGroupField(groupIdx, 'pickupDate', e.target.value)}
                                                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fbbf24' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <select
                                                            value={row.ptiStatus}
                                                            onChange={(e) => updateGroupField(groupIdx, 'ptiStatus', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.5rem',
                                                                fontSize: '0.85rem',
                                                                background: statusColors.bg,
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '6px',
                                                                color: statusColors.color,
                                                                cursor: 'pointer',
                                                                fontWeight: 600
                                                            }}
                                                        >
                                                            <option value="Pending">Pending</option>
                                                            <option value="In Progress">In Progress</option>
                                                            <option value="Pass">Pass</option>
                                                            <option value="Cancelled">Cancelled</option>
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <input
                                                            type="text"
                                                            value={row.remarks || ''}
                                                            onChange={(e) => updateGroupField(groupIdx, 'remarks', e.target.value)}
                                                            placeholder="Remark"
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.5rem',
                                                                fontSize: '0.9rem',
                                                                background: 'rgba(255,255,255,0.05)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '6px',
                                                                color: '#fff'
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{
                                background: 'rgba(59, 130, 246, 0.05)',
                                padding: '1.25rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                display: 'flex',
                                gap: '1rem',
                                color: '#93c5fd',
                                alignItems: 'center'
                            }}>
                                <AlertCircle size={20} />
                                <span style={{ fontSize: '0.9rem' }}>
                                    분류 확인: 상태값(Pass/Pending 등)이 엑셀 단어에 맞춰 자동 매핑되었습니다. 이상이 없다면 저장해 주세요.
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.5rem 2rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '1rem',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <button className="btn btn-secondary" onClick={onClose} style={{ borderRadius: '10px' }}>취선</button>
                    {parsedData.length > 0 && (
                        <button className="btn btn-primary" onClick={handleSave} style={{ padding: '0.8rem 2.5rem', borderRadius: '10px', fontWeight: 700 }}>
                            <Save size={18} />
                            {parsedData.length}개 데이터 일괄 저장
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
