import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BloodRequest from '../models/BloodRequest.js';
import User from '../models/User.js'; // Needed to register the model
import { calculatePriority } from '../utils/priorityScorer.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('MONGO_URI env variable is not defined!');
  process.exit(1);
}

async function backfill() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully.');

    const requests = await BloodRequest.find();
    console.log(`Found ${requests.length} requests to process.`);

    let updatedCount = 0;
    for (const req of requests) {
      // Find requester to see if role is hospital
      let requesterRole = 'user';
      if (req.requesterId) {
        const requester = await User.findById(req.requesterId);
        if (requester) {
          requesterRole = requester.role;
        }
      }

      const priority = calculatePriority({
        emergency: req.emergency,
        bloodGroup: req.bloodGroup,
        unitsRequired: req.unitsRequired,
        emergencyLevel: req.emergencyLevel,
        hospitalName: req.hospitalName,
        hospitalInvolved: requesterRole === 'hospital' || !!req.hospitalName,
        requesterRole,
      });

      req.priorityScore = priority.score;
      req.priorityLevel = priority.level;
      await req.save();
      updatedCount++;
    }

    console.log(`Successfully backfilled priority score/level for ${updatedCount} requests.`);
  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

backfill();
