import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('MONGO_URI env variable is not defined!');
  process.exit(1);
}

const CITY_COORDS = {
  hyderabad: { latitude: 17.3850, longitude: 78.4867 },
  vijayawada: { latitude: 16.5062, longitude: 80.6480 },
  visakhapatnam: { latitude: 17.6868, longitude: 83.2185 },
  guntur: { latitude: 16.3067, longitude: 80.4365 },
  nellore: { latitude: 14.4426, longitude: 79.9865 },
  tirupati: { latitude: 13.6288, longitude: 79.4192 },
};

const getRandomOffset = () => {
  // Returns a random offset between -0.05 and 0.05
  return (Math.random() - 0.5) * 0.1;
};

async function seed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully.');

    // 1. Backfill Users (Donors and Hospitals)
    const users = await User.find({ role: { $in: ['donor', 'hospital'] } });
    console.log(`Found ${users.length} donor/hospital users to update location coordinates.`);

    let usersUpdated = 0;
    for (const u of users) {
      const cityKey = (u.city || 'hyderabad').toLowerCase().trim();
      const baseCoords = CITY_COORDS[cityKey] || CITY_COORDS.hyderabad;

      // Update location coords with small random offsets so they scatter nicely on the map
      u.location = {
        latitude: baseCoords.latitude + getRandomOffset(),
        longitude: baseCoords.longitude + getRandomOffset(),
      };

      // Ensure some hospitals are verified
      if (u.role === 'hospital') {
        u.isHospitalVerified = true;
      }

      await u.save({ validateBeforeSave: false });
      usersUpdated++;
    }
    console.log(`Updated location coordinates for ${usersUpdated} users.`);

    // 2. Backfill BloodRequests
    const requests = await BloodRequest.find();
    console.log(`Found ${requests.length} blood requests to update location coordinates.`);

    let requestsUpdated = 0;
    for (const r of requests) {
      const cityKey = (r.city || 'hyderabad').toLowerCase().trim();
      const baseCoords = CITY_COORDS[cityKey] || CITY_COORDS.hyderabad;

      r.locationCoords = {
        latitude: baseCoords.latitude + getRandomOffset(),
        longitude: baseCoords.longitude + getRandomOffset(),
      };
      
      // Update string location just in case it is blank
      if (!r.location) {
        r.location = `${r.city || 'Hyderabad'} General Area`;
      }

      await r.save();
      requestsUpdated++;
    }
    console.log(`Updated locationCoords for ${requestsUpdated} requests.`);
    console.log('Map location seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding map locations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

seed();
