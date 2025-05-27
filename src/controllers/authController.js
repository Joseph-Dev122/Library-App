import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const login = async (req, res) => {
  try {

       // Add validation to ensure body exists
       if (!req.body) {
        return res.status(400).json({ error: "Request body is missing" });
      }


    const { username, password } = req.body;

        // 1. Find user
    const user = await User.findOne({ username });
    if (!user){
      return res.status(401).json({ error: 'Invalid username or password' });
    } 

  // 2. Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

     // 3. Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '5h' } // Token expires in 5 hours
    );

     // 4. Send response
     res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



////////=>  register student section

export const register = async (req, res) =>{
  try {
    const { firstName, lastName, username, password, role } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      firstName,
      lastName,
      username,
      password: hashedPassword,
      role: role || 'student'
    });

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};