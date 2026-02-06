import { useState, useEffect } from 'react';
import PTIForm from '../components/PTIForm';
import { getPTIRecords, addPTIRecord } from '../lib/storage';

export default function CustomerRequest() {
    const [data, setData] = useState([]);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        const load = async () => {
            const records = await getPTIRecords();
            setData(records);
        };
        load();
    }, []);

    const handleSave = async (recordOrRecords) => {
        const timestamp = Date.now();
        const recordsToSave = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];

        for (const [index, rec] of recordsToSave.entries()) {
            await addPTIRecord({
                ...rec,
                id: `${timestamp}-${index}`
            });
        }
        setSaveSuccess(true);
    };

    if (saveSuccess) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-color)',
                color: 'white',
                padding: '2rem',
                textAlign: 'center'
            }}>
                <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid var(--primary)',
                    padding: '3rem',
                    borderRadius: '24px',
                    maxWidth: '500px'
                }}>
                    <h1 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>접수 완료!</h1>
                    <p style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '2rem' }}>
                        PTI 요청이 성공적으로 등록되었습니다.<br />
                        관리자가 확인 후 처리할 예정입니다.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            padding: '1rem 2rem',
                            borderRadius: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        추가 접수하기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: 'var(--bg-color)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PTIForm
                data={data}
                onSave={handleSave}
                standalone={true}
            />
        </div>
    );
}
