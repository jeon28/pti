import { LayoutDashboard, Container, FileText, Settings, Truck, Mail, Clock, CheckCircle2 as CheckCircle, Trash2 } from 'lucide-react';

export default function Sidebar({ currentView, setView }) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'pti-list', label: 'PTI Management', icon: Container },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'settings', label: 'Email Settings', icon: Mail },
        { id: 'trash', label: 'Trash Can', icon: Trash2 },
    ];

    return (
        <div className="glass-panel" style={{
            width: '100%',
            margin: '1rem 0 1rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            boxSizing: 'border-box'
        }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Truck color="var(--primary)" size={28} />
                <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Reefer PTI</h1>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            style={{
                                background: isActive ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.15), transparent)' : 'transparent',
                                border: 'none',
                                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                padding: '0.875rem 1rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                textAlign: 'left',
                                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Icon size={20} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            <div style={{ marginTop: 'auto' }}>
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>System Status</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                        Online
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                        onClick={() => {
                            alert('SQLite 모드에서는 이 기능이 아직 지원되지 않습니다.');
                        }}
                        style={{
                            width: '100%',
                            padding: '0.6rem',
                            borderRadius: '8px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Clock size={14} />
                        09:00 AM Reset
                    </button>
                    <button
                        onClick={() => {
                            alert('SQLite 모드에서는 이 기능이 아직 지원되지 않습니다.');
                        }}
                        style={{
                            width: '100%',
                            padding: '0.6rem',
                            borderRadius: '8px',
                            background: 'rgba(244, 114, 182, 0.1)',
                            border: '1px solid rgba(244, 114, 182, 0.2)',
                            color: '#f472b6',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <CheckCircle size={14} />
                        21:10 PM EOD Mode
                    </button>
                </div>
            </div>
        </div>
    );
}


