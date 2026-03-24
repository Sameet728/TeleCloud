/**
 * drop-username-index.js
 * Drops the stale `username` unique index from the users collection.
 * Run once with: node drop-username-index.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const collection = mongoose.connection.collection('users');
  const indexes = await collection.indexes();
  console.log('Current indexes:', indexes.map(i => i.name));

  const hasUsernameIndex = indexes.some(i => i.key && i.key.username !== undefined);
  if (hasUsernameIndex) {
    await collection.dropIndex('username_1');
    console.log('✅ Dropped stale username_1 index');
  } else {
    console.log('ℹ️  No username index found — listing all indexes above for inspection');
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
