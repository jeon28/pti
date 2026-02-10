import { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, Truck, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SpecialContainerList({ records, onEdit, onDelete, onBulkDelete, onRefresh, onAddNew }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());

    const filteredRecords = useMemo(() => {
        return records.filter(r =>
            Object.values(r).some(val =>
                String(val).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [records, searchTerm]);

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
                            <th>Booking No</th>
                            <th>Container No</th>
                            <th>Size</th>
                            <th>Location</th>
                            <th>Customer</th>
                            <th>Status</th>
                            <th>Req Date</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecords.length === 0 ? (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: '3rem' }}>No records found.</td></tr>
                        ) : filteredRecords.map(record => (
                            <tr key={record.id} style={{ opacity: record.ptiStatus === 'Cancelled' ? 0.6 : 1 }}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(record.id)}
                                        onChange={() => toggleSelection(record.id)}
                                    />
                                </td>
                                <td style={{ fontWeight: 700 }}>{record.bookingNo}</td>
                                <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{record.containerNo || '-'}</td>
                                <td>
                                    <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                        {record.size}
                                    </span>
                                </td>
                                <td>{record.location}</td>
                                <td>{record.customer}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(record.ptiStatus) }}></span>
                                        {record.ptiStatus}
                                    </div>
                                </td>
                                <td>{record.requestDate}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button className="btn-icon" onClick={() => onEdit(record)}>
                                            <Edit2 size={14} />
                                        </button>
                                        <button className="btn-icon" onClick={() => onDelete(record.id)} style={{ color: '#ef4444' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
