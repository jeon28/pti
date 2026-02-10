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
    vent TEXT,
    humidity TEXT,
    email TEXT,
    type TEXT DEFAULT 'PTI'
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
    humidity TEXT,
    email TEXT,
    deletedAt TEXT,
    type TEXT DEFAULT 'PTI'
  );

  CREATE TABLE IF NOT EXISTS email_settings (
    id TEXT PRIMARY KEY,
    settings JSON
  );
`);

// Seed initial data if database is empty
const rowCount = db.prepare('SELECT COUNT(*) as count FROM pti_records').get();
if (rowCount.count === 0) {
    const initialDataPath = join(__dirname, 'src', 'initialData.json');
    if (fs.existsSync(initialDataPath)) {
        const initialData = JSON.parse(fs.readFileSync(initialDataPath, 'utf8'));
        const insert = db.prepare(`
            INSERT INTO pti_records (id, shippingLine, customer, bookingNo, size, containerNo, location, requestDate, ptiStatus, pickupStatus, pickupDate, temperature, vent, humidity, email, type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertMany = db.transaction((records) => {
            for (const rec of records) {
                insert.run(rec.id, rec.shippingLine, rec.customer, rec.bookingNo, rec.size, rec.containerNo, rec.location, rec.requestDate, rec.ptiStatus, rec.pickupStatus, rec.pickupDate, rec.temperature, rec.vent, rec.humidity, rec.email, rec.type || (rec.id && String(rec.id).startsWith('SPECIAL') ? 'SPECIAL' : 'PTI'));
            }
        });
        insertMany(initialData);
        console.log('Seeded initial data into SQLite');
    }
}

// Routes
app.get('/api/pti', (req, res) => {
    const { type } = req.query;
    let records;
    if (type) {
        records = db.prepare('SELECT * FROM pti_records WHERE type = ? ORDER BY requestDate DESC').all(type);
    } else {
        records = db.prepare('SELECT * FROM pti_records ORDER BY requestDate DESC').all();
    }
    res.json(records);
});

app.post('/api/pti', (req, res) => {
    const record = req.body;
    const insert = db.prepare(`
        INSERT INTO pti_records (id, shippingLine, customer, bookingNo, size, containerNo, location, requestDate, ptiStatus, pickupStatus, pickupDate, temperature, vent, humidity, email, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(record.id, record.shippingLine, record.customer, record.bookingNo, record.size, record.containerNo, record.location, record.requestDate, record.ptiStatus, record.pickupStatus, record.pickupDate, record.temperature, record.vent, record.humidity, record.email, record.type || 'PTI');
    res.status(201).json(record);
});

app.put('/api/pti/:id', (req, res) => {
    const { id } = req.params;
    const record = req.body;
    const update = db.prepare(`
        UPDATE pti_records 
        SET shippingLine = ?, customer = ?, bookingNo = ?, size = ?, containerNo = ?, location = ?, requestDate = ?, ptiStatus = ?, pickupStatus = ?, pickupDate = ?, temperature = ?, vent = ?, humidity = ?, email = ?, type = ?
        WHERE id = ?
    `);
    update.run(record.shippingLine, record.customer, record.bookingNo, record.size, record.containerNo, record.location, record.requestDate, record.ptiStatus, record.pickupStatus, record.pickupDate, record.temperature, record.vent, record.humidity, record.email, record.type || 'PTI', id);
    res.json(record);
});

app.delete('/api/pti/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM pti_records WHERE id = ?').run(id);
    res.status(204).send();
});

app.get('/api/trash', (req, res) => {
    const records = db.prepare('SELECT * FROM trash_records ORDER BY deletedAt DESC').all();
    res.json(records);
});

app.post('/api/trash', (req, res) => {
    const records = req.body;
    const insert = db.prepare(`
        INSERT INTO trash_records (id, shippingLine, customer, bookingNo, size, containerNo, location, requestDate, ptiStatus, pickupStatus, pickupDate, temperature, vent, humidity, email, deletedAt, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const deleteOriginal = db.prepare('DELETE FROM pti_records WHERE id = ?');
    const transfer = db.transaction((recs) => {
        const now = new Date().toISOString();
        for (const r of recs) {
            insert.run(r.id, r.shippingLine, r.customer, r.bookingNo, r.size, r.containerNo, r.location, r.requestDate, r.ptiStatus, r.pickupStatus, r.pickupDate, r.temperature, r.vent, r.humidity, r.email, now, r.type || 'PTI');
            deleteOriginal.run(r.id);
        }
    });
    transfer(records);
    res.status(201).json(records);
});

app.post('/api/trash/recover', (req, res) => {
    const record = req.body;
    const insert = db.prepare(`
        INSERT INTO pti_records (id, shippingLine, customer, bookingNo, size, containerNo, location, requestDate, ptiStatus, pickupStatus, pickupDate, temperature, vent, humidity, email, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const deleteFromTrash = db.prepare('DELETE FROM trash_records WHERE id = ?');
    const recover = db.transaction((r) => {
        insert.run(r.id, r.shippingLine, r.customer, r.bookingNo, r.size, r.containerNo, r.location, r.requestDate, r.ptiStatus, r.pickupStatus, r.pickupDate, r.temperature, r.vent, r.humidity, r.email, r.type || 'PTI');
        deleteFromTrash.run(r.id);
    });
    recover(record);
    res.status(201).json(record);
});

app.delete('/api/trash/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM trash_records WHERE id = ?').run(id);
    res.status(204).send();
});

app.get('/api/settings/email', (req, res) => {
    const row = db.prepare('SELECT settings FROM email_settings WHERE id = ?').get('default');
    if (row) {
        res.json(JSON.parse(row.settings));
    } else {
        res.json({ recipients: [], template: { subject: '', body: '' } });
    }
});

app.post('/api/settings/email', (req, res) => {
    const settings = req.body;
    const insert = db.prepare('INSERT OR REPLACE INTO email_settings (id, settings) VALUES (?, ?)');
    insert.run('default', JSON.stringify(settings));
    res.status(201).json(settings);
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:3001`);
});
