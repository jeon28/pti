import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Mail } from 'lucide-react';
import { getEmailSettings, getPTIRecords } from '../lib/storage';

export default function PTIForm({ record, data, onClose, onSave, standalone = false }) {
    // Helpers for defaults
    const getToday = () => new Date().toISOString().split('T')[0];
    const getTwoDaysLater = () => {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        return d.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        shippingLine: '',
        customer: '',
        bookingNo: '',
        size: '40RE', // Changed default from SELECT to 40RE
        location: '',
        requestDate: getToday(),
        ptiStatus: 'Pending',
        pickupStatus: 'Not Picked Up',
        pickupDate: getTwoDaysLater(),
        temperature: '',
        vent: 'CLOSED',
        humidity: '',
        email: '',
        remarks: ''
    });

    // Quantity and Container List logic
    const [qty20, setQty20] = useState(0);
    const [qty40, setQty40] = useState(1);
    const [containerList, setContainerList] = useState([{ no: '', size: '40RE' }]); // [{no, size}]
    const [isManualQuantity, setIsManualQuantity] = useState(false);
    const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
    const [smartText, setSmartText] = useState('');

    useEffect(() => {
        if (record) {
            // Edit mode: populate form with the group's containers
            const load = async () => {
                const allRecords = await getPTIRecords();
                const group = allRecords.filter(r => r.bookingNo === record.bookingNo);

                setFormData({
                    ...record,
                    pickupDate: record.pickupDate || getTwoDaysLater(),
                    vent: record.vent || 'CLOSED'
                });

                const initialList = group.length > 0
                    ? group.map(r => ({ no: r.containerNo || '', size: r.size || '40RE' }))
                    : [{ no: record.containerNo || '', size: record.size || '40RE' }];

                setContainerList(initialList);
                setQty20(initialList.filter(c => c.size === '20RE').length);
                setQty40(initialList.filter(c => c.size === '40RE').length);
            };
            load();
        } else {
            // New mode defaults
            setFormData(prev => ({
                ...prev,
                requestDate: getToday(),
                pickupDate: getTwoDaysLater(),
                vent: 'CLOSED',
                shippingLine: 'SKR', // Default selection to trigger prefix logic if needed
                location: '', // Set empty to force selection
                size: '40RE'
            }));
            const defaultList = [{ no: '', size: '40RE' }];
            setContainerList(defaultList);
            setQty20(0);
            setQty40(1);
        }
    }, [record]);

    // Handle prefix logic for Booking No and Shipping Line auto-sync
    useEffect(() => {
        if (!record && formData.bookingNo) {
            const bookingLower = formData.bookingNo.toLowerCase();
            if (bookingLower.startsWith('hasl') && formData.shippingLine !== 'HAL') {
                setFormData(prev => ({ ...prev, shippingLine: 'HAL' }));
            } else if (bookingLower.startsWith('snko') && formData.shippingLine !== 'SKR') {
                setFormData(prev => ({ ...prev, shippingLine: 'SKR' }));
            }
        }
    }, [formData.bookingNo, formData.shippingLine, record]);

    useEffect(() => {
        if (!record && formData.shippingLine) {
            let prefix = '';
            if (formData.shippingLine === 'HAL') prefix = 'HASLK';
            else if (formData.shippingLine === 'SKR') prefix = 'SNKO';

            // Only set if bookingNo is empty or starts with old prefix
            if (!formData.bookingNo || (formData.shippingLine === 'HAL' && formData.bookingNo.startsWith('SNKO')) || (formData.shippingLine === 'SKR' && formData.bookingNo.startsWith('HASLK'))) {
                setFormData(prev => ({ ...prev, bookingNo: prefix }));
            }
        }
    }, [formData.shippingLine, record]);

    const handleQtyChange = (size, val) => {
        const qty = parseInt(val, 10) || 0;
        if (size === '20RE') setQty20(qty);
        else setQty40(qty);

        adjustContainerList(size === '20RE' ? qty : qty20, size === '40RE' ? qty : qty40);
    };

    const adjustContainerList = (newQty20, newQty40) => {
        setContainerList(prev => {
            const current20s = prev.filter(c => c.size === '20RE');
            const current40s = prev.filter(c => c.size === '40RE');

            let next20s = [...current20s];
            if (newQty20 > next20s.length) {
                next20s = [...next20s, ...Array(newQty20 - next20s.length).fill(null).map(() => ({ no: '', size: '20RE' }))];
            } else {
                next20s = next20s.slice(0, newQty20);
            }

            let next40s = [...current40s];
            if (newQty40 > next40s.length) {
                next40s = [...next40s, ...Array(newQty40 - next40s.length).fill(null).map(() => ({ no: '', size: '40RE' }))];
            } else {
                next40s = next40s.slice(0, newQty40);
            }

            return [...next20s, ...next40s];
        });
    };

    const handleContainerChange = (index, value) => {
        const newList = [...containerList];
        newList[index] = { ...newList[index], no: value };
        setContainerList(newList);

        // Auto-update status: If at least one container number is entered, set to 'In Progress'
        // If all are empty, set to 'Pending'. (Don't auto-change if it's already Pass or Cancelled)
        setFormData(prev => {
            if (prev.ptiStatus === 'Pass' || prev.ptiStatus === 'Cancelled') return prev;

            const hasAnyNo = newList.some(c => c.no && c.no.trim().length > 0);
            return {
                ...prev,
                ptiStatus: hasAnyNo ? 'In Progress' : 'Pending'
            };
        });
    };

    const handleSmartPaste = (text) => {
        if (!text) return;
        const newData = { ...formData };

        // 1. Booking No: HASLK + 11 digits or SNKO + 12 digits
        const bookingMatch = text.match(/(HASLK\d{11}|SNKO\d{12})/i);
        if (bookingMatch) {
            newData.bookingNo = bookingMatch[0].toUpperCase();
        }

        // 2. Size QTY: 40RF X 1, 20RF 1대, 4** X 수량, 2*** X 수량
        // Improved regex to be more specific and avoid accidental matches with temperature or dates
        const qty40Match = text.match(/(?:40(?:RF|RE|'|FT)?|45(?:RF|RE|'|FT)?)\s*(?:[xX*:]|[대|UNIT|개])?\s*([1-9]|10|12|15)\b/i);
        if (qty40Match) {
            const q = Math.min(parseInt(qty40Match[1], 10), 15); // Safety cap at 15
            setQty40(q);
            adjustContainerList(qty20, q);
        } else if (!text.match(/(?:20(?:RF|RE|'|FT)?|22(?:RF|RE|'|FT)?)/i)) {
            // If No 40' info found AND no 20' info found either, default to 1 unit of 40'
            // This satisfies "1개를 디폴트로 나오게 해줘"
            setQty40(1);
            setQty20(0);
            adjustContainerList(0, 1);
        }

        const qty20Match = text.match(/(?:20(?:RF|RE|'|FT)?|22(?:RF|RE|'|FT)?)\s*(?:[xX*:]|[대|UNIT|개])?\s*([1-9]|10|12|15)\b/i);
        if (qty20Match) {
            const q = Math.min(parseInt(qty20Match[1], 10), 15); // Safety cap at 15
            setQty20(q);
            const currentQty40 = qty40Match ? Math.min(parseInt(qty40Match[1], 10), 15) : qty40;
            adjustContainerList(q, currentQty40);
        }

        // 3. Temp: Temp **.00, *, -**, **도, +**, -**
        let foundTemp = null;

        // Priority 1: Explicit labels like "Temp: -18" or "온도 20"
        const tempLabeledMatch = text.match(/(?:Temp|온도)\s*[:=]?\s*([+-]?\d+(?:\.\d+)?)/i);
        // Priority 2: Numbers with units like "15도", "25'C", "20C"
        const tempUnitMatch = text.match(/\b([+-]?\d{1,2}(?:\.\d+)?)\s*(?:도|'C|C|°C)\b/i);
        // Priority 3: Clearly signed numbers like "+5" or "-18" (excluding those that might be part of dates)
        const tempSignedMatch = text.match(/(?<![\d/-])[+-]\d{1,2}(?:\.\d+)?(?!\d)/);

        if (tempLabeledMatch) foundTemp = tempLabeledMatch[1];
        else if (tempUnitMatch) foundTemp = tempUnitMatch[1];
        else if (tempSignedMatch) foundTemp = tempSignedMatch[0];

        if (foundTemp) {
            // Remove + sign for display if needed, or keep it as user requested
            newData.temperature = foundTemp;
        }

        // 4. VENT: Close, **%, 0%, 환기구, 개폐구
        const ventMatch = text.match(/(?:VENT|환기구|개폐구|환기|VENTILATION)\s*[:=]?\s*(CLOSE|CLOSED|OPEN|\d+)\s*%?/i);
        if (ventMatch) {
            const val = ventMatch[1].toUpperCase();
            if (val === 'CLOSE' || val === 'CLOSED' || val === '0') {
                newData.vent = 'CLOSED';
            } else {
                newData.vent = val;
            }
        } else if (text.match(/CLOSE|CLOSED/i)) {
            newData.vent = 'CLOSED';
        }

        // 5. Pickup Date: YYYY.MM.DD, YY/MM/DD, MM/DD
        const dateMatch = text.match(/\b(\d{2,4})[./-](\d{1,2})[./-](\d{1,2})\b/);
        if (dateMatch) {
            let [_, y, m, d] = dateMatch;
            if (y.length === 2) y = "20" + y;
            newData.pickupDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else {
            const shortDateMatch = text.match(/\b(\d{1,2})[./-](\d{1,2})\b/);
            if (shortDateMatch) {
                const year = new Date().getFullYear();
                newData.pickupDate = `${year}-${shortDateMatch[1].padStart(2, '0')}-${shortDateMatch[2].padStart(2, '0')}`;
            }
        }

        setFormData(newData);
        setSmartText('');
        setIsSmartPasteOpen(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };

            // Auto-populate email when customer is selected
            if (name === 'customer' && value && data) {
                const recentRecord = data.find(r => r.customer?.toLowerCase() === value.toLowerCase() && r.email);
                if (recentRecord) {
                    next.email = recentRecord.email;
                }
            }

            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate Required Fields
        if (!formData.bookingNo || formData.bookingNo.trim() === '' ||
            formData.bookingNo === 'SNKO' || formData.bookingNo === 'HASLK') {
            alert('Please enter a valid Booking Number.');
            return;
        }
        if (!formData.location) {
            alert('Please select a Location.');
            return;
        }
        if (formData.temperature === undefined || formData.temperature === '') {
            alert('Please enter the Temperature.');
            return;
        }
        if (!formData.size || formData.size === 'SELECT') {
            alert('Please select a Container Size.');
            return;
        }

        // Check for duplicate Booking No
        const existingRecords = await getPTIRecords();
        const isEditing = !!record;

        // Find if this booking number already exists (excluding the current record if editing)
        const duplicate = existingRecords.find(r =>
            r.bookingNo?.trim().toLowerCase() === formData.bookingNo.trim().toLowerCase() &&
            (!isEditing || r.bookingNo !== record.bookingNo)
        );

        if (duplicate) {
            const confirmMsg = `주의: [${formData.bookingNo}] 부킹번호가 이미 시스템에 존재합니다.\n\n동일한 부킹번호로 계속 진행하시겠습니까?`;
            if (!window.confirm(confirmMsg)) {
                return;
            }
        }

        // Check for duplicate Container Numbers within the form (Prevent duplicates in same booking)
        const cleanContainers = containerList.map(c => c.no).filter(n => n && n.trim() !== '');
        const internalDuplicates = [...new Set(cleanContainers.filter((item, index) => cleanContainers.indexOf(item) !== index))];

        if (internalDuplicates.length > 0) {
            alert(`오류: 동일 부킹 내에 중복된 컨테이너 번호가 있습니다 ([${internalDuplicates.join(', ')}]).\n동일한 번호는 입력하실 수 없으며, 중복을 제거해 주세요.`);
            return;
        }

        // Check for duplicate Container Numbers in other bookings
        const allOtherRecords = existingRecords.filter(r => r.bookingNo !== formData.bookingNo);
        const externalDuplicates = cleanContainers.filter(c =>
            allOtherRecords.some(r => r.containerNo?.trim().toLowerCase() === c.trim().toLowerCase())
        );

        if (externalDuplicates.length > 0) {
            if (!window.confirm(`주의: [${externalDuplicates.join(', ')}] 컨테이너 번호가 이미 다른 부킹에 존재합니다.\n\n계속 진행하시겠습니까?`)) {
                return;
            }
        }

        const determineStatus = (cntr) => {
            return (cntr && cntr.trim().length > 0) ? 'In Progress' : 'Pending';
        };

        const prepareRecords = () => {
            return containerList.map(cntr => {
                let newStatus = formData.ptiStatus;
                if (newStatus !== 'Pass') {
                    newStatus = determineStatus(cntr.no);
                }
                return {
                    ...formData,
                    containerNo: cntr.no,
                    size: cntr.size,
                    ptiStatus: newStatus,
                    id: null
                };
            });
        };

        const recordsToSave = prepareRecords();
        onSave(recordsToSave.length === 1 && !record ? recordsToSave[0] : recordsToSave);
    };

    const handleSendEmail = async () => {
        const settings = await getEmailSettings();
        const recipients = [];
        const cc = [];

        settings.recipients.forEach(rule => {
            let match = false;
            const val = rule.matchValue.toLowerCase();
            if (rule.matchType === 'Location' && formData.location.toLowerCase().includes(val)) match = true;
            if (rule.matchType === 'Shipping Line' && formData.shippingLine.toLowerCase().includes(val)) match = true;
            if (rule.matchType === 'Customer' && formData.customer.toLowerCase().includes(val)) match = true;

            if (match) {
                if (rule.emailType === 'To') recipients.push(rule.emailAddress);
                if (rule.emailType === 'CC') cc.push(rule.emailAddress);
            }
        });

        // Add the customer's email from the form to CC
        if (formData.email) {
            const extraEmails = formData.email.split(/[,;]/).map(e => e.trim()).filter(Boolean);
            extraEmails.forEach(e => {
                if (!cc.includes(e)) cc.push(e);
            });
        }

        if (recipients.length === 0 && cc.length === 0) {
            alert('No matching email rules found. Please check Email Settings.');
            return;
        }

        let subject = settings.template.subject;
        let body = settings.template.body;
        const replaceAll = (str, key, value) => str.split(`{${key}}`).join(value || '');

        const totalQty = qty20 + qty40;
        const containerSummary = containerList.length > 1
            ? `${containerList[0].no} + ${containerList.length - 1} containers (${qty20 > 0 ? qty20 + "x20' " : ""}${qty40 > 0 ? qty40 + "x40'" : ""})`.trim()
            : containerList[0]?.no || '';

        const dataMap = {
            location: formData.location,
            bookingNo: formData.bookingNo,
            containerNo: containerSummary,
            qty: totalQty,
            size: `${qty20 > 0 ? qty20 + "x20' " : ""}${qty40 > 0 ? qty40 + "x40'" : ""}`.trim(),
            temperature: formData.temperature,
            vent: formData.vent,
            pickupDate: formData.pickupDate,
            customer: formData.customer,
            shippingLine: formData.shippingLine
        };

        Object.keys(dataMap).forEach(key => {
            subject = replaceAll(subject, key, dataMap[key]);
            body = replaceAll(body, key, dataMap[key]);
        });

        let url = `mailto:${recipients.join(';')}?cc=${cc.join(';')}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        const currentRemarks = formData.remarks || '';
        if (!currentRemarks.includes('이메일 발송')) {
            const newRemarks = currentRemarks ? `${currentRemarks}\n이메일 발송` : '이메일 발송';
            setFormData(prev => ({ ...prev, remarks: newRemarks }));
        }

        window.location.href = url;
    };

    return (
        <div style={standalone ? { width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' } : {
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="glass-panel" style={{ width: '700px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{record ? 'Edit PTI Record' : 'New PTI Request'}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setIsSmartPasteOpen(!isSmartPasteOpen)} style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#34d399',
                            cursor: 'pointer',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            fontWeight: 600
                        }}>
                            스마트 입력
                        </button>
                        <button onClick={handleSendEmail} style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa',
                            cursor: 'pointer',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 600
                        }}>
                            <Mail size={18} />
                            Send Outlook Email
                        </button>
                        {!standalone && (
                            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
                    {isSmartPasteOpen && (
                        <div style={{ marginBottom: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>텍스트 붙여넣기 (내용을 복사해서 넣어주세요)</label>
                            <textarea
                                value={smartText}
                                onChange={(e) => {
                                    setSmartText(e.target.value);
                                    handleSmartPaste(e.target.value);
                                }}
                                placeholder="이메일이나 메시지 내용을 여기에 붙여넣으세요..."
                                style={{
                                    width: '100%',
                                    height: '80px',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    fontSize: '0.8rem',
                                    color: 'white',
                                    resize: 'none'
                                }}
                            />
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>* 부킹번호, 수량, 온도, 벤동, 픽업일 등을 자동으로 인식하여 입력합니다.</p>
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                        {/* Location */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Location *</label>
                            <select name="location" value={formData.location} onChange={handleChange} required>
                                <option value="" disabled>Select Location</option>
                                <option value="SNCT">SNCT</option>
                                <option value="HJIT">HJIT</option>
                                <option value="ICT">ICT</option>
                                <option value="E1">E1</option>
                            </select>
                        </div>

                        {/* Booking No - Now in place of Shipping Line */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Booking No *</label>
                            <input name="bookingNo" value={formData.bookingNo} onChange={handleChange} required placeholder="Booking No (SNKO... or HASLK...)" />
                        </div>

                        {/* Customer */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Customer</label>
                            <input
                                name="customer"
                                value={formData.customer}
                                onChange={handleChange}
                                required
                                list="customer-history"
                                autoComplete="off"
                            />
                            <datalist id="customer-history">
                                {[...new Set(data.map(r => r.customer).filter(Boolean))].map(c => (
                                    <option key={c} value={c} />
                                ))}
                            </datalist>
                        </div>

                        {/* Customer Email */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Customer Email (for CC)</label>
                            <input
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="customer@example.com"
                            />
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>* Multiple emails can be separated by commas</p>
                        </div>

                        {/* Container Details & Input + Statuses */}
                        {/* Size & Qty Selection */}
                        <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ minWidth: '40px', fontWeight: 600 }}>20'</span>
                                    <select
                                        value={qty20}
                                        onChange={(e) => handleQtyChange('20RE', e.target.value)}
                                        style={{ width: '80px', padding: '0.4rem' }}
                                    >
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ minWidth: '40px', fontWeight: 600 }}>40'</span>
                                    <select
                                        value={qty40}
                                        onChange={(e) => handleQtyChange('40RE', e.target.value)}
                                        style={{ width: '80px', padding: '0.4rem' }}
                                    >
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>PTI Status</label>
                                <select name="ptiStatus" value={formData.ptiStatus} onChange={handleChange} style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Pass">Pass</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Pickup Status</label>
                                <select name="pickupStatus" value={formData.pickupStatus} onChange={handleChange} style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                                    <option value="Not Picked Up">Not Picked Up</option>
                                    <option value="Picked Up">Picked Up</option>
                                </select>
                            </div>
                        </div>

                        {/* Container Inputs List */}
                        <div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 600 }}>Container Numbers</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {containerList.map((cntr, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            background: cntr.size === '20RE' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                            color: cntr.size === '20RE' ? '#60a5fa' : '#34d399',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            minWidth: '35px',
                                            textAlign: 'center'
                                        }}>
                                            {cntr.size === '20RE' ? "20'" : "40'"}
                                        </span>
                                        <input
                                            placeholder={`Container No`}
                                            value={cntr.no}
                                            onChange={(e) => handleContainerChange(idx, e.target.value)}
                                            style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem' }}
                                        />
                                    </div>
                                ))}
                                {containerList.length === 0 && (
                                    <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                                        수량을 선택해 주세요.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tech Specs (3 per row) */}
                        <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Temperature (°C) *</label>
                                <input name="temperature" value={formData.temperature} onChange={handleChange} placeholder="-18.0" required />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Vent (%)</label>
                                <input name="vent" value={formData.vent} onChange={handleChange} placeholder="CLOSED" />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Humidity (%)</label>
                                <input name="humidity" value={formData.humidity || ''} onChange={handleChange} placeholder="Optional" />
                            </div>
                        </div>

                        {/* Dates (2 per row) */}
                        <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Request Date</label>
                                <input
                                    type="date"
                                    name="requestDate"
                                    value={formData.requestDate}
                                    onChange={handleChange}
                                    onClick={(e) => e.target.showPicker?.()}
                                    style={{ cursor: 'pointer' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Pickup Date</label>
                                <input
                                    type="date"
                                    name="pickupDate"
                                    value={formData.pickupDate}
                                    onChange={handleChange}
                                    onClick={(e) => e.target.showPicker?.()}
                                    style={{ cursor: 'pointer' }}
                                />
                            </div>
                        </div>


                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Remarks</label>
                            <textarea
                                name="remarks"
                                value={formData.remarks || ''}
                                onChange={handleChange}
                                placeholder="Additional notes..."
                                style={{ width: '100%', minHeight: '80px', fontFamily: 'inherit' }}
                            />
                        </div>

                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            <Save size={18} />
                            Save Record
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
