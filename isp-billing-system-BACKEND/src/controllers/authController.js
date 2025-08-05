const { User } = require('../models');
const { generateToken, generateRefreshToken } = require('../utils/jwt');

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      nationalId,
      address,
      city,
      county,
      postalCode
    } = req.body;

    // Check if user already exists
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const existingUserByPhone = await User.findByPhoneNumber(phoneNumber);
    if (existingUserByPhone) {
      return res.status(409).json({
        success: false,
        message: 'User with this phone number already exists'
      });
    }

    // Check national ID if provided
    if (nationalId) {
      const existingUserByNationalId = await User.findOne({ where: { nationalId } });
      if (existingUserByNationalId) {
        return res.status(409).json({
          success: false,
          message: 'User with this national ID already exists'
        });
      }
    }

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      nationalId,
      address,
      city,
      county,
      postalCode
    });

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update last login
    await user.update({ lastLogin: new Date() });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    // Handle Sequelize unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'User with this information already exists',
        errors: error.errors.map(err => ({
          field: err.path,
          message: `${err.path} must be unique`
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update last login
    await user.update({ lastLogin: new Date() });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: typeof user.toJSON === 'function' ? user.toJSON() : user
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const {
      firstName,
      lastName,
      phoneNumber,
      nationalId,
      address,
      city,
      county,
      postalCode
    } = req.body;

    // Check if phone number is being changed and if it's already taken
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const existingUserByPhone = await User.findByPhoneNumber(phoneNumber);
      if (existingUserByPhone) {
        return res.status(409).json({
          success: false,
          message: 'Phone number is already in use'
        });
      }
    }

    // Check if national ID is being changed and if it's already taken
    if (nationalId && nationalId !== user.nationalId) {
      const existingUserByNationalId = await User.findOne({ where: { nationalId } });
      if (existingUserByNationalId) {
        return res.status(409).json({
          success: false,
          message: 'National ID is already in use'
        });
      }
    }

    // Update user
    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      phoneNumber: phoneNumber || user.phoneNumber,
      nationalId: nationalId || user.nationalId,
      address: address || user.address,
      city: city || user.city,
      county: county || user.county,
      postalCode: postalCode || user.postalCode
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Change user password
 */
const changePassword = async (req, res) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await user.update({ password: newPassword });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Logout user (client-side token invalidation)
 */
const logout = async (req, res) => {
  try {
    // In a more sophisticated implementation, you might want to:
    // 1. Add the token to a blacklist
    // 2. Store refresh tokens in database and remove them
    // For now, we'll just send a success response
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
};

