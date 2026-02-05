import { useState, useEffect } from 'react';
import { X, Clipboard, Save, Trash2, AlertCircle } from 'lucide-react';

export default function BulkPasteModal({ onClose, onSave, initialText = '' }) {
    const [pastedText, setPastedText] = useState(initialText);
    const [parsedData, setParsedData] = useState([]);

    useEffect(() => {
        if (initialText) {
            handleParse(initialText);
        }
    }, [initialText]);

    const handleParse = (textToParse = pastedText) => {
        if (!textToParse?.trim()) return;

        const lines = textToParse.split('\n');
        const newData = lines
            .map(line => line.split('\t'))
            .filter(cols => cols.length >= 2)
            .map((cols, idx) => {
                if (idx === 0 && (cols[0].toUpperCase().includes('LINE') || cols[3]?.toUpperCase().includes('BOOKING'))) {
                    return null;
                }

                let status = cols[11]?.trim() || 'Pending';
                if (status === 'Completed') status = 'Pass';

                return {
                    id: `bulk-${Date.now()}-${idx}`,
                    shippingLine: cols[0]?.trim() || '',
                    location: cols[1]?.trim() || '',
                    customer: cols[2]?.trim() || '',
                    bookingNo: cols[3]?.trim() || '',
                    containerNo: cols[4]?.trim() || '',
                    size: cols[5]?.trim() || '40RE',
                    temperature: cols[6]?.trim() || '',
                    vent: cols[7]?.trim() || 'CLOSED',
                    humidity: cols[8]?.trim() || '',
                    requestDate: cols[9]?.trim() || new Date().toISOString().split('T')[0],
                    pickupDate: cols[10]?.trim() || '',
                    ptiStatus: status,
                    remarks: cols[12]?.trim() || '',
                    pickupStatus: 'Not Picked Up'
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

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '2rem'
        }}>
            <div className="glass-panel animate-fade-in" style={{
                width: '1000px',
                height: '85vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0 }}>Bulk Paste Mode (일괄 붙여넣기)</h2>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Excel에서 영역을 복사(Ctrl+C)한 후 아래에 붙여넣으세요. (순서: LINE, LOC, CUST, BKG, CNTR, SIZE, TEMP, VENT, HUM, REQ, PICK, STATUS, REMARK)
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {parsedData.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <textarea
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                placeholder="여기에 엑셀 데이터를 붙여넣으세요 (Ctrl+V)..."
                                style={{
                                    flex: 1,
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '2px dashed var(--card-border)',
                                    borderRadius: '12px',
                                    padding: '1.5rem',
                                    color: '#fff',
                                    fontFamily: 'monospace',
                                    fontSize: '0.9rem',
                                    resize: 'none',
                                    outline: 'none'
                                }}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleParse}
                                disabled={!pastedText.trim()}
                                style={{ alignSelf: 'center', padding: '1rem 3rem' }}
                            >
                                <Clipboard size={20} />
                                데이터 미리보기 (Parse)
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                                    총 {parsedData.length}개의 데이터가 인식되었습니다.
                                </span>
                                <button onClick={clearParsed} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Trash2 size={16} /> 다시 붙여넣기
                                </button>
                            </div>

                            <div className="table-container" style={{ maxHeight: '50vh', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                                <table style={{ fontSize: '0.8rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-color)', zIndex: 1 }}>
                                        <tr>
                                            <th style={{ padding: '0.5rem' }}>Line</th>
                                            <th style={{ padding: '0.5rem' }}>Bkg No</th>
                                            <th style={{ padding: '0.5rem' }}>Cntr No</th>
                                            <th style={{ padding: '0.5rem' }}>Size</th>
                                            <th style={{ padding: '0.5rem' }}>Temp</th>
                                            <th style={{ padding: '0.5rem' }}>Req Date</th>
                                            <th style={{ padding: '0.5rem' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedData.map((row, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: '0.4rem' }}>{row.shippingLine}</td>
                                                <td style={{ padding: '0.4rem' }}>{row.bookingNo}</td>
                                                <td style={{ padding: '0.4rem' }}>{row.containerNo}</td>
                                                <td style={{ padding: '0.4rem' }}>{row.size}</td>
                                                <td style={{ padding: '0.4rem' }}>{row.temperature}</td>
                                                <td style={{ padding: '0.4rem' }}>{row.requestDate}</td>
                                                <td style={{ padding: '0.4rem' }}>{row.ptiStatus}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                display: 'flex',
                                gap: '0.75rem',
                                color: '#60a5fa'
                            }}>
                                <AlertCircle size={20} />
                                <span style={{ fontSize: '0.85rem' }}>
                                    미리보기 데이터가 정확한지 확인해 주세요. '저장하기'를 누르면 목록에 추가됩니다.
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={onClose}>취소</button>
                    {parsedData.length > 0 && (
                        <button className="btn btn-primary" onClick={handleSave}>
                            <Save size={18} />
                            {parsedData.length}개 데이터 저장하기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
