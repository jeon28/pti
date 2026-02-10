import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PTIList from './components/PTIList';
import PTIForm from './components/PTIForm';
import SpecialContainerList from './components/SpecialContainerList';
import SpecialContainerForm from './components/SpecialContainerForm';
import EmailSettings from './components/EmailSettings';
import { getPTIRecords, addPTIRecord, deletePTIRecord, movePTIToTrash } from './lib/storage';
import Reports from './components/Reports';
import TrashView from './components/Trash';
import CustomerRequest from './pages/CustomerRequest';

function AdminMain() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [data, setData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('[AdminMain] loading data for:', currentView);
      let records;
      if (currentView === 'pti-list') {
        records = await getPTIRecords('PTI');
      } else if (currentView === 'special-list') {
        records = await getPTIRecords('SPECIAL');
      } else {
        records = await getPTIRecords();
      }
      setData(Array.isArray(records) ? records : []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentView]);

  const handleSave = async (recordOrRecords) => {
    try {
      const timestamp = Date.now();
      const recordsToSave = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];

      if (editingRecord) {
        const recordsToDelete = data.filter(r => r && r.bookingNo === editingRecord.bookingNo);
        for (const r of recordsToDelete) {
          await deletePTIRecord(r.id);
        }
      }

      for (const [index, rec] of recordsToSave.entries()) {
        await addPTIRecord({
          ...rec,
          id: `${rec.type === 'SPECIAL' ? 'SPECIAL' : 'PTI'}-${timestamp}-${index}`
        });
      }

      await loadData();
      setShowForm(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Save failed:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id) => {
    const recordToDelete = data.find(r => r && r.id === id);
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
    const ptiData = Array.isArray(data) ? data.filter(r => r && r.type !== 'SPECIAL') : [];
    return {
      total: ptiData.length,
      pending: ptiData.filter(r => r.ptiStatus === 'Pending').length,
      inProgress: ptiData.filter(r => r.ptiStatus === 'In Progress').length,
      completed: ptiData.filter(r => r.ptiStatus === 'Pass').length,
      pickedUp: ptiData.filter(r => r.pickupStatus === 'Picked Up').length
    };
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-color)', overflow: 'hidden' }}>
      <div style={{ width: '260px', minWidth: '260px', display: 'flex' }}>
        <Sidebar currentView={currentView} setView={setCurrentView} />
      </div>

      <main className="main-content" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {isLoading && (
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--primary)', fontSize: '0.8rem', zIndex: 100 }}>
            Loading...
          </div>
        )}
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
        {currentView === 'special-list' && (
          <SpecialContainerList
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

      {showForm && currentView === 'pti-list' && (
        <PTIForm
          record={editingRecord}
          data={data}
          onClose={() => { setShowForm(false); setEditingRecord(null); }}
          onSave={handleSave}
        />
      )}

      {showForm && currentView === 'special-list' && (
        <SpecialContainerForm
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
