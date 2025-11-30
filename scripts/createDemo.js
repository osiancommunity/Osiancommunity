const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '..', '..', '.env') });
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/osian';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const email = 'demo.user@osian.io';
    let user = await User.findOne({ email });
    if (!user) {
      const username = '@demo' + String(Date.now()).slice(-6);
      const salt = bcrypt.genSaltSync(10);
      const hashed = bcrypt.hashSync('Passw0rd!', salt);
      user = new User({ name: 'Demo User', email, password: hashed, username, isVerified: true });
      user._skipHash = true;
      await user.save();
      console.log('Demo user created');
    } else {
      console.log('Demo user already exists');
    }
    console.log(JSON.stringify({ email, password: 'Passw0rd!', userId: user._id }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Error creating demo user:', e);
    process.exit(1);
  }
}

main();
