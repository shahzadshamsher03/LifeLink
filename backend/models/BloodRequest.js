import mongoose from 'mongoose';
import { BLOOD_GROUPS } from './User.js';

const bloodRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    requestType: {
      type: String,
      enum: ['direct', 'broadcast'],
      default: 'direct',
    },

    city: {
      type: String,
      trim: true,
    },

    emergencyLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    volunteers: [
      {
        donorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        status: {
          type: String,
          enum: ['volunteered'],
          default: 'volunteered',
        },
        volunteeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: {
        values: BLOOD_GROUPS,
        message: 'Invalid blood group',
      },
    },

    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'active', 'closed'],
      default: 'pending',
    },

    // NEW: Phase 1 completion tracking
    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
    },

    emergency: {
      type: Boolean,
      default: false,
    },

    hospitalName: {
      type: String,
      trim: true,
    },

    patientName: {
      type: String,
      trim: true,
    },

    unitsRequired: {
      type: Number,
      default: 1,
    },

    location: {
      type: String,
      trim: true,
    },

    requiredBefore: {
      type: Date,
    },

    reason: {
      type: String,
      trim: true,
    },

    allowContact: {
      type: Boolean,
      default: true,
    },

    resolvedAt: {
      type: Date,
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    priorityScore: {
      type: Number,
      default: 0,
    },

    priorityLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Low',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (unchanged)
bloodRequestSchema.index({ requesterId: 1, donorId: 1, status: 1 });
bloodRequestSchema.index({ donorId: 1, status: 1 });
bloodRequestSchema.index({ requesterId: 1, createdAt: -1 });
bloodRequestSchema.index({ requesterId: 1, emergency: 1 });
bloodRequestSchema.index({ priorityLevel: 1 });

const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);

export default BloodRequest;