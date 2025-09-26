// Simple test script to verify foopee event source
const axios = require('axios');

async function testFoopeeEventSource() {
    try {
        console.log('Testing foopee event source...');

        // Start the dev server first if not already running
        // npm run dev

        const response = await axios.get('http://localhost:3000/api/events?id=foopee:default');

        console.log('Status:', response.status);
        console.log('Events found:', response.data.events?.length || 0);
        console.log('Source info:', response.data.source);

        if (response.data.events && response.data.events.length > 0) {
            console.log('\nFirst event example:');
            console.log(JSON.stringify(response.data.events[0], null, 2));
        }

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('Could not connect to dev server. Make sure to run "npm run dev" first.');
        } else {
            console.error('Error testing foopee event source:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
        }
    }
}

testFoopeeEventSource();