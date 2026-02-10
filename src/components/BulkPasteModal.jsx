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
        } else if (type === 'SPECIAL') {
            // Parse free-form text for Special Containers
            parseFreeFormText(textToParse);
        } else {
            // For PTI, require tab-delimited data
            parseTabDelimitedData(textToParse);
        }
    };

    const parseFreeFormText = (text) => {
        // Split by numbered items (1., 2., 3., etc.) - handle dots and tabs/spaces
        const itemPattern = /(?:^|\n)\s*\d+\.?\s+/;
        const items = text.split(itemPattern).filter(item => item.trim());

        const newData = items.map((item, idx) => {
            // Extract booking number
            const bookingMatch = item.match(/(HASLK\d{11}|SNKO\d{12})/i);
            const bookingNo = bookingMatch ? bookingMatch[0].toUpperCase() : '';

            let shippingLine = '';
            if (bookingNo.startsWith('HASL')) shippingLine = 'HAL';
            else if (bookingNo.startsWith('SNKO')) shippingLine = 'SKR';

            // Extract pickup date (M/D or MM/DD format)
            // Look for date following "픽업 날짜" or just a date pattern
            const dateMatch = item.match(/(?:픽업\s*날짜\s*[:：]\s*)?(\d{1,2})[\/\-.](\d{1,2})(?!\d)/);
            let pickupDate = '';
            if (dateMatch) {
                const currentYear = new Date().getFullYear();
                const month = dateMatch[1].padStart(2, '0');
                const day = dateMatch[2].padStart(2, '0');
                pickupDate = `${currentYear}-${month}-${day}`;
            }

            // Extract container numbers (format: 4 letters + 7 digits)
            const containerRegex = /\b([A-Z]{4}\d{7})\b/ig;
            const foundContainers = [...item.matchAll(containerRegex)].map(m => m[1].toUpperCase());

            // Extract size and quantity
            // Pattern: "42PC X 1", "22PC  X 3", etc. (handles multiple spaces)
            const sizeQtyMatch = item.match(/(\d{2}(?:PC|UT|FLAT|FR|OT))\s*[xX*×]\s*(\d{1,2})/i) ||
                item.match(/사이즈\s*[:：]\s*(\d{2}(?:PC|UT|FLAT|FR|OT))\s*[xX*×]\s*(\d{1,2})/i);
            let size = '42PC';
            let quantity = 1;

            if (sizeQtyMatch) {
                const sizeStr = sizeQtyMatch[1].toUpperCase();
                quantity = parseInt(sizeQtyMatch[2], 10);

                // Normalize size
                if (sizeStr.match(/^(20|22).*(PC|FLAT|FR)/i)) size = '22PC';
                else if (sizeStr.match(/^(20|22).*(UT|OT)/i)) size = '22UT';
                else if (sizeStr.match(/^40.*(PC|FLAT|FR)/i)) size = '42PC';
                else if (sizeStr.match(/^45.*(PC|FLAT|FR)/i)) size = '45PC';
                else if (sizeStr.match(/^(40|42).*(UT|OT)/i)) size = '42UT';
                else size = sizeStr;
            } else {
                // Try fallback for size without quantity if "X" is missing
                const sizeOnlyMatch = item.match(/(\d{2}(?:PC|UT|FLAT|FR|OT))/i);
                if (sizeOnlyMatch) {
                    const sizeStr = sizeOnlyMatch[1].toUpperCase();
                    if (sizeStr.match(/^(20|22).*(PC|FLAT|FR)/i)) size = '22PC';
                    else if (sizeStr.match(/^(20|22).*(UT|OT)/i)) size = '22UT';
                    else if (sizeStr.match(/^40.*(PC|FLAT|FR)/i)) size = '42PC';
                    else if (sizeStr.match(/^45.*(PC|FLAT|FR)/i)) size = '45PC';
                    else if (sizeStr.match(/^(40|42).*(UT|OT)/i)) size = '42UT';
                    else size = sizeStr;
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
                        customer: '',
                        bookingNo: bookingNo,
                        containerNo: containerNo,
                        size: size,
                        temperature: '',
                        vent: '',
                        humidity: '',
                        requestDate: new Date().toISOString().split('T')[0],
                        pickupDate: pickupDate,
                        ptiStatus: 'In Progress', // Has container number
                        remarks: '',
                        pickupStatus: 'Not Picked Up',
                        type: 'SPECIAL'
                    });
                });
            } else {
                // If no container numbers, create records based on quantity
                for (let i = 0; i < quantity; i++) {
                    records.push({
                        id: `bulk-${Date.now()}-${idx}-${i}`,
                        shippingLine: shippingLine,
                        location: '',
                        customer: '',
                        bookingNo: bookingNo,
                        containerNo: '',
                        size: size,
                        temperature: '',
                        vent: '',
                        humidity: '',
                        requestDate: new Date().toISOString().split('T')[0],
                        pickupDate: pickupDate,
                        ptiStatus: 'Pending', // No container number yet
                        remarks: '',
                        pickupStatus: 'Not Picked Up',
                        type: 'SPECIAL'
                    });
                }
            }

            return records;
        }).flat().filter(Boolean);

        setParsedData(newData);
    };

    const parseTabDelimitedData = (text) => {
        const lines = text.split('\n');
        const newData = lines
            .map(line => line.split('\t'))
            .filter(cols => cols.length >= 2)
            .map((cols, idx) => {
                // Skip header if present
                const firstCol = cols[0]?.toUpperCase() || '';
                if (idx === 0 && (firstCol.includes('BOOKING') || firstCol.includes('BKG'))) {
                    return null;
                }

                // Column mapping based on user's Excel format:
                // PTI: 0:BKG | 1:CNTR | 2:SIZE | 3:TEMP | 4:VENT | 5:HUM | 6:REQ | 7:PICK
                // SPECIAL: More flexible - can have BKG, CNTR, SIZE, and dates anywhere

                let bookingNo = cols[0]?.trim() || '';
                let shippingLine = '';
                let location = '';
                let customer = '';

                // Booking No -> Shipping Line Mapping
                const bkgUpper = bookingNo.toUpperCase();
                if (bkgUpper.startsWith('HASL')) shippingLine = 'HAL';
                else if (bkgUpper.startsWith('SNKO')) shippingLine = 'SKR';

                // Auto-detect Location from all columns
                const allText = cols.join(' ').toUpperCase();
                if (allText.includes('SNCT')) location = 'SNCT';
                else if (allText.includes('HJIT')) location = 'HJIT';
                else if (allText.includes('ICT') && !allText.includes('HJIT')) location = 'ICT';
                else if (allText.includes('E1')) location = 'E1';

                // Auto-detect Customer from columns (look for common customer patterns)
                // Check columns beyond the standard ones for customer names
                for (let i = 0; i < cols.length; i++) {
                    const col = cols[i]?.trim() || '';
                    // Skip if it's a booking, container, size, or date
                    if (col.match(/^(HASL|SNKO)/i)) continue;
                    if (col.match(/^[A-Z]{4}\d{7}$/)) continue;
                    if (col.match(/^\d{1,2}[\/\-\.]\d{1,2}/)) continue;
                    if (col.match(/^(22|42|45)(PC|UT|RE)/i)) continue;
                    if (col.match(/^(SNCT|HJIT|ICT|E1)$/i)) continue;
                    if (col.match(/^\d+$/)) continue; // Skip pure numbers
                    if (col.length > 2 && col.length < 50 && !customer) {
                        customer = col;
                    }
                }

                // Auto-detect status based on container number presence
                let status = 'Pending';
                const containerNo = cols[1]?.trim() || '';
                if (containerNo && containerNo.length > 0) {
                    status = 'In Progress';
                }

                // Parse dates in MM/DD format
                const parseDateMMDD = (dateStr) => {
                    if (!dateStr || dateStr.trim() === '') return '';

                    const trimmed = dateStr.trim();
                    const currentYear = new Date().getFullYear();

                    // Try MM/DD format
                    const mmddMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})$/);
                    if (mmddMatch) {
                        const month = mmddMatch[1].padStart(2, '0');
                        const day = mmddMatch[2].padStart(2, '0');
                        return `${currentYear}-${month}-${day}`;
                    }

                    // Try YYYY-MM-DD or YYYY/MM/DD format
                    const fullDateMatch = trimmed.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
                    if (fullDateMatch) {
                        const year = fullDateMatch[1];
                        const month = fullDateMatch[2].padStart(2, '0');
                        const day = fullDateMatch[3].padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }

                    // Return as-is if already in correct format or unparseable
                    return trimmed;
                };

                // Parse size - normalize to standard format
                let size = cols[2]?.trim() || '';
                if (type === 'SPECIAL') {
                    // Normalize size formats for Special Containers
                    const sizeUpper = size.toUpperCase();
                    if (sizeUpper.match(/^(20|22).*(PC|FLAT|FR)/i)) size = '22PC';
                    else if (sizeUpper.match(/^(20|22).*(UT|OT|OPEN)/i)) size = '22UT';
                    else if (sizeUpper.match(/^40.*(PC|FLAT|FR)/i)) size = '42PC';
                    else if (sizeUpper.match(/^45.*(PC|FLAT|FR)/i)) size = '45PC';
                    else if (sizeUpper.match(/^(40|42).*(UT|OT|OPEN)/i)) size = '42UT';
                    else if (!size) size = '42PC'; // Default
                } else {
                    if (!size) size = '40RE'; // Default for PTI
                }

                return {
                    id: `bulk-${Date.now()}-${idx}`,
                    shippingLine: shippingLine,
                    location: location,
                    customer: customer,
                    bookingNo: bookingNo,
                    containerNo: containerNo,
                    size: size,
                    temperature: type === 'SPECIAL' ? '' : (cols[3]?.trim() || ''),
                    vent: type === 'SPECIAL' ? '' : (cols[4]?.trim() || 'CLOSED'),
                    humidity: type === 'SPECIAL' ? '' : (cols[5]?.trim() || ''),
                    requestDate: type === 'SPECIAL'
                        ? new Date().toISOString().split('T')[0]
                        : (parseDateMMDD(cols[6]) || new Date().toISOString().split('T')[0]),
                    pickupDate: type === 'SPECIAL'
                        ? (parseDateMMDD(cols[3]) || parseDateMMDD(cols[4]) || parseDateMMDD(cols[5]) || parseDateMMDD(cols[6]) || parseDateMMDD(cols[7]) || '')
                        : (parseDateMMDD(cols[7]) || ''),
                    ptiStatus: status,
                    remarks: '',
                    pickupStatus: 'Not Picked Up',
                    type: type
                };
            })
            .filter(Boolean);

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

    const updateField = (index, field, value) => {
        setParsedData(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
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
                                        {parsedData.map((row, i) => {
                                            // Format dates as MM/DD
                                            const formatDateMMDD = (dateStr) => {
                                                if (!dateStr) return '';
                                                try {
                                                    const date = new Date(dateStr);
                                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                                    const day = String(date.getDate()).padStart(2, '0');
                                                    return `${month}/${day}`;
                                                } catch {
                                                    return dateStr;
                                                }
                                            };

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
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                                                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>{row.shippingLine}</td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <select
                                                            value={row.location}
                                                            onChange={(e) => updateField(i, 'location', e.target.value)}
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
                                                            value={row.customer}
                                                            onChange={(e) => updateField(i, 'customer', e.target.value)}
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
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.9rem' }}>{row.bookingNo}</td>
                                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--primary)', fontSize: '0.9rem' }}>{row.containerNo}</td>
                                                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>{row.size}</td>
                                                    {type === 'PTI' && (
                                                        <>
                                                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#60a5fa' }}>{row.temperature}</td>
                                                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#fbbf24' }}>{formatDateMMDD(row.requestDate)}</td>
                                                        </>
                                                    )}
                                                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#fbbf24' }}>{formatDateMMDD(row.pickupDate)}</td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <select
                                                            value={row.ptiStatus}
                                                            onChange={(e) => updateField(i, 'ptiStatus', e.target.value)}
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
                                                            onChange={(e) => updateField(i, 'remarks', e.target.value)}
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
