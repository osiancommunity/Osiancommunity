const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    console.log('Connected in test');
    const name = 'New';
    const email = 'newuser123@example.com';
    const salt = bcrypt.genSaltSync(10);
    const hashed = bcrypt.hashSync('Passw0rd!', salt);
    const user = new User({ name, email, password: hashed, username: '@n00000123' });
    user._skipHash = true;
    user.otp = '123456';
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    try {
      await user.save();
      console.log('Saved user', user._id.toString());
    } catch (err) {
      console.error('Error saving:', err.name, err.code, err.message, err.keyPattern, err.keyValue);
    }
    process.exit(0);
  } catch (e) {
    console.error('Unhandled test error', e);
    process.exit(1);
  }
}

main();
