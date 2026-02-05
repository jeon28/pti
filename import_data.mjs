import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to calculate request date (today) and pickup date (+2 days)
const getToday = () => new Date().toISOString().split('T')[0];
const getTwoDaysLater = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
};

try {
    const workbook = XLSX.readFile('SAMPLE.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Parse JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: "A" });

    // Mappings based on user request and inspection
    // A: Shipping Line (한진 -> HJIT?? No, wait. User mapped locations. Line is diff?)
    // User said: "선광 -snct 한진이-hjit" -> This usually refers to Location based on context, but let's check column A.
    // Excel A1 says '한진'. D1 is Booking. C1 is Container? Wait.
    // Let's re-read the inspection output.
    // A1: 한진
    // B1: 디지카고 (Customer?)
    // C1: SNKO... (Booking?)
    // D1: SEKU... (Container?)
    // E1: Tech spec?

    // Need to map carefully. 
    // User Request: "sample.xlsx를 데이터로 치횐해줘 선광 -snct 한진이-hjit 야"
    // '한진' in A1 might be Location (HJIT)? '선광' -> SNCT.

    const validRecords = rawData.map((row, index) => {
        const rawLoc = row['A']?.trim(); // '한진', '선광' etc

        let location = 'SNCT'; // Default
        if (rawLoc === '한진') location = 'HJIT';
        if (rawLoc === '선광') location = 'SNCT';

        // Infer Shipping Line from Booking (C)
        // C: SNKO... -> SKR, HASLK... -> HAL
        const booking = row['C'] || '';
        let line = 'SKR';
        if (booking.startsWith('HASLK')) line = 'HAL';
        if (booking.startsWith('SNKO')) line = 'SKR';
        // Or maybe A is customer? No, B looks like Customer (Digicargo).

        // E1 column has "Temp 23.0℃ / Vent Close"
        const specs = row['E'] || '';
        let temp = '';
        let vent = 'CLOSED';

        // Extract Temp
        const tempMatch = specs.match(/Temp\s*([-\d\.]+)/i);
        if (tempMatch) temp = tempMatch[1];

        // Extract Vent
        if (specs.toLowerCase().includes('open')) {
            // Try to find open val? Usually "Vent Open 15%"
            const ventMatch = specs.match(/Vent\s*Open\s*(\d+)/i);
            if (ventMatch) vent = ventMatch[1];
            else vent = 'OPEN';
        }

        return {
            id: Date.now().toString() + '-' + index,
            shippingLine: line,
            customer: row['B'] || 'Unknown',
            bookingNo: booking,
            size: '40', // Defaulting to 40 as seen in sample (RF22REx1 might imply size?)
            containerNo: row['D'] || '',
            location: location,
            requestDate: getToday(),
            ptiStatus: 'Pending',
            pickupStatus: 'Not Picked Up',
            pickupDate: getTwoDaysLater(),
            temperature: temp,
            vent: vent
        };
    }).filter(r => r.containerNo); // Only valid if has container no

    writeFileSync('src/initialData.json', JSON.stringify(validRecords, null, 2));
    console.log('Successfully wrote data to src/initialData.json');

} catch (error) {
    console.error('Error:', error.message);
}
