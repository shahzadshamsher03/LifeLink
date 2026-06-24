import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import donorsRoutes from './routes/donorsRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import broadcastRoutes from './routes/broadcastRoutes.js';
import hospitalDonorRoutes from './routes/hospitalDonorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import mapRoutes from './routes/mapRoutes.js';
import { protect } from './middleware/authMiddleware.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { initSocket } from './sockets/socketManager.js';

const requiredEnv = ['PORT', 'MONGO_URI', 'JWT_SECRET', 'CLIENT_URL'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

connectDB();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', protect, profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/donors', donorsRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/hospital-donors', hospitalDonorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/map', protect, mapRoutes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;
const httpServer = createServer(app);

initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`LifeLink server running on port ${PORT}`);
});
