import express from 'express';
const router = express.Router();
import { protect } from '../../middlewares/auth.js';

import { login, register } from '../controllers/authController.js';

router.post('/login', login);
router.post('/register', register);



// If you want to keep checking the current user session/token when the frontend loads, then define this in your backend (Express):

// if you dont: without this, it not ideal for long-term, because without it, users will get logged out on page refresh.

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    try {
      // req.user is already populated by protect middleware
      const user = req.user.toObject(); // convert from mongoose document
      delete user.password; // exclude password field
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });



export default router;