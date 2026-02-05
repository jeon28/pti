import { BarChart3, Clock, CheckCircle2 as CheckCircle, Truck, AlertCircle } from 'lucide-react';

export default function Dashboard({ stats }) {
    return (
        <div className="animate-fade-in">
            <div className="header">
                <div>
                    <h2 className="page-title">Dashboard Overview</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Real-time PTI operation metrics</p>
                </div>
                <button className="btn btn-primary">
                    <BarChart3 size={18} />
                    View Reports
                </button>
            </div>

            <div className="grid-cols-3">
                <div className="glass-panel stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.75rem', borderRadius: '12px' }}>
                            <Clock size={24} color="#60a5fa" />
                        </div>
                        <span className="stat-value">{stats.pending || 0}</span>
                    </div>
                    <span className="stat-label">Pending Requests</span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 'auto' }}>
                        Requires immediate attention
                    </div>
                </div>

                <div className="glass-panel stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.75rem', borderRadius: '12px' }}>
                            <AlertCircle size={24} color="#fbbf24" />
                        </div>
                        <span className="stat-value">{stats.inProgress || 0}</span>
                    </div>
                    <span className="stat-label">In Progress</span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 'auto' }}>
                        Currently under inspection
                    </div>
                </div>

                <div className="glass-panel stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.75rem', borderRadius: '12px' }}>
                            <CheckCircle size={24} color="#34d399" />
                        </div>
                        <span className="stat-value">{stats.completed || 0}</span>
                    </div>
                    <span className="stat-label">Pass Today</span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 'auto' }}>
                        +12% from yesterday
                    </div>
                </div>
            </div>

            <div className="grid-cols-3" style={{ marginTop: '1.5rem' }}>
                <div className="glass-panel stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ background: 'rgba(236, 72, 153, 0.2)', padding: '0.75rem', borderRadius: '12px' }}>
                            <Truck size={24} color="#f472b6" />
                        </div>
                        <span className="stat-value">{stats.pickedUp || 0}</span>
                    </div>
                    <span className="stat-label">Containers Picked Up</span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 'auto' }}>
                        Completed & Departed
                    </div>
                </div>
            </div>

            {/* Recent Activity or Chart Placeholder could go here */}
            <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Operational Efficiency Chart
                </div>
                <div style={{
                    height: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed var(--card-border)',
                    borderRadius: '12px',
                    marginTop: '1rem',
                    color: 'var(--text-secondary)'
                }}>
                    Chart Visualization Area
                </div>
            </div>
        </div>
    );
}
