import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Mail } from 'lucide-react';
import { getPTIRecords, getEmailSettings } from '../lib/storage';

export default function SpecialContainerForm({ record, data, onClose, onSave }) {
    // Helpers for defaults
    const getToday = () => new Date().toISOString().split('T')[0];
    const getTwoDaysLater = () => {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        return d.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        shippingLine: 'SKR',
        customer: '',
        bookingNo: '',
        email: '',
        location: '',
        requestDate: getToday(),
        ptiStatus: 'Pending',
        pickupStatus: 'Not Picked Up',
        pickupDate: getTwoDaysLater(),
        remarks: '',
        type: 'SPECIAL'
    });

    // Selection state for series
    const [series2, setSeries2] = useState({ type: '22PC', qty: 0 });
    const [series4, setSeries4] = useState({ type: '42PC', qty: 1 });

    const [containerList, setContainerList] = useState([]);
    const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
    const [smartText, setSmartText] = useState('');

    useEffect(() => {
        if (record) {
            const load = async () => {
                const allRecords = await getPTIRecords('SPECIAL');
                const group = allRecords.filter(r => r.bookingNo === record.bookingNo);

                setFormData({
                    ...record,
                    pickupDate: record.pickupDate || getTwoDaysLater(),
                    type: 'SPECIAL'
                });

                const s2Record = group.find(r => ['22PC', '22UT'].includes(r.size));
                const s4Record = group.find(r => ['42PC', '45PC', '42UT'].includes(r.size));

                if (s2Record) {
                    setSeries2({
                        type: s2Record.size,
                        qty: group.filter(r => r.size === s2Record.size).length
                    });
                } else {
                    setSeries2({ type: '22PC', qty: 0 });
                }

                if (s4Record) {
                    setSeries4({
                        type: s4Record.size,
                        qty: group.filter(r => r.size === s4Record.size).length
                    });
                } else {
                    setSeries4({ type: '42PC', qty: 0 });
                }

                const initialList = group.length > 0
                    ? group.map(r => ({ no: r.containerNo || '', size: r.size || '42PC' }))
                    : [{ no: record.containerNo || '', size: record.size || '42PC' }];

                setContainerList(initialList);
            };
            load();
        } else {
            setFormData(prev => ({
                ...prev,
                requestDate: getToday(),
                pickupDate: getTwoDaysLater(),
                shippingLine: 'SKR',
                location: '',
                type: 'SPECIAL'
            }));
            setSeries2({ type: '22PC', qty: 0 });
            setSeries4({ type: '42PC', qty: 1 });
            setContainerList([{ no: '', size: '42PC' }]);
        }
    }, [record]);

    useEffect(() => {
        const newList = [];
        for (let i = 0; i < series2.qty; i++) {
            const existing = containerList.find(c => c.size === series2.type && !newList.some(nl => nl === c));
            newList.push(existing ? existing : { no: '', size: series2.type });
        }
        for (let i = 0; i < series4.qty; i++) {
            const existing = containerList.find(c => c.size === series4.type && !newList.some(nl => nl === c));
            newList.push(existing ? existing : { no: '', size: series4.type });
        }
        setContainerList(newList);
    }, [series2, series4]);

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

        if (formData.email) {
            const extraEmails = formData.email.split(/[,;]/).map(e => e.trim()).filter(Boolean);
            extraEmails.forEach(e => { if (!cc.includes(e)) cc.push(e); });
        }

        if (recipients.length === 0 && cc.length === 0) {
            alert('No matching email rules found. Please check Email Settings.');
            return;
        }

        let subject = settings.specialTemplate?.subject || settings.template.subject;
        let body = settings.specialTemplate?.body || settings.template.body;
        const replaceAll = (str, key, value) => str.split(`{${key}}`).join(value || '');

        const totalQty = series2.qty + series4.qty;
        const sizeSummary = `${series2.qty > 0 ? series2.qty + 'x' + series2.type + ' ' : ''}${series4.qty > 0 ? series4.qty + 'x' + series4.type : ''}`.trim();
        const containerSummary = containerList.length > 1
            ? `${containerList[0].no} + ${containerList.length - 1} containers (${sizeSummary})`
            : containerList[0]?.no || '';

        const dataMap = {
            location: formData.location,
            bookingNo: formData.bookingNo,
            containerNo: containerSummary,
            qty: totalQty,
            size: sizeSummary,
            temperature: 'N/A',
            vent: 'N/A',
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

    const handleSmartPaste = (text) => {
        if (!text) return;
        const newData = { ...formData };

        const bookingMatch = text.match(/(HASLK\d{11}|SNKO\d{12})/i);
        if (bookingMatch) newData.bookingNo = bookingMatch[0].toUpperCase();

        const sizeMatches = [
            { series: '2', type: '22PC', regex: /(?:20(?:FLAT|FR|PC)?|22PC)\s*(?:[xX*:]|[대|UNIT|개])?\s*(\d{1,2})\b/i },
            { series: '2', type: '22UT', regex: /(?:20(?:UT|OT)?|22UT)\s*(?:[xX*:]|[대|UNIT|개])?\s*(\d{1,2})\b/i },
            { series: '4', type: '42PC', regex: /(?:40(?:FLAT|FR|PC)?|42PC)\s*(?:[xX*:]|[대|UNIT|개])?\s*(\d{1,2})\b/i },
            { series: '4', type: '45PC', regex: /(?:45(?:FLAT|FR|PC)?|45PC|45UT)\s*(?:[xX*:]|[대|UNIT|개])?\s*(\d{1,2})\b/i },
            { series: '4', type: '42UT', regex: /(?:40(?:UT|OT)?|42UT)\s*(?:[xX*:]|[대|UNIT|개])?\s*(\d{1,2})\b/i }
        ];

        sizeMatches.forEach(m => {
            const match = text.match(m.regex);
            if (match) {
                if (m.series === '2') setSeries2({ type: m.type, qty: parseInt(match[1], 10) });
                else setSeries4({ type: m.type, qty: parseInt(match[1], 10) });
            }
        });

        const dateMatch = text.match(/\b(\d{2,4})[./-](\d{1,2})[./-](\d{1,2})\b/);
        if (dateMatch) {
            let [_, y, m, d] = dateMatch;
            if (y.length === 2) y = "20" + y;
            newData.pickupDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        setFormData(newData);
        setSmartText('');
        setIsSmartPasteOpen(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'customer' && value && data) {
                const recent = data.find(r => r.customer?.toLowerCase() === value.toLowerCase() && r.email);
                if (recent) next.email = recent.email;
            }
            return next;
        });
    };

    const handleContainerChange = (index, value) => {
        const newList = [...containerList];
        newList[index] = { ...newList[index], no: value };
        setContainerList(newList);

        setFormData(prev => {
            if (prev.ptiStatus === 'Pass' || prev.ptiStatus === 'Cancelled') return prev;
            const hasAnyNo = newList.some(c => c.no && c.no.trim().length > 0);
            return { ...prev, ptiStatus: hasAnyNo ? 'In Progress' : 'Pending' };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.bookingNo || formData.bookingNo.trim() === '') { alert('Please enter a valid Booking Number.'); return; }
        if (!formData.location) { alert('Please select a Location.'); return; }

        const recordsToSave = containerList.map(cntr => ({
            ...formData,
            containerNo: cntr.no,
            size: cntr.size,
            id: null
        }));
        onSave(recordsToSave.length === 1 && !record ? recordsToSave[0] : recordsToSave);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{ width: '750px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{record ? 'Edit Special Container' : 'New Special Container'}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setIsSmartPasteOpen(!isSmartPasteOpen)} style={{
                            background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#34d399', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600
                        }}>스마트 입력</button>
                        <button onClick={handleSendEmail} style={{
                            background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600
                        }}><Mail size={18} /> Send Email</button>
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
                    {isSmartPasteOpen && (
                        <div style={{ marginBottom: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>텍스트 붙여넣기</label>
                            <textarea
                                value={smartText}
                                onChange={(e) => { setSmartText(e.target.value); handleSmartPaste(e.target.value); }}
                                placeholder="내용을 붙여넣으세요..."
                                style={{ width: '100%', height: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.8rem', color: 'white', resize: 'none' }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Booking No *</label>
                            <input name="bookingNo" value={formData.bookingNo} onChange={handleChange} required placeholder="HASLK... or SNKO..." />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Customer</label>
                            <input name="customer" value={formData.customer} onChange={handleChange} required list="customer-list" />
                            <datalist id="customer-list">
                                {[...new Set(data.map(r => r.customer).filter(Boolean))].map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Customer Email (for CC)</label>
                            <input name="email" value={formData.email} onChange={handleChange} placeholder="customer@example.com" />
                        </div>

                        {/* Series Selection UI */}
                        <div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* 2 Series Selection */}
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <select
                                    value={series2.type}
                                    onChange={(e) => setSeries2(prev => ({ ...prev, type: e.target.value }))}
                                    style={{ width: '180px' }}
                                >
                                    <option value="22PC">22PC (FLAT RACK)</option>
                                    <option value="22UT">22UT (OPEN TOP)</option>
                                </select>
                                <select
                                    value={series2.qty}
                                    onChange={(e) => setSeries2(prev => ({ ...prev, qty: parseInt(e.target.value) }))}
                                    style={{ width: '70px' }}
                                >
                                    {[...Array(11).keys()].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>

                            {/* 4 Series Selection */}
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <select
                                    value={series4.type}
                                    onChange={(e) => setSeries4(prev => ({ ...prev, type: e.target.value }))}
                                    style={{ width: '180px' }}
                                >
                                    <option value="42PC">42PC (FLAT RACK)</option>
                                    <option value="45PC">45PC (SUPER RACK)</option>
                                    <option value="42UT">42UT (OPEN TOP)</option>
                                </select>
                                <select
                                    value={series4.qty}
                                    onChange={(e) => setSeries4(prev => ({ ...prev, qty: parseInt(e.target.value) }))}
                                    style={{ width: '70px' }}
                                >
                                    {[...Array(11).keys()].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Container Inputs */}
                        <div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 600 }}>Container Numbers</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                {containerList.map((cntr, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', minWidth: '40px', fontWeight: 700 }}>{cntr.size}</span>
                                        <input
                                            placeholder="Container No"
                                            value={cntr.no}
                                            onChange={(e) => handleContainerChange(idx, e.target.value)}
                                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                ))}
                                {containerList.length === 0 && <div style={{ color: 'var(--text-secondary)', gridColumn: 'span 2', textAlign: 'center' }}>수량을 선택해 주세요.</div>}
                            </div>
                        </div>

                        {/* Dates */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Request Date</label>
                            <input type="date" name="requestDate" value={formData.requestDate} onChange={handleChange} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Pickup Date</label>
                            <input type="date" name="pickupDate" value={formData.pickupDate} onChange={handleChange} />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Remarks</label>
                            <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" />
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem' }}>Overall Status</label>
                            <select name="ptiStatus" value={formData.ptiStatus} onChange={handleChange} style={{ padding: '0.5rem' }}>
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Pass">Pass</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary"><Save size={18} /> Save Record</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
