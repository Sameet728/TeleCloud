/**
 * Test script to verify background caching works without yt-dlp
 * This simulates a stream request and monitors the background caching process
 */

const axios = require('axios');

// Test video ID (a popular song that should be available)
const TEST_VIDEO_ID = 'kJQP7kiw5Fk'; // Luis Fonsi - Despacito
const API_URL = 'http://localhost:5000';
const TOKEN = 'test-token'; // You'll need to replace this with a real JWT token

async function testLegacyStream() {
  console.log('\n===========================================');
  console.log('🎵 TESTING LEGACY STREAM WITH BACKGROUND CACHE');
  console.log('===========================================\n');
  
  try {
    console.log(`📹 Video ID: ${TEST_VIDEO_ID}`);
    console.log(`🔗 Stream URL: ${API_URL}/api/music/stream?videoId=${TEST_VIDEO_ID}&token=${TOKEN}\n`);
    
    console.log('⏳ Starting stream request...\n');
    
    const response = await axios.get(`${API_URL}/api/music/stream?videoId=${TEST_VIDEO_ID}&token=${TOKEN}`, {
      responseType: 'stream',
      timeout: 60000, // 60 second timeout
      validateStatus: () => true,
    });
    
    if (response.status >= 400) {
      console.error(`❌ Request failed with status: ${response.statusCode}`);
      return;
    }
    
    let totalBytes = 0;
    let chunks = 0;
    
    response.data.on('data', (chunk) => {
      totalBytes += chunk.length;
      chunks++;
      
      if (chunks % 100 === 0) {
        console.log(`📊 Progress: ${(totalBytes / 1024 / 1024).toFixed(2)} MB received`);
      }
    });
    
    response.data.on('end', () => {
      console.log('\n✅ Stream completed successfully!');
      console.log(`📊 Total bytes: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📦 Total chunks: ${chunks}`);
      console.log('\n💡 Check server logs for background caching progress...\n');
    });
    
    response.data.on('error', (err) => {
      console.error('\n❌ Stream error:', err.message);
    });
    
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
    }
  }
}

// Run the test
console.log('\n🚀 Starting test in 3 seconds... Press Ctrl+C to cancel\n');
setTimeout(() => {
  testLegacyStream();
}, 3000);
