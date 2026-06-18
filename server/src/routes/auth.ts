import { Router } from 'express';
import { sendOTP, verifyOTP, onboard, refreshToken, logout } from '../controllers/auth';

const router = Router();

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/onboard', onboard);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

export default router;
