import { useState, useEffect } from 'react';
import { BarChart3, Clock, ArrowDownToLine, Filter, Calendar, CheckCircle2 } from 'lucide-react';
import { getPTIRecords } from '../lib/storage';

export default function Reports() {
    const [data, setData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [snapshotTime, setSnapshotTime] = useState('21:10');

    useEffect(() => {
        setData(getPTIRecords());
    }, []);

    const filteredData = data.filter(r => r.requestDate === selectedDate);

    // Filter logic for "Point in Time" - In a real app we'd need history/logs,
    // but here we'll simulate the "Progress" as of the selected time.
    // 09:00 -> Everything Pending
    // 21:10 -> Most Pass
    const isEvening = snapshotTime === '21:10';

    const getStateAtTime = (record) => {
        // If it's eventually Pass in our data, and it's evening, show it Pass.
        // For simplicity, we'll assume the 'current' data is the evening state.
        if (!isEvening) {
            return { ...record, ptiStatus: 'Pending', pickupStatus: 'Not Picked Up' };
        }
        return record;
    };

    const displayData = filteredData.map(getStateAtTime);

    const stats = {
        total: displayData.length,
        locations: displayData.reduce((acc, r) => {
            acc[r.location] = (acc[r.location] || 0) + 1;
            return acc;
        }, {}),
        pending: displayData.filter(r => r.ptiStatus === 'Pending').length,
        completed: displayData.filter(r => r.ptiStatus === 'Pass').length,
        pickedUp: displayData.filter(r => r.pickupStatus === 'Picked Up').length,
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
            <div className="header">
                <div>
                    <h2 className="page-title">Daily Operations Report</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Snapshot of PTI requests as of <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{snapshotTime} PM</span>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '8px', display: 'flex' }}>
                        <button
                            onClick={() => setSnapshotTime('09:00')}
                            style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '6px',
                                background: snapshotTime === '09:00' ? 'var(--primary)' : 'transparent',
                                color: snapshotTime === '09:00' ? '#fff' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 600
                            }}
                        >09:00 AM</button>
                        <button
                            onClick={() => setSnapshotTime('21:10')}
                            style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '6px',
                                background: snapshotTime === '21:10' ? 'var(--primary)' : 'transparent',
                                color: snapshotTime === '21:10' ? '#fff' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 600
                            }}
                        >21:10 PM</button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Calendar size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid-cols-3">
                <div className="glass-panel stat-card">
                    <span className="stat-label">Total Volume</span>
                    <span className="stat-value">{stats.total}</span>
                    <div style={{ marginTop: 'auto', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Target: 100% Processing
                    </div>
                </div>
                <div className="glass-panel stat-card">
                    <span className="stat-label">{isEvening ? 'Pass (End of Day)' : 'Starting Pending'}</span>
                    <span className="stat-value" style={{ color: isEvening ? '#34d399' : '#fbbf24' }}>
                        {isEvening ? stats.completed : stats.pending}
                    </span>
                    <div style={{ marginTop: 'auto', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {isEvening ? `${((stats.completed / stats.total) * 100).toFixed(1)}% Completion` : 'Initial State'}
                    </div>
                </div>
                <div className="glass-panel stat-card">
                    <span className="stat-label">Picked Up & Departed</span>
                    <span className="stat-value" style={{ color: '#f472b6' }}>{stats.pickedUp}</span>
                    <div style={{ marginTop: 'auto', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Released to Hauliers
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Efficiency by Terminal</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {Object.entries(stats.locations).map(([loc, total]) => {
                            const locCompleted = displayData.filter(r => r.location === loc && r.ptiStatus === 'Pass').length;
                            const percentage = total > 0 ? (locCompleted / total) * 100 : 0;
                            return (
                                <div key={loc}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        <span>{loc} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({locCompleted}/{total})</span></span>
                                        <span style={{ fontWeight: 600 }}>{percentage.toFixed(0)}%</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${percentage}%`,
                                            background: percentage === 100 ? '#10b981' : 'var(--primary)',
                                            boxShadow: percentage === 100 ? '0 0 10px #10b981' : 'none'
                                        }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Daily Progression Chart</h3>
                    <div style={{
                        height: '150px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '1rem',
                        padding: '1rem 0',
                        borderBottom: '1px solid var(--card-border)'
                    }}>
                        {/* Simulated Hourly Chart */}
                        {[30, 45, 60, 85, 95, 100, 100, 100].map((val, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                    width: '100%',
                                    height: `${isEvening ? val : 0}%`,
                                    background: 'linear-gradient(to top, var(--primary), #60a5fa)',
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 1s ease-out',
                                    opacity: i < (isEvening ? 8 : 1) ? 1 : 0.2
                                }}></div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{9 + (i * 2)}h</span>
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
                        Hourly Throughput vs Plan
                    </p>
                </div>
            </div>

            <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{snapshotTime} PM Final/Work-in-Progress List</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: '#34d399' }}>●</span> Pass: {stats.completed}
                    </div>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)' }}>
                            <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Booking No</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Container No</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Status</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Released?</th>
                                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem' }}>{r.bookingNo}</td>
                                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{r.containerNo}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <span className={`status-badge ${r.ptiStatus === 'Pass' ? 'status-completed' : 'status-pending'}`} style={{ fontSize: '0.7rem' }}>
                                            {r.ptiStatus}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        {r.pickupStatus === 'Picked Up' ? (
                                            <span style={{ color: '#f472b6', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <CheckCircle2 size={12} /> Yes
                                            </span>
                                        ) : 'No'}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>{r.location}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
