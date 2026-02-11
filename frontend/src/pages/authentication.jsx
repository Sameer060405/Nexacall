import React, { useState } from 'react';
import {
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Fade,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';

const theme = createTheme({
  palette: {
    primary: { main: '#0B5CFF' },
    error: { main: '#dc2626' },
    text: { primary: '#1a1a1a', secondary: '#5e6c84' },
    background: { default: '#ffffff', paper: '#ffffff' },
    divider: '#e2e8f0',
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    h4: { fontWeight: 600, letterSpacing: '-0.02em', fontSize: '1.5rem' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em', fontSize: '1rem' },
    body2: { color: '#5e6c84', fontSize: '0.875rem' },
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
            backgroundColor: '#fafbfc',
            fontSize: '0.9375rem',
            '& fieldset': { borderColor: '#dfe1e6' },
            '&:hover fieldset': { borderColor: '#0B5CFF', borderWidth: 1 },
            '&.Mui-focused fieldset': { borderColor: '#0B5CFF', borderWidth: 2 },
          },
          '& .MuiInputLabel-root': { fontSize: '0.875rem' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.9375rem' },
      },
    },
  },
});

const AuthForm = ({ isRegister, onSubmit, loading, formData, setFormData, errors }) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleMouseDownPassword = (event) => event.preventDefault();

  return (
    <Box component="form" noValidate onSubmit={onSubmit} sx={{ mt: 1 }}>
      {isRegister && (
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={!!errors.email}
          helperText={errors.email}
          disabled={loading}
        />
      )}

      <TextField
        margin="normal"
        required
        fullWidth
        id="username"
        label="Username"
        name="username"
        autoComplete={isRegister ? "username" : "username"}
        value={formData.username}
        onChange={handleChange}
        error={!!errors.username}
        helperText={errors.username}
        disabled={loading}
      />

      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        id="password"
        autoComplete={isRegister ? "new-password" : "current-password"}
        value={formData.password}
        onChange={handleChange}
        error={!!errors.password}
        helperText={errors.password}
        disabled={loading}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleClickShowPassword}
                onMouseDown={handleMouseDownPassword}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {isRegister && (
        <TextField
          margin="normal"
          required
          fullWidth
          name="confirmPassword"
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          id="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword}
          disabled={loading}
        />
      )}

      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }}
        disabled={loading}
      >
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          isRegister ? 'Create Account' : 'Sign In'
        )}
      </Button>
    </Box>
  );
};

export default function Authentication() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const { login, register, error: authError, loading } = useAuth();

  const validateForm = () => {
    const newErrors = {};

    if (isRegister) {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (isRegister) {
      const passwordErrors = [];
      if (!/[A-Z]/.test(formData.password)) passwordErrors.push('uppercase letter');
      if (!/[a-z]/.test(formData.password)) passwordErrors.push('lowercase letter');
      if (!/[0-9]/.test(formData.password)) passwordErrors.push('number');
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) passwordErrors.push('special character');

      if (passwordErrors.length > 0) {
        newErrors.password = `Password must contain at least one ${passwordErrors.join(', ')}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (isRegister) {
        await register(formData.email, formData.username, formData.password);
      } else {
        await login(formData.username, formData.password);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="min-h-screen flex flex-col md:flex-row">
        {/* Left: Brand panel (Zoom/Skype style) */}
        <div className="w-full md:w-[42%] min-h-[180px] md:min-h-screen bg-gradient-to-b from-[#0B5CFF] to-[#0047AB] flex flex-col justify-between p-8 md:p-12">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
                <LockOutlinedIcon sx={{ color: '#fff', fontSize: 22 }} />
              </div>
              <span className="text-white font-semibold text-xl tracking-tight">NexaCall</span>
            </div>
          </div>
          <div className="mt-auto hidden md:block">
            <h2 className="text-white font-semibold text-2xl md:text-3xl tracking-tight leading-tight max-w-[280px]">
              Video meetings and collaboration for teams
            </h2>
            <p className="text-white/80 text-sm mt-3 max-w-[260px]">
              Sign in to join or host meetings, and stay connected.
            </p>
          </div>
        </div>

        {/* Right: Form panel */}
        <div className="flex-1 flex flex-col md:justify-center bg-white py-10 md:py-12 px-6 md:px-16 lg:px-24">
          <div className="w-full max-w-[400px] mx-auto">
            <Typography component="h1" variant="h4" color="text.primary" sx={{ mb: 0.5 }}>
              {isRegister ? 'Create your account' : 'Sign in to your account'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              {isRegister
                ? 'Enter your details below to get started with Nexa Call.'
                : 'Use your Nexa Call username and password to continue.'}
            </Typography>

            {/* Tabs: Sign In | Sign Up */}
            <Box
              sx={{
                display: 'flex',
                borderBottom: '2px solid',
                borderColor: 'divider',
                mb: 3,
                '& .MuiButton-root': { minWidth: 0, px: 0, mr: 3, borderRadius: 0, pb: 1.5, pt: 0 },
              }}
            >
              <Button
                variant="text"
                onClick={() => setIsRegister(false)}
                sx={{
                  color: !isRegister ? 'primary.main' : 'text.secondary',
                  fontWeight: 600,
                  borderBottom: !isRegister ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  marginBottom: '-2px',
                }}
              >
                Sign In
              </Button>
              <Button
                variant="text"
                onClick={() => setIsRegister(true)}
                sx={{
                  color: isRegister ? 'primary.main' : 'text.secondary',
                  fontWeight: 600,
                  borderBottom: isRegister ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  marginBottom: '-2px',
                }}
              >
                Sign Up
              </Button>
            </Box>

            <Fade in={!!authError}>
              <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: 1 }} variant="outlined">
                {authError}
              </Alert>
            </Fade>

            <AuthForm
              isRegister={isRegister}
              onSubmit={handleSubmit}
              loading={loading}
              formData={formData}
              setFormData={setFormData}
              errors={errors}
            />

            <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </Typography>
              <Box component="span" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography component="a" href="#" variant="caption" color="primary.main" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Privacy
                </Typography>
                <Typography component="a" href="#" variant="caption" color="primary.main" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Terms
                </Typography>
                <Typography component="a" href="#" variant="caption" color="primary.main" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Help
                </Typography>
              </Box>
            </Box>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
