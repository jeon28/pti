import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;
const dbPath = join(__dirname, 'pti.db');

app.use(cors());
app.use(express.json());

const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS pti_records (
    id TEXT PRIMARY KEY,
    shippingLine TEXT,
    customer TEXT,
    bookingNo TEXT,
    size TEXT,
    containerNo TEXT,
    location TEXT,
    requestDate TEXT,
    ptiStatus TEXT,
    pickupStatus TEXT,
    pickupDate TEXT,
    temperature TEXT,
    vent TEXT
  );

  CREATE TABLE IF NOT EXISTS trash_records (
    id TEXT PRIMARY KEY,
    shippingLine TEXT,
    customer TEXT,
    bookingNo TEXT,
    size TEXT,
    containerNo TEXT,
    location TEXT,
    requestDate TEXT,
    ptiStatus TEXT,
    pickupStatus TEXT,
    pickupDate TEXT,
    temperature TEXT,
    vent TEXT,
    deletedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed initial data if empty
const count = db.prepare('SELECT COUNT(*) as count FROM pti_records').get().count;
if (count === 0) {
    const initialDataPath = join(__dirname, 'src', 'initialData.json');
    if (fs.existsSync(initialDataPath)) {
        const initialData = JSON.parse(fs.readFileSync(initialDataPath, 'utf8'));
        const insert = db.prepare(`
            INSERT INTO pti_records (id, shippingLine, customer, bookingNo, size, containerNo, location, requestDate, ptiStatus, pickupStatus, pickupDate, temperature, vent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertMany = db.transaction((records) => {
            for (const r of records) insert.run(r.id, r.shippingLine, r.customer, r.bookingNo, r.size, r.containerNo, r.location, r.requestDate, r.ptiStatus, r.pickupStatus, r.pickupDate, r.temperature, r.vent);
        });
        insertMany(initialData);
        console.log('Seeded initial data into SQLite');
    }
}

// Routes
app.get('/api/pti', (req, res) => {
    const records = db.prepare('SELECT * FROM pti_records ORDER BY requestDate DESC').all();
    res.json(records);
});

app.post('/api/pti', (req, res) => {
    const record = req.body;
    const insert = db.prepare(`
        INSERT INTO pti_records (id, shippingLine, customer, bookingNo, size, containerNo, location, requestDate, ptiStatus, pickupStatus, pickupDate, temperature, vent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(record.id, record.shippingLine, record.customer, record.bookingNo, record.size, record.containerNo, record.location, record.requestDate, record.ptiStatus, record.pickupStatus, record.pickupDate, record.temperature, record.vent);
    res.status(201).json(record);
});

app.put('/api/pti/:id', (req, res) => {
    const { id } = req.params;
    const record = req.body;
    const update = db.prepare(`
        UPDATE pti_records 
        SET shippingLine = ?, customer = ?, bookingNo = ?, size = ?, containerNo = ?, location = ?, requestDate = ?, ptiStatus = ?, pickupStatus = ?, pickupDate = ?, temperature = ?, vent = ?
        WHERE id = ?
    `);
    update.run(record.shippingLine, record.customer, record.bookingNo, record.size, record.containerNo, record.location, record.requestDate, record.ptiStatus, record.pickupStatus, record.pickupDate, record.temperature, record.vent, id);
    res.json(record);
});

app.delete('/api/pti/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM pti_records WHERE id = ?').run(id);
    res.status(204).end();
});

// Trash Routes
app.get('/api/trash', (req, res) => {
    const records = db.prepare('SELECT * FROM trash_records ORDER BY deletedAt DESC').all();
    res.json(records);
});

app.post('/api/trash/move', (req, res) => {
    const { ids } = req.body;
    const timestamp = new Date().toISOString();
    
    const moveTransaction = db.transaction((recordIds) => {
        for (const id of recordIds) {
            const record = db.prepare('SELECT * FROM pti_records WHERE id = ?').get(id);
            if (record) {
                const insertTrash = db.prepare(`
                    INSERT INTO trash_records (id, shippingLine, customer, bookingNo, size, containerNo, location, requestDate, ptiStatus, pickupStatus, pickupDate, temperature, vent, deletedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                insertTrash.run(record.id, record.shippingLine, record.customer, record.bookingNo, record.size, record.containerNo, record.location, record.requestDate, record.ptiStatus, record.pickupStatus, record.pickupDate, record.temperature, record.vent, timestamp);
                db.prepare('DELETE FROM pti_records WHERE id = ?').run(id);
            }
        }
    });
    
    moveTransaction(ids);
    res.status(200).json({ success: true });
});

app.post('/api/trash/restore', (req, res) => {
    const { ids } = req.body;
    const restoreTransaction = db.transaction((recordIds) => {
        for (const id of recordIds) {
            const record = db.prepare('SELECT * FROM trash_records WHERE id = ?').get(id);
            if (record) {
                const insertPti = db.prepare(`
                    INSERT INTO pti_records (id, shippingLine, customer, bookingNo, size, containerNo, location, requestDate, ptiStatus, pickupStatus, pickupDate, temperature, vent)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                insertPti.run(record.id, record.shippingLine, record.customer, record.bookingNo, record.size, record.containerNo, record.location, record.requestDate, record.ptiStatus, record.pickupStatus, record.pickupDate, record.temperature, record.vent);
                db.prepare('DELETE FROM trash_records WHERE id = ?').run(id);
            }
        }
    });
    restoreTransaction(ids);
    res.status(200).json({ success: true });
});

app.delete('/api/trash/clear', (req, res) => {
    db.prepare('DELETE FROM trash_records').run();
    res.status(204).end();
});

// Settings Routes
app.get('/api/settings/:key', (req, res) => {
    const { key } = req.params;
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    res.json(row ? JSON.parse(row.value) : null);
});

app.post('/api/settings/:key', (req, res) => {
    const { key } = req.params;
    const value = JSON.stringify(req.body);
    const upsert = db.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    upsert.run(key, value);
    res.status(200).json({ success: true });
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});
