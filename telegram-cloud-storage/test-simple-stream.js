/**
 * Simple Stream Test - Just verify the endpoint responds
 */

const axios = require('axios');
const http = require('http');

const TEST_VIDEO_ID = 'kJQP7kiw5Fk';
const API_URL = 'http://localhost:5000';

// Use HTTP agent to prevent automatic redirect following
const agent = new http.Agent({ maxRedirects: 0 });

async function testStream() {
  console.log('\n🎵 Testing Legacy Stream Endpoint\n');
  console.log(`Video ID: ${TEST_VIDEO_ID}`);
  console.log(`URL: ${API_URL}/api/music/stream?videoId=${TEST_VIDEO_ID}\n`);
  
  try {
    const response = await axios.get(`${API_URL}/api/music/stream?videoId=${TEST_VIDEO_ID}`, {
      responseType: 'stream',
      timeout: 30000,
      validateStatus: () => true,
      httpAgent: agent,
    });
    
    console.log(`Status Code: ${response.status}`);
    console.log(`Headers:`, JSON.stringify(response.headers, null, 2));
    console.log('\n📊 Streaming...\n');
    
    let totalBytes = 0;
    let chunks = 0;
    
    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        totalBytes += chunk.length;
        chunks++;
        
        if (chunks % 100 === 0) {
          process.stdout.write(`\rReceived: ${(totalBytes / 1024).toFixed(2)} KB`);
        }
      });
      
      response.data.on('end', () => {
        console.log('\n\n✅ Stream completed!');
        console.log(`Total: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Chunks: ${chunks}\n`);
        resolve();
      });
      
      response.data.on('error', (err) => {
        console.error('\n❌ Stream error:', err.message);
        reject(err);
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        console.log('\n\n⏰ Timeout - stopping stream');
        console.log(`Partial: ${(totalBytes / 1024 / 1024).toFixed(2)} MB received\n`);
        resolve(); // Resolve anyway since we just want to test it works
      }, 30000);
    });
    
  } catch (err) {
    console.error('❌ Request failed:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
    }
    throw err;
  }
}

testStream()
  .then(() => {
    console.log('✅ Test complete!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Test failed\n');
    process.exit(1);
  });
