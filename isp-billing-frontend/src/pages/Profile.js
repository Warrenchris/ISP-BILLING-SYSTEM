import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  Zoom,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Lock as LockIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../contexts/ApiContext';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { authApi } = useApi();
  const theme = useTheme();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    nationalId: user?.nationalId || '',
    county: user?.county || '',
    city: user?.city || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Modern Glass Card Component
  const GlassCard = ({ children, sx = {}, ...props }) => (
    <Card
      sx={{
        background: 'rgba(26, 26, 46, 0.6)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'visible',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );

  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);

      const response = await authApi.updateProfile(profileData);
      updateUser(response.data.user);

      showAlert('Profile updated successfully', 'success');
      setEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
      showAlert(
        error.response?.data?.message || 'Failed to update profile',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showAlert('New passwords do not match', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showAlert('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setLoading(true);

      await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      showAlert('Password changed successfully', 'success');
      setPasswordDialog(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Password change error:', error);
      showAlert(
        error.response?.data?.message || 'Failed to change password',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePasswordInputChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getInitials = () => {
    const firstName = user?.firstName || '';
    const lastName = user?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={4}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 1,
          }}
        >
          My Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your personal information and account security
        </Typography>
      </Box>

      {alert.show && (
        <Zoom in={alert.show}>
          <Alert
            severity={alert.severity}
            sx={{
              mb: 3,
              borderRadius: 2,
              backdropFilter: 'blur(10px)',
              background: alert.severity === 'error'
                ? 'rgba(255, 107, 107, 0.1)'
                : 'rgba(0, 212, 170, 0.1)',
              border: `1px solid ${alert.severity === 'error' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(0, 212, 170, 0.2)'}`,
              color: alert.severity === 'error' ? '#ff6b6b' : '#00d4aa',
              '& .MuiAlert-icon': {
                color: alert.severity === 'error' ? '#ff6b6b' : '#00d4aa',
              }
            }}
          >
            {alert.message}
          </Alert>
        </Zoom>
      )}

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <GlassCard>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box display="flex" alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: 'rgba(102, 126, 234, 0.1)',
                      color: '#667eea',
                      mr: 2
                    }}
                  >
                    <PersonIcon />
                  </Avatar>
                  <Typography variant="h6" fontWeight={600}>
                    Personal Information
                  </Typography>
                </Box>
                <Button
                  variant={editing ? "outlined" : "contained"}
                  startIcon={editing ? <SaveIcon /> : <EditIcon />}
                  onClick={editing ? handleProfileUpdate : () => setEditing(true)}
                  disabled={loading}
                  sx={{
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 500,
                    ...(editing ? {} : {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    })
                  }}
                >
                  {editing ? (loading ? <CircularProgress size={20} /> : 'Save Changes') : 'Edit Profile'}
                </Button>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={profileData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={profileData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!editing}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={profileData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
                    }}
                    helperText="Format: +254712345678 or 0712345678"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="National ID"
                    value={profileData.nationalId}
                    onChange={(e) => handleInputChange('nationalId', e.target.value)}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: <BadgeIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="County"
                    value={profileData.county}
                    onChange={(e) => handleInputChange('county', e.target.value)}
                    disabled={!editing}
                    InputProps={{
                      startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="City"
                    value={profileData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    disabled={!editing}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                      }
                    }}
                  />
                </Grid>
              </Grid>

              {editing && (
                <Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
                  <Button
                    variant="text"
                    color="inherit"
                    onClick={() => {
                      setEditing(false);
                      setProfileData({
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        email: user?.email || '',
                        phoneNumber: user?.phoneNumber || '',
                        nationalId: user?.nationalId || '',
                        county: user?.county || '',
                        city: user?.city || '',
                      });
                    }}
                    disabled={loading}
                    sx={{ borderRadius: '8px' }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Profile Summary */}
        <Grid item xs={12} md={4}>
          <GlassCard sx={{ mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                <Box
                  sx={{
                    position: 'relative',
                    mb: 2
                  }}
                >
                  <Avatar
                    sx={{
                      width: 100,
                      height: 100,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      fontSize: '2.5rem',
                      boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
                      border: '4px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {getInitials()}
                  </Avatar>
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: '#00d4aa',
                      border: '4px solid #1a1a2e',
                    }}
                  />
                </Box>
                <Typography variant="h5" fontWeight={700}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>

              <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

              <Box mb={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom display="block">
                  ACCOUNT STATUS
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '8px',
                    bgcolor: 'rgba(0, 212, 170, 0.1)',
                    color: '#00d4aa',
                    border: '1px solid rgba(0, 212, 170, 0.2)'
                  }}
                >
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00d4aa', mr: 1 }} />
                  <Typography variant="body2" fontWeight={600}>
                    Active
                  </Typography>
                </Box>
              </Box>

              <Box mb={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom display="block">
                  MEMBER SINCE
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </Typography>
              </Box>

              <Box mb={4}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom display="block">
                  ROLE
                </Typography>
                <Typography variant="body1" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                  {user?.role || 'Customer'}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={() => setPasswordDialog(true)}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: '#667eea',
                    background: 'rgba(102, 126, 234, 0.1)',
                  }
                }}
              >
                Change Password
              </Button>
            </CardContent>
          </GlassCard>

          {/* Account Security */}
          <GlassCard>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Account Security
              </Typography>

              <Box mb={3}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Password Strength
                  </Typography>
                  <Typography variant="caption" color="#00d4aa" fontWeight={600}>
                    Strong
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: '100%',
                    height: 6,
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 3,
                  }}
                >
                  <Box
                    sx={{
                      width: '85%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #00d4aa 0%, #00b894 100%)',
                      borderRadius: 3,
                    }}
                  />
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary" display="block">
                Last password change: {user?.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleDateString() : 'Never'}
              </Typography>
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialog}
        onClose={() => setPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            padding: '16px',
            background: 'rgba(26, 26, 46, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: 'rgba(102, 126, 234, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#667eea'
            }}
          >
            <LockIcon fontSize="large" />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            Change Password
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={4}>
            Ensure your account stays secure by using a strong password.
          </Typography>

          <TextField
            fullWidth
            type="password"
            label="Current Password"
            value={passwordData.currentPassword}
            onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': { borderRadius: '12px' }
            }}
          />

          <TextField
            fullWidth
            type="password"
            label="New Password"
            value={passwordData.newPassword}
            onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': { borderRadius: '12px' }
            }}
          />

          <TextField
            fullWidth
            type="password"
            label="Confirm New Password"
            value={passwordData.confirmPassword}
            onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
            error={passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== ''}
            helperText={
              passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== ''
                ? 'Passwords do not match'
                : ''
            }
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '12px' }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPasswordDialog(false)}
            disabled={loading}
            sx={{
              color: 'text.secondary',
              borderRadius: '8px',
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePasswordChange}
            variant="contained"
            disabled={
              loading ||
              !passwordData.currentPassword ||
              !passwordData.newPassword ||
              passwordData.newPassword !== passwordData.confirmPassword
            }
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px',
              px: 4,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;

