import User, { BLOOD_GROUPS } from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import asyncHandler from '../utils/asyncHandler.js';

const donorListSelect = 'name email phoneNumber bloodGroup city availability role location';

export const searchDonors = asyncHandler(async (req, res) => {
  const { bloodGroup, city, availability, search } = req.query;

  const filter = { role: 'donor' };

  if (bloodGroup && BLOOD_GROUPS.includes(bloodGroup)) {
    filter.bloodGroup = bloodGroup;
  }

  if (city?.trim()) {
    filter.city = { $regex: new RegExp(city.trim(), 'i') };
  }

  if (availability === 'true' || availability === 'false') {
    filter.availability = availability === 'true';
  }

  if (search?.trim()) {
    const term = search.trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { city: { $regex: term, $options: 'i' } },
      { bloodGroup: { $regex: term, $options: 'i' } },
    ];
  }

  const donors = await User.find(filter).select(donorListSelect).sort({ availability: -1, name: 1 });

  const donorIds = donors.map((d) => d._id);
  const pendingRequests = await BloodRequest.find({
    requesterId: req.user._id,
    donorId: { $in: donorIds },
    status: 'pending',
  }).select('donorId');

  const pendingDonorIds = new Set(pendingRequests.map((r) => r.donorId.toString()));

  const results = donors.map((donor) => {
    const publicDonor = donor.toPublicJSON();
    const isSelf = donor._id.toString() === req.user._id.toString();
    const hasPendingRequest = pendingDonorIds.has(donor._id.toString());

    return {
      ...publicDonor,
      phoneNumber: donor.availability ? publicDonor.phoneNumber : undefined,
      hasPendingRequest,
      canRequest: donor.availability && !hasPendingRequest && !isSelf,
    };
  });

  res.status(200).json({
    success: true,
    count: results.length,
    donors: results,
  });
});

export const getAllDonors = asyncHandler(async (req, res) => {
  const donors = await User.find({ role: 'donor' })
    .select(donorListSelect)
    .sort({ availability: -1, name: 1 });

  res.status(200).json({
    success: true,
    count: donors.length,
    donors: donors.map((d) => d.toPublicJSON()),
  });
});
