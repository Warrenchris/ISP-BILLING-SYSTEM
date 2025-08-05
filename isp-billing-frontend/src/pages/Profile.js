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
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Lock as LockIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../contexts/ApiContext';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { authApi } = useApi();
  
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
    <Box>
      <Typography variant="h4" gutterBottom>
        My Profile
      </Typography>

      {alert.show && (
        <Alert severity={alert.severity} sx={{ mb: 3 }}>
          {alert.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Personal Information
                </Typography>
                <Button
                  variant={editing ? "outlined" : "contained"}
                  startIcon={editing ? <SaveIcon /> : <EditIcon />}
                  onClick={editing ? handleProfileUpdate : () => setEditing(true)}
                  disabled={loading}
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
                      startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
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
                      startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
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
                      startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    helperText="Format: +254712345678 or 0712345678"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="National ID"
                    value={profileData.nationalId}
                    onChange={(e) => handleInputChange('nationalId', e.target.value)}
                    disabled={!editing}
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
                      startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />,
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
                  />
                </Grid>
              </Grid>

              {editing && (
                <Box mt={3} display="flex" gap={2}>
                  <Button
                    variant="outlined"
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
                  >
                    Cancel
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Summary */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'primary.main',
                    fontSize: '2rem',
                    mb: 2,
                  }}
                >
                  {getInitials()}
                </Avatar>
                <Typography variant="h6">
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Account Status
                </Typography>
                <Typography variant="body1" color="success.main" fontWeight="medium">
                  Active
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Member Since
                </Typography>
                <Typography variant="body1">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </Typography>
              </Box>

              <Box mb={3}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Role
                </Typography>
                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                  {user?.role || 'Customer'}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={() => setPasswordDialog(true)}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* Account Security */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Security
              </Typography>
              
              <Box mb={2}>
                <Typography variant="body2" gutterBottom>
                  Password Strength
                </Typography>
                <Box display="flex" alignItems="center">
                  <Box
                    sx={{
                      width: '100%',
                      height: 8,
                      bgcolor: 'grey.200',
                      borderRadius: 4,
                      mr: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: '75%',
                        height: '100%',
                        bgcolor: 'success.main',
                        borderRadius: 4,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="success.main">
                    Strong
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Last password change: {user?.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleDateString() : 'Never'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialog}
        onClose={() => setPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Change Password
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Choose a strong password with at least 6 characters.
          </Alert>
          
          <TextField
            fullWidth
            type="password"
            label="Current Password"
            value={passwordData.currentPassword}
            onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            type="password"
            label="New Password"
            value={passwordData.newPassword}
            onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
            sx={{ mb: 2 }}
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
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPasswordDialog(false)}
            disabled={loading}
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
          >
            {loading ? <CircularProgress size={20} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;

