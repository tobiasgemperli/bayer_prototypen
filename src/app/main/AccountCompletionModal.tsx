import React, { useState } from 'react';
import { useNavigate } from '../variants/variant-context';
import {
  Dialog, Box, Typography, TextField, Button, FormControlLabel, Checkbox
} from '@mui/material';
import { setAuthPhase, useDemoMode } from '../data/auth-state';
import { fieldSx, errorFieldSx } from '../design-system/FormField';

interface FormErrors { firstName?: string; lastName?: string }

function validate(firstName: string, lastName: string): FormErrors {
  const errors: FormErrors = {};
  if (!firstName.trim()) errors.firstName = 'First name is required.';
  if (!lastName.trim()) errors.lastName = 'Last name is required.';
  return errors;
}

export function AccountCompletionModal({ open }: { open: boolean }) {
  const navigate = useNavigate();
  const demoMode = useDemoMode();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [referral, setReferral] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = validate(firstName, lastName);
  const err = (field: keyof FormErrors) => submitted ? errors[field] : undefined;

  const handleContinue = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setAuthPhase('completed');
    if (demoMode === 'onboarding') {
      navigate('/');
    }
  };

  return (
    <Dialog open={open} maxWidth="xs" fullWidth disableEscapeKeyDown
      onClose={(_e, reason) => { if (reason === 'backdropClick') return; }}
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0,0,0,0.12)' } }}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.5)' } } }}>

      <Box sx={{ px: 4, pt: 4, pb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>
          Welcome to ResiYou
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.6, mb: 3 }}>
          Complete your profile to get started.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" component="label" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
              Name<Box component="span" sx={{ color: 'primary.main', ml: 0.25 }}>*</Box>
            </Typography>
            <TextField fullWidth size="small" placeholder="First name" autoFocus
              value={firstName} onChange={(e) => setFirstName(e.target.value)}
              error={!!err('firstName')} helperText={err('firstName')}
              sx={err('firstName') ? errorFieldSx : fieldSx} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" component="label" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
              Surname<Box component="span" sx={{ color: 'primary.main', ml: 0.25 }}>*</Box>
            </Typography>
            <TextField fullWidth size="small" placeholder="Last name"
              value={lastName} onChange={(e) => setLastName(e.target.value)}
              error={!!err('lastName')} helperText={err('lastName')}
              sx={err('lastName') ? errorFieldSx : fieldSx} />
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" component="label" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
            How did you hear about us?
          </Typography>
          <TextField fullWidth size="small" placeholder="e.g. colleague, conference, search engine..."
            value={referral} onChange={(e) => setReferral(e.target.value)} sx={fieldSx} />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <FormControlLabel
            control={<Checkbox checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />}
            label={<Typography variant="body2" color="text.secondary">Keep me updated on product news and tips</Typography>}
          />
        </Box>

        <Button fullWidth variant="contained" color="primary" onClick={handleContinue}
          sx={{ height: 44, fontWeight: 600, textTransform: 'none', borderRadius: '8px', mb: 2 }}>
          Continue
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', lineHeight: 1.6 }}>
          Your information will not be shared with third parties.
        </Typography>
      </Box>
    </Dialog>
  );
}
