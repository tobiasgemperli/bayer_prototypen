import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router';
import {
  Box, Typography, TextField, Button, IconButton,
  InputAdornment, Link, Divider
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import ResiYouLogo from '../../imports/ResiYouLogo1';
import { setAuthPhase, setDemoMode } from '../data/auth-state';
import { clearPlots } from '../data/plots-data';
import { fieldSx, errorFieldSx } from '../design-system/FormField';

interface FormErrors { email?: string; password?: string }

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!email.trim()) errors.email = 'Please enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Please enter a valid email address.';
  if (!password) errors.password = 'Please enter your password.';
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters.';
  return errors;
}

export function SignUpPage() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = validate(email, password);
  const err = (field: keyof FormErrors) => submitted ? errors[field] : undefined;

  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleContinue = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setDemoMode('onboarding');
    clearPlots();
    setAuthPhase('needs-completion');
    navigate('/');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleContinue(); };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: 4 }}>
      <Box sx={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        <Box sx={{ height: 36, width: 144, mb: 4 }}>
          <ResiYouLogo />
        </Box>

        <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: '12px', border: '1px solid', borderColor: 'divider', px: 4, pt: 4, pb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>
            Know your residues before harvest
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.6, mb: 3 }}>
            Create your account to start forecasting residue levels.
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" component="label" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
              Email
            </Typography>
            <TextField fullWidth size="small" placeholder="you@company.com" inputRef={emailRef}
              value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown}
              error={!!err('email')} helperText={err('email')}
              sx={err('email') ? errorFieldSx : fieldSx} />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" component="label" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
              Password
            </Typography>
            <TextField fullWidth size="small" placeholder="Create a password"
              type={showPassword ? 'text' : 'password'}
              value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown}
              error={!!err('password')} helperText={err('password')}
              InputProps={{ endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end" tabIndex={-1}>
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ) }}
              sx={err('password') ? errorFieldSx : fieldSx} />
          </Box>

          <Button fullWidth variant="contained" color="primary" onClick={handleContinue}
            sx={{ height: 44, fontWeight: 600, textTransform: 'none', borderRadius: '8px', mb: 2 }}>
            Continue
          </Button>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6, textAlign: 'center' }}>
            By continuing, you agree to the{' '}
            <Link href="#" underline="hover" color="text.primary" sx={{ fontWeight: 600 }}>Terms of Service</Link>,{' '}
            <Link href="#" underline="hover" color="text.primary" sx={{ fontWeight: 600 }}>Privacy Policy</Link>, and{' '}
            <Link href="#" underline="hover" color="text.primary" sx={{ fontWeight: 600 }}>Cookie Policy</Link>.
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
          Already have an account?{' '}
          <Link component={RouterLink} to="/" underline="hover" color="primary.main" sx={{ fontWeight: 600 }}>
            Sign in
          </Link>
        </Typography>

        <Divider sx={{ width: '100%', my: 3 }} />

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2.5 }}>
          Used by growers across the world
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
          {['SYNGENTA', 'BASF', 'CORTEVA', 'BAYER'].map((name) => (
            <Typography key={name} variant="body2" sx={{ fontWeight: 700, color: 'text.disabled', letterSpacing: '0.12em', userSelect: 'none' }}>
              {name}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
