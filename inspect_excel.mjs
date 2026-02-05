import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
    const workbook = XLSX.readFile('SAMPLE.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get range to find headers (assuming row 1)
    const range = worksheet['!ref'];
    console.log('Sheet Name:', sheetName);
    console.log('Range:', range);

    // Quick peek at cell addresses for row 1
    for (let col = 0; col < 26; col++) {
        const char = String.fromCharCode(65 + col);
        const cell = worksheet[`${char}1`];
        if (cell) {
            console.log(`${char}1:`, cell.v);
        }
    }
} catch (error) {
    console.error('Error reading file:', error.message);
}
