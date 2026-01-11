import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  Divider,
  Grow,
  Zoom,
  Slide,
  Fade,
  keyframes,
  IconButton,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  alpha,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Brightness4,
  Brightness7,
  Person,
  Phone,
  Router,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Google, Facebook } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

// Import the modern logo
import ispLogo from '../pics/isp_logo.png';

// Custom keyframe animations
const floatAnimation = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-10px) rotate(1deg); }
  66% { transform: translateY(-5px) rotate(-1deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

// const shimmerAnimation = keyframes`
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// `;

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Modern theme toggle component
const ToggleThemeButton = ({ darkMode, toggleDarkMode }) => {
  return (
    <IconButton
      onClick={toggleDarkMode}
      sx={{
        position: 'absolute',
        top: 24,
        right: 24,
        zIndex: 10,
        background: 'rgba(26, 26, 46, 0.4)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white',
        width: 48,
        height: 48,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          background: 'rgba(255, 255, 255, 0.1)',
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
        },
      }}
    >
      {darkMode ? <Brightness7 /> : <Brightness4 />}
    </IconButton>
  );
};

const Login = ({ darkMode, toggleDarkMode }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [accessRequestData, setAccessRequestData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    routerIp: '',
  });
  const [loading, setLoading] = useState(false);
  // const [error, setError] = useState(''); // Removed in favor of global notifications
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accessRequestOpen, setAccessRequestOpen] = useState(false);
  const [accessRequestLoading, setAccessRequestLoading] = useState(false);
  const [accessRequestSuccess, setAccessRequestSuccess] = useState(false);
  const { login } = useAuth();
  const { notifyError, notifySuccess } = useNotification();
  const navigate = useNavigate();
  const theme = useTheme();
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const { api } = useApi();

  const handleForgotPassword = async () => {
    setForgotPasswordLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotPasswordEmail });
      setForgotPasswordSuccess(true);
    } catch (error) {
      // Error handled by global ApiContext interceptor
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // setError('');
  };

  const handleAccessRequestChange = (e) => {
    setAccessRequestData({
      ...accessRequestData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // setError('');

    const result = await login(formData.email.trim(), formData.password.trim());

    if (result.success) {
      navigate('/dashboard');
    }
    // if failed, AuthContext triggers notification.

    setLoading(false);
  };

  const handleSocialLogin = (provider) => {
    console.log(`Logging in with ${provider}`);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleAccessRequestSubmit = async (e) => {
    e.preventDefault();
    setAccessRequestLoading(true);

    try {
      console.log('Submitting access request:', accessRequestData);
      await new Promise(resolve => setTimeout(resolve, 1500));

      setAccessRequestSuccess(true);
      setAccessRequestLoading(false);

      setTimeout(() => {
        setAccessRequestOpen(false);
        setAccessRequestSuccess(false);
        setAccessRequestData({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          routerIp: '',
        });
      }, 2000);
    } catch (err) {
      notifyError('Failed to submit access request. Please try again.');
      setAccessRequestLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: theme.palette.mode === 'dark'
          ? `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`
          : `linear-gradient(135deg, ${theme.palette.grey[50]} 0%, ${theme.palette.grey[200]} 100%)`,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.palette.mode === 'dark'
            ? `radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.dark, 0.2)} 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 50%),
               radial-gradient(circle at 40% 40%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%)`
            : `radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.dark, 0.1)} 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%)`,
          zIndex: 0,
          animation: `${gradientShift} 15s ease-in-out infinite`,
          backgroundSize: '200% 200%',
        },
      }}
    >
      <ToggleThemeButton darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      {/* Floating particles animation */}
      {
        [1, 2, 3, 4, 5, 6].map((i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              background: darkMode
                ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.dark, 0.1)} 100%)`
                : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.dark, 0.05)} 100%)`,
              borderRadius: '50%',
              animation: `${floatAnimation} ${12 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 1.5}s`,
              zIndex: 0,
              filter: 'blur(1px)',
              ...(i % 3 === 0 ? {
                width: '80px',
                height: '80px',
                top: `${15 + i * 8}%`,
                left: `${8 + i * 6}%`,
              } : i % 3 === 1 ? {
                width: '120px',
                height: '120px',
                bottom: `${12 + i * 6}%`,
                right: `${5 + i * 8}%`,
              } : {
                width: '60px',
                height: '60px',
                top: `${50 + i * 3}%`,
                left: `${70 + i * 2}%`,
              })
            }}
          />
        ))
      }

      {/* Left Side - Hero Section */}
      <Slide direction="right" in={mounted} timeout={1000}>
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            p: 8,
            background: darkMode
              ? 'rgba(26, 26, 46, 0.3)'
              : 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRight: `1px solid ${theme.palette.divider}`,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
          }}
        >
          <Grow in={mounted} timeout={1200}>
            <Box
              sx={{
                position: 'relative',
                zIndex: 2,
                maxWidth: '600px',
                textAlign: 'center',
                color: theme.palette.text.primary,
              }}
            >
              {/* Modern ISP Logo */}
              <Box
                component="img"
                src={ispLogo}
                alt="ISP Billing Pro Logo"
                sx={{
                  height: '200px',
                  width: 'auto',
                  mb: 4,
                  filter: darkMode
                    ? `drop-shadow(0 8px 16px ${alpha(theme.palette.primary.main, 0.3)})`
                    : `drop-shadow(0 8px 16px ${alpha(theme.palette.primary.main, 0.2)})`,
                  animation: `${floatAnimation} 8s ease-in-out infinite`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    filter: darkMode
                      ? `drop-shadow(0 12px 24px ${alpha(theme.palette.primary.main, 0.4)})`
                      : `drop-shadow(0 12px 24px ${alpha(theme.palette.primary.main, 0.3)})`,
                  },
                }}
              />

              <Typography
                variant="h3"
                sx={{
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  mb: 2,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.025em',
                }}
              >
                ISP Billing Pro
              </Typography>

              <Typography
                variant="h5"
                sx={{
                  fontSize: '1.25rem',
                  fontWeight: 400,
                  mb: 4,
                  opacity: 0.9,
                  lineHeight: 1.6,
                  color: theme.palette.text.secondary,
                }}
              >
                Next-generation billing solutions for modern internet service providers
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 3,
                  mt: 4,
                }}
              >
                {[
                  { icon: '🚀', text: 'Fast & Reliable' },
                  { icon: '🔒', text: 'Secure Platform' },
                  { icon: '📊', text: 'Advanced Analytics' },
                ].map((feature, index) => (
                  <Box
                    key={index}
                    sx={{
                      textAlign: 'center',
                      opacity: 0.8,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        opacity: 1,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Typography variant="h4" sx={{ mb: 1 }}>
                      {feature.icon}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {feature.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grow>
        </Box>
      </Slide>

      {/* Right Side - Login Form */}
      <Box
        sx={{
          flex: { xs: 1, lg: 0.6 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 3, sm: 6 },
          position: 'relative',
        }}
      >
        <Zoom in={mounted} style={{ transitionDelay: mounted ? '400ms' : '0ms' }}>
          <Box
            sx={{
              width: '100%',
              maxWidth: '480px',
              background: theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.paper, 0.6)
                : alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(25px)',
              WebkitBackdropFilter: 'blur(25px)',
              p: { xs: 4, sm: 6 },
              borderRadius: '24px',
              boxShadow: darkMode
                ? '0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 20px 60px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
              border: darkMode
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.1)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
              },
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: darkMode
                  ? '0 25px 70px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                  : '0 25px 70px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <Fade in={mounted} timeout={1000}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Avatar
                  sx={{
                    width: 72,
                    height: 72,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    margin: '0 auto 24px',
                    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                    animation: `${pulseAnimation} 4s ease-in-out infinite`,
                  }}
                >
                  <LockIcon sx={{ fontSize: '32px', color: 'white' }} />
                </Avatar>

                <Typography
                  variant="h4"
                  sx={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    mb: 1,
                    color: theme.palette.text.primary,
                    letterSpacing: '-0.025em',
                  }}
                >
                  Welcome back
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    fontSize: '1rem',
                    color: theme.palette.text.secondary,
                    lineHeight: 1.6,
                  }}
                >
                  Sign in to your ISP Billing account
                </Typography>
              </Box>
            </Fade>

            {/* Local Error Alert removed - global notification used */}

            <Fade in={mounted} timeout={1200}>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Google />}
                  onClick={() => handleSocialLogin('google')}
                  sx={{
                    py: 1.5,
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 500,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                      transition: 'left 0.5s',
                    },
                    '&:hover::before': {
                      left: '100%',
                    },
                  }}
                >
                  Google
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Facebook />}
                  onClick={() => handleSocialLogin('facebook')}
                  sx={{
                    py: 1.5,
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 500,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                      transition: 'left 0.5s',
                    },
                    '&:hover::before': {
                      left: '100%',
                    },
                  }}
                >
                  Facebook
                </Button>
              </Box>
            </Fade>

            <Fade in={mounted} timeout={1400}>
              <Divider sx={{
                my: 3,
                color: theme.palette.text.secondary,
                '&::before, &::after': {
                  borderColor: darkMode
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.1)',
                }
              }}>
                OR
              </Divider>
            </Fade>

            <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
              <Fade in={mounted} timeout={1600}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="johndoe@email.com"
                  label="Email address"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: theme.palette.text.secondary }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />
              </Fade>

              <Fade in={mounted} timeout={1800}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Enter your password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: theme.palette.text.secondary }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={togglePasswordVisibility}
                          edge="end"
                          sx={{ color: theme.palette.text.secondary }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />
              </Fade>

              <Fade in={mounted} timeout={2000}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setForgotPasswordOpen(true)}
                    sx={{
                      color: theme.palette.primary.main,
                      textDecoration: 'none',
                      fontWeight: 500,
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Forgot password?
                  </Link>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setAccessRequestOpen(true)}
                    sx={{
                      color: theme.palette.primary.main,
                      textDecoration: 'none',
                      fontWeight: 500,
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Request Access
                  </Link>
                </Box>
              </Fade>

              <Fade in={mounted} timeout={2200}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    py: 1.75,
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                      transition: 'left 0.5s',
                    },
                    '&:hover::before': {
                      left: '100%',
                    },
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                      boxShadow: '0 12px 35px rgba(102, 126, 234, 0.4)',
                      transform: 'translateY(-2px)',
                    },
                    '&:disabled': {
                      background: 'rgba(102, 126, 234, 0.3)',
                      color: 'rgba(255, 255, 255, 0.5)',
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </Fade>
            </Box>
          </Box>
        </Zoom>
      </Box>

      {/* Forgot Password Dialog */}
      <Dialog
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: darkMode
              ? 'rgba(26, 26, 46, 0.9)'
              : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: darkMode
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h5" fontWeight={600}>
            Reset Password
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {forgotPasswordSuccess ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Email Sent!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Check your email for password reset instructions.
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Enter your email address and we'll send you a link to reset your password.
              </Typography>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                sx={{ mb: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setForgotPasswordOpen(false)}>
            {forgotPasswordSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!forgotPasswordSuccess && (
            <Button
              variant="contained"
              onClick={handleForgotPassword}
              disabled={forgotPasswordLoading || !forgotPasswordEmail}
            >
              {forgotPasswordLoading ? <CircularProgress size={20} /> : 'Send Reset Link'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Access Request Dialog */}
      <Dialog
        open={accessRequestOpen}
        onClose={() => setAccessRequestOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: darkMode
              ? 'rgba(26, 26, 46, 0.9)'
              : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: darkMode
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h5" fontWeight={600}>
            Request Access
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {accessRequestSuccess ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom fontWeight={600}>
                Request Submitted!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Your access request has been submitted successfully. We'll review it and get back to you soon.
              </Typography>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleAccessRequestSubmit}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Fill out this form to request access to the ISP Billing system.
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <TextField
                  required
                  label="First Name"
                  name="firstName"
                  value={accessRequestData.firstName}
                  onChange={handleAccessRequestChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  required
                  label="Last Name"
                  name="lastName"
                  value={accessRequestData.lastName}
                  onChange={handleAccessRequestChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <TextField
                required
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={accessRequestData.email}
                onChange={handleAccessRequestChange}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                required
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={accessRequestData.phoneNumber}
                onChange={handleAccessRequestChange}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Router IP Address (Optional)"
                name="routerIp"
                value={accessRequestData.routerIp}
                onChange={handleAccessRequestChange}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Router sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setAccessRequestOpen(false)}
            disabled={accessRequestLoading}
          >
            {accessRequestSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!accessRequestSuccess && (
            <Button
              type="submit"
              variant="contained"
              onClick={handleAccessRequestSubmit}
              disabled={accessRequestLoading}
            >
              {accessRequestLoading ? <CircularProgress size={20} /> : 'Submit Request'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default Login;

