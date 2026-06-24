import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { emitAdminUpdate, emitDonorLocationUpdated, emitHospitalLocationUpdated } from '../sockets/socketManager.js';

// PUT /api/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phoneNumber, city, address, bloodGroup, hospitalName, location } = req.body;

  if (email && email.toLowerCase() !== req.user.email.toLowerCase()) {
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      throw new AppError('Email already in use', 400);
    }
  }

  if (phoneNumber && phoneNumber !== req.user.phoneNumber) {
    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
      throw new AppError('Phone number already in use', 400);
    }
  }

  // Update allowed fields
  if (name !== undefined) req.user.name = name;
  if (email !== undefined) req.user.email = email.toLowerCase();
  if (phoneNumber !== undefined) req.user.phoneNumber = phoneNumber;
  if (city !== undefined) req.user.city = city;
  if (address !== undefined) req.user.address = address;

  if (location !== undefined) {
    if (location === null) {
      req.user.location = undefined;
    } else {
      req.user.location = {
        latitude: location.latitude !== undefined ? Number(location.latitude) : undefined,
        longitude: location.longitude !== undefined ? Number(location.longitude) : undefined,
      };
    }
  }

  if (req.user.role === 'donor') {
    if (bloodGroup !== undefined) req.user.bloodGroup = bloodGroup;
  }

  if (req.user.role === 'hospital') {
    if (hospitalName !== undefined) req.user.hospitalName = hospitalName;
  }

  const updatedUser = await req.user.save();

  // Notify socket clients of update
  emitAdminUpdate({
    action: 'user_updated',
    targetUserId: updatedUser._id.toString(),
    user: updatedUser.toPublicJSON(),
    createdAt: new Date().toISOString(),
  });

  if (location !== undefined && updatedUser.location?.latitude && updatedUser.location?.longitude) {
    if (updatedUser.role === 'donor') {
      emitDonorLocationUpdated(updatedUser._id.toString(), updatedUser.location);
    } else if (updatedUser.role === 'hospital') {
      emitHospitalLocationUpdated(updatedUser._id.toString(), updatedUser.location);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user: updatedUser.toPublicJSON(),
  });
});

// PATCH /api/profile/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const user = req.user;

  // 1. Validate fields
  if (!newPassword) {
    throw new AppError('Please provide the new password', 400);
  }

  // 2. Fetch user record with password support
  const userWithPassword = await User.findById(user._id).select('+password');

  // 3. Validate password complexity rules
  const minLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  if (!minLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    throw new AppError('Password does not meet security requirements.', 400);
  }

  // 4. Update password and clear OTP states
  userWithPassword.password = newPassword;
  userWithPassword.passwordChangeOtp = undefined;
  userWithPassword.passwordChangeOtpExpire = undefined;
  userWithPassword.passwordChangeOtpVerified = false;

  await userWithPassword.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully.',
  });
});

// POST /api/profile/deactivate
export const deactivateAccount = asyncHandler(async (req, res) => {
  const user = req.user;

  // Deactivate account
  user.isDeactivated = true;
  await user.save({ validateBeforeSave: false });

  emitAdminUpdate({
    action: 'user_deactivated',
    targetUserId: user._id.toString(),
    user: user.toPublicJSON(),
    createdAt: new Date().toISOString(),
  });

  res.status(200).json({
    success: true,
    message: 'Your account has been deactivated successfully.',
  });
});

// DELETE /api/profile
export const deleteAccount = asyncHandler(async (req, res) => {
  const user = req.user;
  const snapshot = user.toPublicJSON();

  await User.deleteOne({ _id: user._id });

  emitAdminUpdate({
    action: 'user_deleted',
    targetUserId: user._id.toString(),
    user: snapshot,
    createdAt: new Date().toISOString(),
  });

  res.status(200).json({
    success: true,
    message: 'Your account has been deleted successfully.',
  });
});
