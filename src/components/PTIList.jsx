import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, Truck, ArrowUpDown, FileDown, XCircle, FileUp, Clipboard } from 'lucide-react';
import { updatePTIRecord, addPTIRecord } from '../lib/storage';
import * as XLSX from 'xlsx';
import BulkPasteModal from './BulkPasteModal';

export default function PTIList({ records, onEdit, onDelete, onBulkDelete, onRefresh, onAddNew }) {
    const fileInputRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPickedUp, setShowPickedUp] = useState(false);
    const [selectedBookingNos, setSelectedBookingNos] = useState(new Set());
    const [showBulkPaste, setShowBulkPaste] = useState(false);
    const [initialPasteData, setInitialPasteData] = useState('');

    // Global Paste Listener (Option 1: Smart Paste)
    useEffect(() => {
        const handleGlobalPaste = (e) => {
            // Don't trigger if user is typing in an input or textarea
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            const pastedText = e.clipboardData?.getData('text');
            if (pastedText && pastedText.includes('\t')) {
                e.preventDefault();
                setInitialPasteData(pastedText);
                setShowBulkPaste(true);
            }
        };

        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, []);

    // Filters & Sorting
    const [lineFilter, setLineFilter] = useState('All');
    const [locFilter, setLocFilter] = useState('All');
    const [monthFilter, setMonthFilter] = useState('All');
    const [pickupDateFilter, setPickupDateFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'requestDate', direction: 'desc' });

    // Derived options
    const uniqueLines = ['All', ...new Set(records.map(r => r.shippingLine).filter(Boolean))];
    const uniqueLocs = ['All', ...new Set(records.map(r => r.location).filter(Boolean))];
    const months = ['All', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

    // Filter Logic
    const filteredRecords = records.filter(r => {
        const matchesSearch = Object.values(r).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
        const matchesPickup = showPickedUp ? true : r.pickupStatus !== 'Picked Up';
        const matchesLine = lineFilter === 'All' || r.shippingLine === lineFilter;
        const matchesLoc = locFilter === 'All' || r.location === locFilter;

        // Month Filter (based on requestDate YYYY-MM-DD)
        const recordMonth = r.requestDate ? r.requestDate.split('-')[1] : '';
        const matchesMonth = monthFilter === 'All' || recordMonth === monthFilter;

        // Pickup Date Filter
        const matchesPickupDate = !pickupDateFilter || r.pickupDate === pickupDateFilter;

        return matchesSearch && matchesPickup && matchesLine && matchesLoc && matchesMonth && matchesPickupDate;
    });

    const handleExport = () => {
        const dataToExport = filteredRecords.map(r => ({
            'LINE': r.shippingLine,
            'LOCATION': r.location,
            'CUSTOMER': r.customer,
            'BOOKING NO': r.bookingNo,
            'CNTR NO': r.containerNo,
            'SIZE': r.size,
            'TEMP': r.temperature,
            'VENT': r.vent,
            'Humidity (%)': r.humidity,
            'Request Date': r.requestDate,
            'Pickup Date': r.pickupDate,
            'PTI Status': r.ptiStatus,
            'REMARK': r.remarks
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PTI_Data");
        XLSX.writeFile(wb, `PTI_Report_${monthFilter === 'All' ? 'Total' : monthFilter + 'Month'}.xlsx`);
    };

    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    alert('엑셀 파일에 데이터가 없습니다.');
                    return;
                }

                const timestamp = Date.now();
                data.forEach((row, index) => {
                    const newRecord = {
                        id: `${timestamp}-${index}`,
                        shippingLine: row['LINE'] || '',
                        location: row['LOCATION'] || '',
                        customer: row['CUSTOMER'] || '',
                        bookingNo: String(row['BOOKING NO'] || ''),
                        containerNo: String(row['CNTR NO'] || ''),
                        size: String(row['SIZE'] || '40'),
                        temperature: String(row['TEMP'] || ''),
                        vent: String(row['VENT'] || 'CLOSED'),
                        humidity: String(row['Humidity (%)'] || ''),
                        requestDate: row['Request Date'] || new Date().toISOString().split('T')[0],
                        pickupDate: row['Pickup Date'] || '',
                        pickupStatus: 'Not Picked Up',
                        ptiStatus: row['PTI Status'] || 'Pending',
                        remarks: row['REMARK'] || ''
                    };
                    addPTIRecord(newRecord);
                });

                alert(`${data.length}개의 데이터를 성공적으로 가져왔습니다.`);
                onRefresh();
                e.target.value = ''; // Reset input
            } catch (error) {
                console.error('Excel Import Error:', error);
                alert('엑셀 파일을 읽는 중 오류가 발생했습니다. 형식을 확인해 주세요.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleBulkDelete = () => {
        if (selectedBookingNos.size === 0) return;
        if (confirm(`선택한 ${selectedBookingNos.size}개의 부킹(전체 컨테이너)을 삭제하시겠습니까?`)) {
            const recordsToDelete = records.filter(r => selectedBookingNos.has(r.bookingNo));
            onBulkDelete(recordsToDelete);
            setSelectedBookingNos(new Set());
        }
    };

    const handleBulkStatusChange = (newStatus) => {
        if (selectedBookingNos.size === 0) return;
        const recordsToUpdate = records.filter(r => selectedBookingNos.has(r.bookingNo));
        recordsToUpdate.forEach(r => updatePTIRecord({ ...r, ptiStatus: newStatus }));
        onRefresh();
        alert(`${selectedBookingNos.size}개 부킹의 상태가 '${newStatus}'(으)로 일괄 변경되었습니다.`);
    };

    const handleBulkPickupChange = (newStatus) => {
        if (selectedBookingNos.size === 0) return;
        const recordsToUpdate = records.filter(r => selectedBookingNos.has(r.bookingNo));
        recordsToUpdate.forEach(r => updatePTIRecord({ ...r, pickupStatus: newStatus }));
        onRefresh();
        alert(`${selectedBookingNos.size}개 부킹의 픽업 상태가 '${newStatus}'(으)로 일괄 변경되었습니다.`);
    };

    const toggleSelection = (bookingNo) => {
        const newSelection = new Set(selectedBookingNos);
        if (newSelection.has(bookingNo)) {
            newSelection.delete(bookingNo);
        } else {
            newSelection.add(bookingNo);
        }
        setSelectedBookingNos(newSelection);
    };

    const toggleAllSelection = (isAllSelected, visibleBookingNos) => {
        if (isAllSelected) {
            setSelectedBookingNos(new Set());
        } else {
            setSelectedBookingNos(new Set(visibleBookingNos));
        }
    };

    const handleBulkSave = (batchRecords) => {
        batchRecords.forEach(r => addPTIRecord(r));
        onRefresh();
        alert(`${batchRecords.length}개의 데이터가 등록되었습니다.`);
    };

    const handleStatusUpdate = (record, newStatus) => {
        updatePTIRecord({ ...record, ptiStatus: newStatus });
        onRefresh();
    };

    const handlePickupToggle = (record) => {
        const newStatus = record.pickupStatus === 'Picked Up' ? 'Not Picked Up' : 'Picked Up';
        updatePTIRecord({ ...record, pickupStatus: newStatus });
        onRefresh();
    };

    const toggleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const groupedGroups = Object.values(filteredRecords.reduce((acc, record) => {
        const key = record.bookingNo ? record.bookingNo : `unique-${record.id}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(record);
        return acc;
    }, {}));

    return (
        <div className="animate-fade-in">
            <div className="header">
                <div>
                    <h2 className="page-title">PTI Management</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Active Container Records & Filters</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedBookingNos(new Set())}
                        style={{ opacity: selectedBookingNos.size > 0 ? 1 : 0.5, cursor: selectedBookingNos.size > 0 ? 'pointer' : 'default' }}
                        disabled={selectedBookingNos.size === 0}
                    >
                        선택 해제
                    </button>
                    {selectedBookingNos.size > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(59, 130, 246, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginRight: '0.5rem' }}>Bulk Actions:</span>

                            <select
                                onChange={(e) => handleBulkStatusChange(e.target.value)}
                                style={{ padding: '0.4rem', width: '120px', fontSize: '0.85rem' }}
                                defaultValue=""
                            >
                                <option value="" disabled>Change Status</option>
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Pass">Pass</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>

                            <select
                                onChange={(e) => handleBulkPickupChange(e.target.value)}
                                style={{ padding: '0.4rem', width: '130px', fontSize: '0.85rem' }}
                                defaultValue=""
                            >
                                <option value="" disabled>Change Picked?</option>
                                <option value="Not Picked Up">Not Picked Up</option>
                                <option value="Picked Up">Picked Up</option>
                            </select>

                            <button className="btn" onClick={handleBulkDelete} style={{ padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                <Trash2 size={16} />
                                Delete ({selectedBookingNos.size})
                            </button>
                        </div>
                    )}
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <FileDown size={18} />
                        Excel Export
                    </button>
                    <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>
                        <FileUp size={18} />
                        Excel Import
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowBulkPaste(true)}>
                        <Clipboard size={18} />
                        Bulk Paste
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportExcel}
                        accept=".xlsx, .xls"
                        style={{ display: 'none' }}
                    />
                    <button className="btn btn-primary" onClick={onAddNew}>
                        <Plus size={18} />
                        New Request
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '1 1 200px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search Booking/Container..."
                            style={{ paddingLeft: '2.5rem', width: '100%' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Month</span>
                            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{ width: '80px', padding: '0.4rem' }}>
                                {months.map(m => <option key={m} value={m}>{m === 'All' ? 'Month: All' : `${m}월`}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Line / Location</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <select value={lineFilter} onChange={(e) => setLineFilter(e.target.value)} style={{ width: '100px', padding: '0.4rem' }}>
                                    {uniqueLines.map(l => <option key={l} value={l}>{l === 'All' ? 'Line: All' : l}</option>)}
                                </select>
                                <select value={locFilter} onChange={(e) => setLocFilter(e.target.value)} style={{ width: '100px', padding: '0.4rem' }}>
                                    {uniqueLocs.map(l => <option key={l} value={l}>{l === 'All' ? 'Loc: All' : l}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn"
                        onClick={() => setShowPickedUp(!showPickedUp)}
                        style={{
                            background: showPickedUp ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: showPickedUp ? '#fff' : 'var(--text-secondary)',
                            marginTop: '1.2rem'
                        }}
                    >
                        <Filter size={18} />
                        {showPickedUp ? 'Hide Picked Up' : 'Show Picked Up'}
                    </button>
                </div>
            </div>

            <div className="glass-panel table-container">
                <table>
                    <thead>
                        <tr>
                            <th style={{ padding: '0.25rem', width: '30px', textAlign: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={groupedGroups.length > 0 && selectedBookingNos.size === groupedGroups.length}
                                    onChange={() => toggleAllSelection(selectedBookingNos.size === groupedGroups.length, groupedGroups.map(g => g[0].bookingNo))}
                                />
                            </th>
                            <th style={{ padding: '0.25rem', width: '35px', textAlign: 'center' }}>No.</th>
                            <th style={{ padding: '0.25rem', width: '45px', textAlign: 'center' }}>Edit</th>
                            <th style={{ padding: '0.25rem', width: '100px' }}>Status</th>
                            <th style={{ padding: '0.25rem', width: '80px' }}>Line</th>
                            <th style={{ padding: '0.25rem', width: '80px' }}>Location</th>
                            <th style={{ padding: '0.25rem' }}>Customer</th>
                            <th style={{ padding: '0.25rem' }}>Booking No</th>
                            <th style={{ padding: '0.25rem' }}>Container No</th>
                            <th style={{ padding: '0.25rem', width: '60px' }}>Size</th>
                            <th style={{ padding: '0.25rem', width: '90px' }}>Temp/Vent</th>
                            <th style={{ padding: '0.25rem', width: '45px', cursor: 'pointer', color: '#fbbf24', fontSize: '0.75rem' }} onClick={() => toggleSort('requestDate')}>
                                REQ <ArrowUpDown size={10} />
                            </th>
                            <th style={{ padding: '0.25rem', width: '45px', cursor: 'pointer', fontSize: '0.75rem' }} onClick={() => toggleSort('pickupDate')}>
                                PICK <ArrowUpDown size={10} />
                            </th>
                            <th style={{ padding: '0.25rem', fontSize: '0.75rem' }}>Remark</th>
                            <th style={{ padding: '0.25rem', width: '70px' }}>Picked?</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedGroups.length === 0 ? (
                            <tr>
                                <td colSpan="12" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    No records found for current filters.
                                </td>
                            </tr>
                        ) : (
                            groupedGroups.map((group, index) => {
                                const record = group[0];
                                const isGroup = group.length > 1;

                                return (
                                    <tr key={record.id} style={{ background: selectedBookingNos.has(record.bookingNo) ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                                        <td style={{ textAlign: 'center', padding: '0.2rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedBookingNos.has(record.bookingNo)}
                                                onChange={() => toggleSelection(record.bookingNo)}
                                            />
                                        </td>
                                        <td style={{ padding: '0.2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                            {index + 1}
                                        </td>
                                        <td style={{ padding: '0.2rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <button onClick={() => onEdit(record)} style={{ padding: '0.3rem', background: 'rgba(59, 130, 246, 0.1)', border: 'none', borderRadius: '6px', color: '#60a5fa', cursor: 'pointer' }}><Edit2 size={12} /></button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.2rem' }}>
                                            <select
                                                value={record.ptiStatus || 'Pending'}
                                                onChange={(e) => group.forEach(r => handleStatusUpdate(r, e.target.value))}
                                                className={`status-badge ${record.ptiStatus === 'Pass' ? 'status-completed' : record.ptiStatus === 'In Progress' ? 'status-progress' : record.ptiStatus === 'Cancelled' ? 'status-cancelled' : 'status-pending'}`}
                                                style={{ border: 'none', width: '100%', cursor: 'pointer', outline: 'none', background: 'transparent', fontSize: '0.75rem', padding: '2px' }}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Pass">Pass</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '0.2rem', fontSize: '0.85rem' }}>{record.shippingLine}</td>
                                        <td style={{ padding: '0.2rem', fontSize: '0.85rem' }}>{record.location}</td>
                                        <td style={{ padding: '0.2rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }} title={record.customer}>{record.customer}</td>
                                        <td style={{ padding: '0.2rem', fontSize: '0.85rem' }}>{record.bookingNo}</td>
                                        <td style={{ padding: '0.2rem', fontWeight: 600, fontSize: '0.85rem' }}>
                                            {isGroup ? group.map((r, i) => <div key={i}>{r.containerNo || '-'}</div>) : (record.containerNo || '-')}
                                        </td>
                                        <td style={{ padding: '0.2rem', fontSize: '0.85rem' }}>{record.size}' {isGroup && `x${group.length}`}</td>
                                        <td style={{ padding: '0.2rem' }}>
                                            <div style={{ fontSize: '0.75rem' }}>{record.temperature}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>V: {record.vent}</div>
                                        </td>
                                        <td style={{ padding: '0.2rem', fontSize: '0.75rem', color: '#fbbf24' }}>
                                            {record.requestDate ? record.requestDate.split('-').slice(1).join('/') : ''}
                                        </td>
                                        <td style={{ padding: '0.2rem', fontSize: '0.75rem' }}>
                                            {record.pickupDate ? record.pickupDate.split('-').slice(1).join('/') : ''}
                                        </td>
                                        <td style={{ padding: '0.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.remarks}>
                                            {record.remarks ? record.remarks.split('\n')[0] : ''}
                                        </td>
                                        <td style={{ padding: '0.2rem' }}>
                                            <button
                                                onClick={() => group.forEach(r => handlePickupToggle(r))}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', color: record.pickupStatus === 'Picked Up' ? '#f472b6' : 'var(--text-secondary)', fontSize: '0.7rem' }}
                                            >
                                                <Truck size={12} />
                                                {record.pickupStatus === 'Picked Up' ? 'Done' : 'No'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            <style>{`
                .status-cancelled { background: rgba(239, 68, 68, 0.2) !important; color: #f87171 !important; }
                select.status-badge { appearance: none; -webkit-appearance: none; text-align-last: center; }
                select.status-badge option { background: var(--bg-color); color: var(--text-color); }
            `}</style>

            {showBulkPaste && (
                <BulkPasteModal
                    onClose={() => { setShowBulkPaste(false); setInitialPasteData(''); }}
                    onSave={handleBulkSave}
                    initialText={initialPasteData}
                />
            )}
        </div>
    );
}
