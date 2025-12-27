import React, { useState, useEffect } from 'react';
import {
  Avatar,
  Button,
  CssBaseline,
  TextField,
  Paper,
  Box,
  Grid,
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
import { useNavigate } from 'react-router-dom';

const defaultTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
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
        sx={{ mt: 3, mb: 2 }}
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
  
  const { login, register, error: authError, clearError, loading } = useAuth();
  const navigate = useNavigate();

  

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
      let result;
      
      if (isRegister) {
        result = await register(formData.email, formData.username, formData.password);
      } else {
        result = await login(formData.username, formData.password);
      }

      if (result.success) {
        navigate('/home');
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Grid container component="main" sx={{ height: '100vh' }}>
        <CssBaseline />
        <Grid
          item
          xs={false}
          sm={4}
          md={7}
          sx={{
            backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            textAlign: 'center',
            p: 3,
          }}
        >
          <Box>
            <Typography variant="h2" component="h1" gutterBottom>
              Welcome to LiveLink
            </Typography>
            <Typography variant="h5">
              Connect, collaborate, and create amazing experiences together
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
          <Box
            sx={{
              my: 8,
              mx: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h4">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {isRegister ? 'Join our community today' : 'Sign in to continue'}
            </Typography>
            
            <Box sx={{ mt: 3, mb: 2 }}>
              <Button
                variant={!isRegister ? 'contained' : 'outlined'}
                onClick={() => setIsRegister(false)}
                sx={{ mr: 1 }}
              >
                Sign In
              </Button>
              <Button
                variant={isRegister ? 'contained' : 'outlined'}
                onClick={() => setIsRegister(true)}
              >
                Sign Up
              </Button>
            </Box>

            <Fade in={!!authError}>
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
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
          </Box>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
}
