import Database from 'better-sqlite3';
try {
    const db = new Database('pti_final.db');
    console.log('Opened successfully');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables);
} catch (e) {
    console.error('Error:', e.message);
}
