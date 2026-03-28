const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://sameetpisal_db_user:wcHoJrZSI4f0DnK1@ac-u13ggvv-shard-00-00.cwxk15w.mongodb.net:27017,ac-u13ggvv-shard-00-01.cwxk15w.mongodb.net:27017,ac-u13ggvv-shard-00-02.cwxk15w.mongodb.net:27017/?ssl=true&replicaSet=atlas-88bpdr-shard-0&authSource=admin&appName=Cluster0';

async function checkCachedSongs() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const SongSchema = new mongoose.Schema({}, { strict: false });
    const Song = mongoose.model('Song', SongSchema, 'songs');
    
    const count = await Song.countDocuments();
    console.log(`📊 Total songs in database: ${count}`);
    
    const recent = await Song.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('videoId title artist status telegramFileId createdAt');
    
    console.log('\n🎵 Recent 5 songs:\n');
    
    if (recent.length === 0) {
      console.log('   No songs found in database.\n');
    } else {
      recent.forEach((song, i) => {
        console.log(`${i + 1}. ${song.title || 'Unknown'}`);
        console.log(`   Video ID: ${song.videoId}`);
        console.log(`   Artist: ${song.artist || 'Unknown'}`);
        console.log(`   Status: ${song.status}`);
        console.log(`   Telegram ID: ${song.telegramFileId || 'N/A'}`);
        console.log(`   Created: ${song.createdAt}\n`);
      });
    }
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkCachedSongs();
