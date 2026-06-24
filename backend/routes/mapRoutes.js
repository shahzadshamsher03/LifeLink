import express from 'express';
import {
  getMapDonors,
  getMapEmergencies,
  getMapHospitals,
  getMapHeatmap
} from '../controllers/mapController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All routes are protected by default (protect middleware applied in server.js)
router.get('/donors', authorize('user', 'hospital', 'admin'), getMapDonors);
router.get('/emergencies', authorize('user', 'donor', 'hospital', 'admin'), getMapEmergencies);
router.get('/hospitals', authorize('user', 'donor', 'hospital', 'admin'), getMapHospitals);
router.get('/heatmap', authorize('admin'), getMapHeatmap);

export default router;
