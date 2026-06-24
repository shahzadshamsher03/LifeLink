import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { emitDonorAvailabilityUpdated } from '../sockets/socketManager.js';

export const updateAvailability = asyncHandler(async (req, res) => {
  if (req.user.role !== 'donor') {
    throw new AppError('Only donors can update availability', 403);
  }

  const { availability } = req.body;

  if (typeof availability !== 'boolean') {
    throw new AppError('Availability must be a boolean value', 400);
  }

  req.user.availability = availability;
  await req.user.save({ validateBeforeSave: true });

  emitDonorAvailabilityUpdated(req.user._id.toString(), availability);

  res.status(200).json({
    success: true,
    message: availability ? 'You are now available to donate' : 'You are marked as unavailable',
    user: req.user.toPublicJSON(),
  });
});
