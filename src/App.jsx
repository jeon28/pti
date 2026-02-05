import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PTIList from './components/PTIList';
import PTIForm from './components/PTIForm';
import EmailSettings from './components/EmailSettings';
import { getPTIRecords, addPTIRecord, updatePTIRecord, deletePTIRecord, movePTIToTrash } from './lib/storage';
import initialData from './initialData.json';

import Reports from './components/Reports';
import TrashView from './components/Trash';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [data, setData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [lastDeletedData, setLastDeletedData] = useState(null);
  const [showUndo, setShowUndo] = useState(false);

  const loadData = () => {
    const records = getPTIRecords();
    setData(records);
  };

  useEffect(() => {
    let records = getPTIRecords();
    if (records.length === 0) {
      records = initialData;
      localStorage.setItem('pti_data', JSON.stringify(records));
    }
    setData(records);
  }, []);

  const handleSave = (recordOrRecords) => {
    const timestamp = Date.now();
    if (editingRecord) {
      const allRecords = getPTIRecords();
      const newRecords = allRecords.filter(r => r.bookingNo !== editingRecord.bookingNo);
      localStorage.setItem('pti_data', JSON.stringify(newRecords));
    }

    if (Array.isArray(recordOrRecords)) {
      recordOrRecords.forEach((rec, index) => {
        addPTIRecord({ ...rec, id: `${timestamp}-${index}` });
      });
    } else {
      addPTIRecord({ ...recordOrRecords, id: timestamp.toString() });
    }

    loadData();
    setShowForm(false);
    setEditingRecord(null);
  };

  const handleDelete = (id) => {
    const recordToDelete = data.find(r => r.id === id);
    if (recordToDelete) {
      if (confirm('이 데이터를 휴지통으로 이동하시겠습니까?')) {
        movePTIToTrash([recordToDelete]);
        deletePTIRecord(id);
        loadData();
      }
    }
  };

  const handleBulkDelete = (recordsToDelete) => {
    if (confirm('선택한 항목들을 휴지통으로 이동하시겠습니까?')) {
      movePTIToTrash(recordsToDelete);
      const idsToDelete = recordsToDelete.map(r => r.id);
      const allRecords = getPTIRecords();
      const remainingRecords = allRecords.filter(r => !idsToDelete.includes(r.id));
      localStorage.setItem('pti_data', JSON.stringify(remainingRecords));
      loadData();
    }
  };

  const handleUndo = () => {
    if (!lastDeletedData) return;
    const allRecords = getPTIRecords();
    const restoredData = [...lastDeletedData, ...allRecords];
    localStorage.setItem('pti_data', JSON.stringify(restoredData));
    setLastDeletedData(null);
    setShowUndo(false);
    loadData();
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

      {/* Resizable Divider (Partition Ruler) */}
      <div
        onMouseDown={startResizing}
        style={{
          width: '6px',
          cursor: 'col-resize',
          background: isResizing ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
          transition: 'background 0.2s',
          zIndex: 10,
          '&:hover': { background: 'rgba(59,130,246,0.3)' }
        }}
      />

      <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
        {currentView === 'dashboard' && (
          <Dashboard stats={getStats()} />
        )}

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

        {currentView === 'reports' && (
          <Reports />
        )}

        {currentView === 'settings' && (
          <EmailSettings />
        )}

        {currentView === 'trash' && (
          <TrashView onRefresh={loadData} />
        )}
      </main>


      {showUndo && (
        <div style={{
          position: 'fixed',
          bottom: '2.5rem',
          right: '2.5rem',
          background: '#1e293b',
          color: '#fff',
          padding: '1.25rem 2rem',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          zIndex: 9999,
          border: '2px solid var(--primary)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>데이터가 삭제되었습니다.</span>
          <button
            onClick={handleUndo}
            style={{
              background: 'var(--primary)',
              border: 'none',
              color: 'white',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.9rem',
              boxShadow: '0 4px 10px rgba(59, 130, 246, 0.5)'
            }}
          >
            삭제 취소 (복구)
          </button>
        </div>
      )}

      {showForm && (
        <PTIForm
          record={editingRecord}
          onClose={() => { setShowForm(false); setEditingRecord(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default App;
