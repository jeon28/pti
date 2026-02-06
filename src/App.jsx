import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PTIList from './components/PTIList';
import PTIForm from './components/PTIForm';
import EmailSettings from './components/EmailSettings';
import { getPTIRecords, addPTIRecord, updatePTIRecord, deletePTIRecord, movePTIToTrash } from './lib/storage';
import Reports from './components/Reports';
import TrashView from './components/Trash';
import CustomerRequest from './pages/CustomerRequest';

function AdminMain() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [data, setData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showUndo, setShowUndo] = useState(false);

  const loadData = async () => {
    const records = await getPTIRecords();
    setData(records);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (recordOrRecords) => {
    const timestamp = Date.now();
    const recordsToSave = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];

    if (editingRecord) {
      const recordsToDelete = data.filter(r => r.bookingNo === editingRecord.bookingNo);
      for (const r of recordsToDelete) {
        await deletePTIRecord(r.id);
      }
    }

    for (const [index, rec] of recordsToSave.entries()) {
      await addPTIRecord({
        ...rec,
        id: `${timestamp}-${index}`
      });
    }

    await loadData();
    setShowForm(false);
    setEditingRecord(null);
  };

  const handleDelete = async (id) => {
    const recordToDelete = data.find(r => r.id === id);
    if (recordToDelete) {
      if (confirm('이 데이터를 휴지통으로 이동하시겠습니까?')) {
        await movePTIToTrash([recordToDelete]);
        await loadData();
      }
    }
  };

  const handleBulkDelete = async (recordsToDelete) => {
    if (confirm('선택한 항목들을 휴지통으로 이동하시겠습니까?')) {
      await movePTIToTrash(recordsToDelete);
      await loadData();
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingRecord(null);
    setShowForm(true);
  };

  const getStats = () => {
    return {
      total: data.length,
      pending: data.filter(r => r.ptiStatus === 'Pending').length,
      inProgress: data.filter(r => r.ptiStatus === 'In Progress').length,
      completed: data.filter(r => r.ptiStatus === 'Pass').length,
      pickedUp: data.filter(r => r.pickupStatus === 'Picked Up').length
    };
  };

  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth > 150 && newWidth < 500) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-color)', overflow: 'hidden' }}>
      <div style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px`, display: 'flex' }}>
        <Sidebar currentView={currentView} setView={setCurrentView} />
      </div>

      <div
        onMouseDown={startResizing}
        style={{
          width: '6px',
          cursor: 'col-resize',
          background: isResizing ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
          transition: 'background 0.2s',
          zIndex: 10
        }}
      />

      <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
        {currentView === 'dashboard' && <Dashboard stats={getStats()} />}
        {currentView === 'pti-list' && (
          <PTIList
            records={data}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onRefresh={loadData}
            onAddNew={handleAddNew}
          />
        )}
        {currentView === 'reports' && <Reports />}
        {currentView === 'settings' && <EmailSettings />}
        {currentView === 'trash' && <TrashView onRefresh={loadData} />}
      </main>

      {showForm && (
        <PTIForm
          record={editingRecord}
          data={data}
          onClose={() => { setShowForm(false); setEditingRecord(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminMain />} />
        <Route path="/request" element={<CustomerRequest />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
