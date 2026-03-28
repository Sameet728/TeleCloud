/**
 * Test Cached Music Streaming Endpoint
 * Run this to verify the caching system is working
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TOKEN = process.env.MUSIC_TEST_TOKEN || 'YOUR_JWT_TOKEN_HERE';
const TEST_VIDEO_ID = 'dQw4w9WgXcQ'; // Never Gonna Give You Up

async function testCachedStreaming() {
  console.log('🎵 Testing Cached Music Streaming\n');
  
  try {
    // Test 1: Check song status (should be "not_found" initially)
    console.log('📊 Test 1: Checking initial song status...');
    const statusResponse = await axios.get(
      `${BASE_URL}/api/music/cached/status?videoId=${TEST_VIDEO_ID}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log('Initial Status:', statusResponse.data);
    console.log('✅ Status check passed\n');
    
    // Test 2: Start streaming (this should trigger download + upload)
    console.log('⏳ Test 2: Starting stream (will download if first time)...');
    console.log('This may take 30-60 seconds for first download...\n');
    
    const startTime = Date.now();
    
    const streamResponse = await axios.get(
      `${BASE_URL}/api/music/cached/stream?videoId=${TEST_VIDEO_ID}`,
      {
        headers: { 
          Authorization: `Bearer ${TOKEN}`,
          Range: 'bytes=0-1024' // Just get first KB to test
        },
        responseType: 'stream',
        timeout: 120000 // 2 minutes timeout
      }
    );
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Stream started in ${duration}s`);
    console.log('Content-Type:', streamResponse.headers['content-type']);
    console.log('Content-Length:', streamResponse.headers['content-length']);
    console.log('Status:', streamResponse.status);
    
    // Collect data
    let totalBytes = 0;
    
    await new Promise((resolve, reject) => {
      streamResponse.data.on('data', chunk => {
        totalBytes += chunk.length;
      });
      
      streamResponse.data.on('end', () => {
        console.log(`\n✅ Downloaded ${totalBytes} bytes successfully`);
        resolve();
      });
      
      streamResponse.data.on('error', err => {
        console.error('❌ Stream error:', err.message);
        reject(err);
      });
    });
    
    // Test 3: Check status again (should be "ready" now)
    console.log('\n📊 Test 3: Checking song status after stream...');
    const finalStatusResponse = await axios.get(
      `${BASE_URL}/api/music/cached/status?videoId=${TEST_VIDEO_ID}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    
    console.log('Final Status:', finalStatusResponse.data);
    
    if (finalStatusResponse.data.status === 'ready') {
      console.log('\n✅ SUCCESS! Song is cached in database and Telegram');
    } else if (finalStatusResponse.data.status === 'failed') {
      console.log('\n❌ FAILED! Check server logs for error:', finalStatusResponse.data.errorMessage);
    } else {
      console.log('\n⚠️  UNEXPECTED STATUS:', finalStatusResponse.data.status);
    }
    
    // Test 4: Second stream (should be instant from cache)
    console.log('\n⏳ Test 4: Second stream (should be instant from cache)...');
    const secondStartTime = Date.now();
    
    const secondStreamResponse = await axios.get(
      `${BASE_URL}/api/music/cached/stream?videoId=${TEST_VIDEO_ID}`,
      {
        headers: { 
          Authorization: `Bearer ${TOKEN}`,
          Range: 'bytes=0-1024'
        },
        responseType: 'stream'
      }
    );
    
    const secondEndTime = Date.now();
    const secondDuration = ((secondEndTime - secondStartTime) / 1000).toFixed(2);
    
    console.log(`✅ Second stream started in ${secondDuration}s (should be < 2s)`);
    
    if (secondDuration < 2) {
      console.log('✅ CACHE WORKING! Streamed from Telegram instantly');
    } else {
      console.log('⚠️  Cache might not be working - took too long');
    }
    
    console.log('\n🎉 All tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
testCachedStreaming();
