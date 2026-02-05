import { readFileSync, writeFileSync } from 'fs';

try {
    const raw = readFileSync('src/initialData.json', 'utf8');
    const data = JSON.parse(raw);

    const simulated = data.map(record => {
        const rand = Math.random();
        let ptiStatus = 'Completed';
        let pickupStatus = 'Not Picked Up';

        // 85% probability of being completed by 21:10
        if (rand > 0.85) {
            ptiStatus = 'In Progress';
        } else if (rand > 0.95) {
            ptiStatus = 'Pending';
        }

        // 60% probability of being picked up if completed
        if (ptiStatus === 'Completed' && Math.random() < 0.6) {
            pickupStatus = 'Picked Up';
        }

        return {
            ...record,
            ptiStatus,
            pickupStatus
        };
    });

    writeFileSync('src/initialData.json', JSON.stringify(simulated, null, 2));
    console.log('Successfully simulated 21:10 PM state in src/initialData.json');
} catch (e) {
    console.error(e.message);
}
