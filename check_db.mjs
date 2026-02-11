import Database from 'better-sqlite3';
try {
    const db = new Database('pti.db');
    console.log('--- Table Info ---');
    const tableInfo = db.prepare("PRAGMA table_info(pti_records)").all();
    console.log(tableInfo.map(c => c.name));

    console.log('\n--- Sample Records (Type: SPECIAL) ---');
    const records = db.prepare("SELECT * FROM pti_records WHERE type = 'SPECIAL' LIMIT 5").all();
    console.log(records);
} catch (e) {
    console.error('Error:', e.message);
}
