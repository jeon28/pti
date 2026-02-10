import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, Truck, FileDown, Clipboard, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { addPTIRecord, updatePTIRecord } from '../lib/storage';
import BulkPasteModal from './BulkPasteModal';

export default function SpecialContainerList({ records, onEdit, onDelete, onBulkDelete, onRefresh, onAddNew }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showBulkPaste, setShowBulkPaste] = useState(false);
    const [initialPasteData, setInitialPasteData] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'requestDate', direction: 'desc' });
    const [editingLocationBookingNo, setEditingLocationBookingNo] = useState(null);

    // Global Paste Listener
    useEffect(() => {
        const handleGlobalPaste = (e) => {
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

    const filteredRecords = useMemo(() => {
        let result = records.filter(r =>
            Object.values(r).some(val =>
                String(val).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );

        if (sortConfig.key) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key] || '';
                const bVal = b[sortConfig.key] || '';
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [records, searchTerm, sortConfig]);

    // Group records by booking number for merged display
    const groupedRecords = useMemo(() => {
        const groups = {};
        filteredRecords.forEach(record => {
            const key = record.bookingNo;
            if (!groups[key]) {
                groups[key] = {
                    ...record,
                    containers: [{ id: record.id, containerNo: record.containerNo, size: record.size }],
                    allIds: [record.id]
                };
            } else {
                groups[key].containers.push({ id: record.id, containerNo: record.containerNo, size: record.size });
                groups[key].allIds.push(record.id);
            }
        });
        return Object.values(groups);
    }, [filteredRecords]);

    const handleExport = () => {
        const dataToExport = filteredRecords.map(r => ({
            'BOOKING NO': r.bookingNo,
            'CNTR NO': r.containerNo,
            'SIZE': r.size,
            'LOCATION': r.location,
            'CUSTOMER': r.customer,
            'LINE': r.shippingLine,
            'STATUS': r.ptiStatus,
            'REQ DATE': r.requestDate,
            'PICK DATE': r.pickupDate,
            'REMARK': r.remarks
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Special_Data");
        XLSX.writeFile(wb, `Special_Container_Report.xlsx`);
    };

    const toggleSelection = (id) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedIds(newSelection);
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        const recordsToDelete = records.filter(r => selectedIds.has(r.id));
        onBulkDelete(recordsToDelete);
        setSelectedIds(new Set());
    };

    const handleBulkSave = async (batchRecords) => {
        for (const r of batchRecords) {
            await addPTIRecord(r);
        }
        await onRefresh();
        alert(`${batchRecords.length}개의 Special Container 데이터가 등록되었습니다.`);
    };

    const handleStatusUpdate = async (record, newStatus) => {
        await updatePTIRecord({ ...record, ptiStatus: newStatus });
        await onRefresh();
    };

    const handleLocationUpdate = async (group, newLocation) => {
        for (const id of group.allIds) {
            const record = records.find(r => r.id === id);
            if (record) {
                await updatePTIRecord({ ...record, location: newLocation });
            }
        }
        setEditingLocationBookingNo(null);
        await onRefresh();
    };

    const toggleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pass': return '#10b981';
            case 'In Progress': return '#f59e0b';
            case 'Cancelled': return '#ef4444';
            default: return '#6b7280';
        }
    };

    return (
        <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="header">
                <div>
                    <h2 className="page-title">Special Container Management</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Manage non-reefer special containers</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {selectedIds.size > 0 && (
                        <button className="btn btn-secondary" onClick={handleBulkDelete} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                            <Trash2 size={18} /> Delete Selected ({selectedIds.size})
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={handleExport}>
                        <FileDown size={18} /> Excel Export
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowBulkPaste(true)}>
                        <Clipboard size={18} /> Bulk Paste
                    </button>
                    <button className="btn btn-primary" onClick={onAddNew}>
                        <Plus size={18} /> New Request
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        placeholder="Search by container, booking, customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '3rem', width: '100%' }}
                    />
                </div>
            </div>

            <div className="glass-panel table-container">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={filteredRecords.length > 0 && selectedIds.size === filteredRecords.length}
                                    onChange={() => setSelectedIds(selectedIds.size === filteredRecords.length ? new Set() : new Set(filteredRecords.map(r => r.id)))}
                                />
                            </th>
                            <th style={{ width: '35px', textAlign: 'center' }}>No.</th>
                            <th style={{ width: '45px', textAlign: 'center' }}>Edit</th>
                            <th style={{ width: '100px' }}>Status</th>
                            <th style={{ width: '80px' }}>Line</th>
                            <th style={{ width: '80px' }}>Location</th>
                            <th>Customer</th>
                            <th>Booking No</th>
                            <th>Container No</th>
                            <th style={{ width: '80px' }}>Size</th>
                            <th style={{ width: '45px', cursor: 'pointer', color: sortConfig.key === 'requestDate' ? '#fbbf24' : 'inherit', fontSize: '0.75rem' }} onClick={() => toggleSort('requestDate')}>
                                REQ <ArrowUpDown size={10} style={{ opacity: sortConfig.key === 'requestDate' ? 1 : 0.3 }} />
                            </th>
                            <th style={{ width: '45px', cursor: 'pointer', color: sortConfig.key === 'pickupDate' ? '#fbbf24' : 'inherit', fontSize: '0.75rem' }} onClick={() => toggleSort('pickupDate')}>
                                PICK <ArrowUpDown size={10} style={{ opacity: sortConfig.key === 'pickupDate' ? 1 : 0.3 }} />
                            </th>
                            <th>Remark</th>
                            <th style={{ width: '70px' }}>Picked?</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedRecords.length === 0 ? (
                            <tr><td colSpan="14" style={{ textAlign: 'center', padding: '3rem' }}>No records found.</td></tr>
                        ) : groupedRecords.map((group, index) => {
                            const allSelected = group.allIds.every(id => selectedIds.has(id));
                            const someSelected = group.allIds.some(id => selectedIds.has(id)) && !allSelected;

                            return (
                                <tr key={group.bookingNo} style={{ background: allSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent', opacity: group.ptiStatus === 'Cancelled' ? 0.6 : 1 }}>
                                    <td style={{ textAlign: 'center', padding: '0.2rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            ref={el => {
                                                if (el) el.indeterminate = someSelected;
                                            }}
                                            onChange={() => {
                                                const newSelection = new Set(selectedIds);
                                                if (allSelected) {
                                                    group.allIds.forEach(id => newSelection.delete(id));
                                                } else {
                                                    group.allIds.forEach(id => newSelection.add(id));
                                                }
                                                setSelectedIds(newSelection);
                                            }}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '0.2rem' }}>
                                        {index + 1}
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '0.2rem' }}>
                                        <button onClick={() => onEdit(group)} style={{ padding: '0.3rem', background: 'rgba(59, 130, 246, 0.1)', border: 'none', borderRadius: '6px', color: '#60a5fa', cursor: 'pointer' }}><Edit2 size={12} /></button>
                                    </td>
                                    <td style={{ padding: '0.2rem' }}>
                                        <select
                                            value={group.ptiStatus || 'Pending'}
                                            onChange={(e) => {
                                                group.allIds.forEach(id => {
                                                    const record = records.find(r => r.id === id);
                                                    if (record) handleStatusUpdate(record, e.target.value);
                                                });
                                            }}
                                            className={`status-badge ${group.ptiStatus === 'Pass' ? 'status-completed' : group.ptiStatus === 'In Progress' ? 'status-progress' : group.ptiStatus === 'Cancelled' ? 'status-cancelled' : 'status-pending'}`}
                                            style={{ border: 'none', width: '100%', cursor: 'pointer', outline: 'none', background: 'transparent', fontSize: '0.75rem', padding: '2px' }}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Pass">Pass</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                    <td style={{ fontSize: '0.85rem', padding: '0.2rem' }}>{group.shippingLine}</td>
                                    <td
                                        style={{ fontSize: '0.85rem', cursor: 'pointer', padding: '0.2rem' }}
                                        onDoubleClick={() => setEditingLocationBookingNo(group.bookingNo)}
                                        title="Double click to edit"
                                    >
                                        {editingLocationBookingNo === group.bookingNo ? (
                                            <select
                                                defaultValue={group.location}
                                                autoFocus
                                                onBlur={(e) => handleLocationUpdate(group, e.target.value)}
                                                onChange={(e) => handleLocationUpdate(group, e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.2rem',
                                                    fontSize: '0.85rem',
                                                    border: '1px solid var(--primary)',
                                                    borderRadius: '4px',
                                                    background: '#fff',
                                                    color: '#000'
                                                }}
                                            >
                                                <option value="">Select</option>
                                                <option value="SNCT">SNCT</option>
                                                <option value="HJIT">HJIT</option>
                                                <option value="ICT">ICT</option>
                                                <option value="E1">E1</option>
                                            </select>
                                        ) : (
                                            group.location || '-'
                                        )}
                                    </td>
                                    <td style={{ fontSize: '0.85rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0.2rem' }} title={group.customer}>{group.customer || '-'}</td>
                                    <td style={{ fontSize: '0.85rem', fontWeight: 700, padding: '0.2rem' }}>{group.bookingNo}</td>
                                    <td style={{ padding: '0.2rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            {group.containers.map((cntr, idx) => (
                                                <div key={cntr.id}>
                                                    <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem' }}>
                                                        {cntr.containerNo || '-'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.2rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            {group.containers.map((cntr, idx) => (
                                                <div key={cntr.id}>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        background: 'rgba(255,255,255,0.05)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        minWidth: '45px',
                                                        textAlign: 'center',
                                                        display: 'inline-block'
                                                    }}>
                                                        {cntr.size}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 600, padding: '0.2rem' }}>
                                        {group.requestDate ? group.requestDate.split('-').slice(1).join('/') : ''}
                                    </td>
                                    <td style={{ padding: '0.2rem' }}>
                                        <div
                                            style={{ color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                                            onClick={() => {
                                                const date = prompt('Enter Pickup Date (YYYY-MM-DD):', group.pickupDate || '');
                                                if (date !== null) {
                                                    group.allIds.forEach(id => {
                                                        const record = records.find(r => r.id === id);
                                                        if (record) onEdit({ ...record, pickupDate: date });
                                                    });
                                                }
                                            }}
                                        >
                                            {group.pickupDate ? group.pickupDate.split('-').slice(1).join('/') : '-'}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0.2rem' }} title={group.remarks}>
                                        {group.remarks || '-'}
                                    </td>
                                    <td style={{ padding: '0.2rem' }}>
                                        <button
                                            onClick={() => {
                                                const newStatus = group.pickupStatus === 'Picked Up' ? 'Not Picked Up' : 'Picked Up';
                                                group.allIds.forEach(id => {
                                                    const record = records.find(r => r.id === id);
                                                    if (record) onEdit({ ...record, pickupStatus: newStatus });
                                                });
                                            }}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', color: group.pickupStatus === 'Picked Up' ? '#f472b6' : 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}
                                        >
                                            <Truck size={12} />
                                            {group.pickupStatus === 'Picked Up' ? 'Done' : 'No'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
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
                    initialText={initialPasteData}
                    onClose={() => {
                        setShowBulkPaste(false);
                        setInitialPasteData('');
                    }}
                    onSave={handleBulkSave}
                    type="SPECIAL"
                />
            )}
        </div>
    );
}
