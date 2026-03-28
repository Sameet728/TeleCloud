/**
 * Automated Test for Background Caching Flow
 * This script:
 * 1. Creates a test user and gets JWT token
 * 2. Triggers stream request to /api/music/stream
 * 3. Monitors server logs for background caching
 * 4. Verifies song is saved to MongoDB with status "ready"
 */

const axios = require('axios');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

const API_URL = 'http://localhost:5000';
const MONGO_URI = 'mongodb://sameetpisal_db_user:wcHoJrZSI4f0DnK1@ac-u13ggvv-shard-00-00.cwxk15w.mongodb.net:27017,ac-u13ggvv-shard-00-01.cwxk15w.mongodb.net:27017,ac-u13ggvv-shard-00-02.cwxk15w.mongodb.net:27017/?ssl=true&replicaSet=atlas-88bpdr-shard-0&authSource=admin&appName=Cluster0';

// Test with a known working video ID
const TEST_VIDEO_ID = 'kJQP7kiw5Fk'; // Luis Fonsi - Despacito (very popular, should work)

let authToken = null;
let testUser = null;

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function registerOrLogin() {
  console.log('\n📝 Step 1: Creating test user or logging in...\n');
  
  const testEmail = `test_music_${Date.now()}@telecloud.test`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Try to register
    const registerRes = await axios.post(`${API_URL}/api/auth/register`, {
      email: testEmail,
      password: testPassword,
    });
    
    testUser = registerRes.data.data;
    authToken = registerRes.data.data.token;
    console.log(`✅ Registered new user: ${testEmail}`);
    console.log(`👤 User ID: ${testUser._id}\n`);
  } catch (err) {
    if (err.response?.status === 409) {
      // User exists, login instead
      console.log('⚠️  User already exists, logging in...');
      const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
        email: testEmail,
        password: testPassword,
      });
      
      testUser = loginRes.data.data;
      authToken = loginRes.data.data.token;
      console.log(`✅ Logged in as: ${testEmail}`);
      console.log(`👤 User ID: ${testUser._id}\n`);
    } else {
      throw err;
    }
  }
  
  if (!authToken) {
    throw new Error('Failed to get auth token');
  }
}

async function triggerStreamRequest() {
  console.log('🎵 Step 2: Triggering stream request...\n');
  console.log(`📹 Video ID: ${TEST_VIDEO_ID}`);
  console.log(`🔗 URL: ${API_URL}/api/music/stream?videoId=${TEST_VIDEO_ID}\n`);
  
  let totalBytes = 0;
  let chunks = 0;
  let streamComplete = false;
  
  return new Promise((resolve, reject) => {
    axios.get(`${API_URL}/api/music/stream?videoId=${TEST_VIDEO_ID}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      responseType: 'stream',
      timeout: 120000, // 2 minute timeout
      validateStatus: () => true,
    })
    .then(response => {
      if (response.status >= 400) {
        reject(new Error(`Stream request failed with status ${response.statusCode}`));
        return;
      }
      
      response.data.on('data', (chunk) => {
        totalBytes += chunk.length;
        chunks++;
        
        if (chunks % 500 === 0) {
          process.stdout.write(`\r📊 Streaming... ${(totalBytes / 1024 / 1024).toFixed(2)} MB received`);
        }
      });
      
      response.data.on('end', () => {
        streamComplete = true;
        console.log('\n✅ Stream completed successfully!');
        console.log(`📊 Total bytes: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📦 Total chunks: ${chunks}\n`);
        resolve({ totalBytes, chunks });
      });
      
      response.data.on('error', (err) => {
        reject(new Error(`Stream error: ${err.message}`));
      });
    })
    .catch(err => {
      reject(err);
    });
  });
}

async function waitForBackgroundProcessing() {
  console.log('⏳ Step 3: Waiting for background caching to complete...\n');
  
  // Wait up to 60 seconds for background processing
  for (let i = 0; i < 60; i++) {
    await wait(1000);
    process.stdout.write(`\r⏳ Waiting... ${i + 1}s`);
    
    // Check if song exists in database
    try {
      const Song = mongoose.model('Song', new mongoose.Schema({}, { strict: false }), 'songs');
      const song = await Song.findOne({ videoId: TEST_VIDEO_ID });
      
      if (song && song.status === 'ready') {
        console.log('\n\n✅ Song successfully cached in database!\n');
        return song;
      }
      
      if (song && song.status === 'failed') {
        console.log('\n\n❌ Song caching failed!\n');
        console.log('Error:', song.errorMessage || 'Unknown error\n');
        return null;
      }
    } catch (err) {
      // Continue waiting
    }
  }
  
  console.log('\n\n❌ Timeout waiting for background processing\n');
  return null;
}

async function verifyDatabaseEntry(song) {
  console.log('🔍 Step 4: Verifying database entry...\n');
  
  if (!song) {
    console.log('❌ No song found in database\n');
    return false;
  }
  
  console.log('📊 Song Details:');
  console.log(`   Title: ${song.title || 'N/A'}`);
  console.log(`   Artist: ${song.artist || 'N/A'}`);
  console.log(`   Video ID: ${song.videoId}`);
  console.log(`   Status: ${song.status}`);
  console.log(`   Telegram File ID: ${song.telegramFileId || 'N/A'}`);
  console.log(`   Telegram Message ID: ${song.telegramMessageId || 'N/A'}`);
  console.log(`   File Size: ${song.fileSize ? (song.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
  console.log(`   MIME Type: ${song.mimeType || 'N/A'}`);
  console.log(`   Created: ${song.createdAt}`);
  console.log(`   Last Processed: ${song.lastProcessedAt || 'N/A'}\n`);
  
  // Verify required fields
  const checks = {
    'Has title': !!song.title,
    'Has artist': !!song.artist,
    'Status is ready': song.status === 'ready',
    'Has Telegram file ID': !!song.telegramFileId,
    'Has Telegram message ID': !!song.telegramMessageId,
    'Has file size': !!song.fileSize && song.fileSize > 0,
    'Has MIME type': !!song.mimeType,
  };
  
  let allPassed = true;
  console.log('✅ Validation Checks:\n');
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
    if (!passed) allPassed = false;
  }
  
  console.log('');
  
  if (allPassed) {
    console.log('🎉 ALL CHECKS PASSED! Background caching is working correctly!\n');
  } else {
    console.log('⚠️  Some checks failed. Background caching may have issues.\n');
  }
  
  return allPassed;
}

async function cleanup() {
  console.log('🧹 Step 5: Cleaning up test data...\n');
  
  try {
    const Song = mongoose.model('Song', new mongoose.Schema({}, { strict: false }), 'songs');
    
    // Delete the test song
    const result = await Song.deleteOne({ videoId: TEST_VIDEO_ID });
    
    if (result.deletedCount > 0) {
      console.log('✅ Test song deleted from database\n');
    } else {
      console.log('⚠️  No test song found to delete\n');
    }
  } catch (err) {
    console.log('⚠️  Cleanup error:', err.message, '\n');
  }
}

async function runTest() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   AUTOMATED TEST: Background Caching Flow                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  let dbConnected = false;
  
  try {
    // Connect to MongoDB
    console.log('💾 Connecting to MongoDB...\n');
    await mongoose.connect(MONGO_URI);
    dbConnected = true;
    console.log('✅ Connected to MongoDB\n');
    
    // Run test steps
    await registerOrLogin();
    await triggerStreamRequest();
    const song = await waitForBackgroundProcessing();
    const passed = await verifyDatabaseEntry(song);
    
    // Cleanup
    await cleanup();
    
    // Final result
    console.log('╔═══════════════════════════════════════════════════════════╗');
    if (passed) {
      console.log('║                  ✅ TEST PASSED ✅                        ║');
    } else {
      console.log('║                  ❌ TEST FAILED ❌                        ║');
    }
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    
    process.exit(passed ? 0 : 1);
    
  } catch (err) {
    console.error('\n❌ Test failed with exception:');
    console.error('   ', err.message);
    console.error('');
    
    if (err.stack) {
      console.error(err.stack);
      console.error('');
    }
    
    // Cleanup on error
    if (dbConnected) {
      await cleanup().catch(() => {});
    }
    
    process.exit(1);
  } finally {
    if (dbConnected) {
      await mongoose.disconnect();
    }
  }
}

// Run the test
runTest();
