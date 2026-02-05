import fetch from 'node-fetch';

const API_URL = 'http://127.0.0.1:3000/api/message';
const API_KEY = '123456';
const CONV_ID = 'sim_test_' + Date.now();

async function sendMessage(message, turn) {
    console.log(`\n--- Turn ${turn}: Scammer says ---`);
    console.log(`"${message}"`);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                conversation_id: CONV_ID,
                message: message,
                timestamp: new Date().toISOString()
            })
        });

        const data = await response.json();

        console.log(`\n[System Response]`);
        console.log(`Scam Detected: ${data.scam_detected}`);
        console.log(`Agent says: "${data.agent_response}"`);

        if (data.extracted_intelligence && Object.keys(data.extracted_intelligence).length > 0) {
            // Filter out empty arrays for cleaner output
            const intel = Object.entries(data.extracted_intelligence)
                .filter(([_, val]) => Array.isArray(val) && val.length > 0)
                .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

            if (Object.keys(intel).length > 0) {
                console.log(`⚠️  EXTRACTED INTEL:`, JSON.stringify(intel, null, 2));
            } else {
                console.log(`(No new intel extracted yet)`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

async function runSimulation() {
    // Turn 1: Open the scam
    await sendMessage("Dear user your SBI bank account blocked today. Please update PAN immediately.", 1);

    // Wait a bit
    await new Promise(r => setTimeout(r, 2000));

    // Turn 2: Provide details (Simulating scammer reply to agent)
    // The Agent likely asked "Oh no, how do I do that?"
    await sendMessage("Send 10rs verification charge to my UPI id: manager@oksbi or paytm 9876543210 to unblock immediately.", 2);
}

runSimulation();
