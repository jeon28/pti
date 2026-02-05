import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Mail } from 'lucide-react';
import { getEmailSettings, saveEmailSettings } from '../lib/storage';

export default function EmailSettings() {
    const [settings, setSettings] = useState({
        recipients: [],
        template: { subject: '', body: '' }
    });
    const [activeTab, setActiveTab] = useState('recipients');

    // New/Edit Recipient Form State
    const [newRule, setNewRule] = useState({ matchType: 'Location', matchValue: '', emailType: 'To', emailAddress: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        setSettings(getEmailSettings());
    }, []);

    const handleSave = () => {
        saveEmailSettings(settings);
        alert('Settings saved successfully!');
    };

    const handleAddRecipient = () => {
        if (!newRule.matchValue || !newRule.emailAddress) return;

        if (editingId) {
            // Update existing
            setSettings(prev => ({
                ...prev,
                recipients: prev.recipients.map(r => r.id === editingId ? { ...newRule, id: editingId } : r)
            }));
            setEditingId(null);
        } else {
            // Add new
            setSettings(prev => ({
                ...prev,
                recipients: [...prev.recipients, { ...newRule, id: Date.now() }]
            }));
        }
        setNewRule({ matchType: 'Location', matchValue: '', emailType: 'To', emailAddress: '' });
    };

    const handleEditRecipient = (rule) => {
        setNewRule({
            matchType: rule.matchType,
            matchValue: rule.matchValue,
            emailType: rule.emailType,
            emailAddress: rule.emailAddress
        });
        setEditingId(rule.id);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNewRule({ matchType: 'Location', matchValue: '', emailType: 'To', emailAddress: '' });
    };

    const handleDeleteRecipient = (id) => {
        setSettings(prev => ({
            ...prev,
            recipients: prev.recipients.filter(r => r.id !== id)
        }));
    };

    const handleTemplateChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            template: { ...prev.template, [name]: value }
        }));
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div className="header">
                <div>
                    <h2 className="page-title">Email Configuration</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Manage Outlook email rules and templates</p>
                </div>
                <button className="btn btn-primary" onClick={handleSave}>
                    <Save size={18} />
                    Save All Changes
                </button>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    className={`btn ${activeTab === 'recipients' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('recipients')}
                >
                    Recipient Rules
                </button>
                <button
                    className={`btn ${activeTab === 'template' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('template')}
                >
                    Email Template
                </button>
            </div>

            {activeTab === 'recipients' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3>Recipient Rules</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Define who receives emails based on container data.
                        <br />(e.g., If Location is SNCT, Email snct@test.com)
                    </p>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>
                                <th style={{ padding: '1rem' }}>Match By</th>
                                <th style={{ padding: '1rem' }}>Value (e.g. SNCT)</th>
                                <th style={{ padding: '1rem' }}>Type</th>
                                <th style={{ padding: '1rem' }}>Email Address</th>
                                <th style={{ padding: '1rem' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {settings.recipients.map(rule => (
                                <tr key={rule.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem' }}>{rule.matchType}</td>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{rule.matchValue}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span className={`status-badge ${rule.emailType === 'To' ? 'status-completed' : 'status-progress'}`}>
                                            {rule.emailType}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>{rule.emailAddress}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button onClick={() => handleEditRecipient(rule)} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer' }}>
                                                <Save size={18} />
                                            </button>
                                            <button onClick={() => handleDeleteRecipient(rule.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            <tr>
                                <td style={{ padding: '1rem' }}>
                                    <select
                                        value={newRule.matchType}
                                        onChange={e => setNewRule({ ...newRule, matchType: e.target.value })}
                                        style={{ padding: '0.5rem' }}
                                    >
                                        <option>Location</option>
                                        <option>Shipping Line</option>
                                        <option>Customer</option>
                                    </select>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <input
                                        placeholder="Specific Value..."
                                        value={newRule.matchValue}
                                        onChange={e => setNewRule({ ...newRule, matchValue: e.target.value })}
                                        style={{ padding: '0.5rem' }}
                                    />
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <select
                                        value={newRule.emailType}
                                        onChange={e => setNewRule({ ...newRule, emailType: e.target.value })}
                                        style={{ padding: '0.5rem' }}
                                    >
                                        <option value="To">To (Receiver)</option>
                                        <option value="CC">CC (Reference)</option>
                                    </select>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <input
                                        placeholder="name@company.com"
                                        value={newRule.emailAddress}
                                        onChange={e => setNewRule({ ...newRule, emailAddress: e.target.value })}
                                        style={{ padding: '0.5rem' }}
                                    />
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-primary" onClick={handleAddRecipient}>
                                            {editingId ? 'Update' : <><Plus size={16} /> Add</>}
                                        </button>
                                        {editingId && (
                                            <button className="btn btn-secondary" onClick={handleCancelEdit}>
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'template' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3>Email Template Editor</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Available placeholders: {'{bookingNo}'}, {'{containerNo}'}, {'{qty}'}, {'{location}'}, {'{shippingLine}'}, {'{customer}'}, {'{size}'}, {'{temperature}'}, {'{vent}'}, {'{pickupDate}'}
                    </p>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Subject Line</label>
                        <input
                            name="subject"
                            value={settings.template.subject}
                            onChange={handleTemplateChange}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email Body</label>
                        <textarea
                            name="body"
                            value={settings.template.body}
                            onChange={handleTemplateChange}
                            style={{ width: '100%', height: '300px', fontFamily: 'monospace', lineHeight: '1.5' }}
                        />
                    </div>
                </div>
            )}

        </div>
    );
}
