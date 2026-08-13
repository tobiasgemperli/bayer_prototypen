import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { fieldSx } from './FormField';

function numericKeyFilter(e: React.KeyboardEvent<HTMLInputElement>, allowNegative = false) {
  const nav = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Home', 'End'];
  if (nav.includes(e.key) || e.metaKey || e.ctrlKey) return;
  if (e.key === '.' && !(e.target as HTMLInputElement).value.includes('.')) return;
  if (allowNegative && e.key === '-' && (e.target as HTMLInputElement).selectionStart === 0 && !(e.target as HTMLInputElement).value.includes('-')) return;
  if (e.key >= '0' && e.key <= '9') return;
  e.preventDefault();
}

export interface MapSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (lat: string, lon: string) => void;
  initialLat: string;
  initialLon: string;
}

export function MapSelectionModal({ open, onClose, onConfirm, initialLat, initialLon }: MapSelectionModalProps) {
  const [lat, setLat] = useState(initialLat);
  const [lon, setLon] = useState(initialLon);

  useEffect(() => {
    if (open) { setLat(initialLat); setLon(initialLon); }
  }, [open, initialLat, initialLon]);

  const mapLat = parseFloat(lat) || 50.7374;
  const mapLon = parseFloat(lon) || 7.0982;
  const mapSrc = `https://www.google.com/maps?q=${mapLat},${mapLon}&z=14&output=embed`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '12px', overflow: 'hidden' } }}>
      <DialogTitle sx={{ m: 0, px: 3, pt: 2.5, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
          Select location
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 0, pb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography component="label" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', mb: 0.5, display: 'block' }}>
              Latitude
            </Typography>
            <TextField fullWidth size="small" placeholder="0.00" inputMode="decimal"
              value={lat} onChange={(e) => setLat(e.target.value)}
              onKeyDown={(e) => numericKeyFilter(e as React.KeyboardEvent<HTMLInputElement>, true)}
              sx={fieldSx} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography component="label" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', mb: 0.5, display: 'block' }}>
              Longitude
            </Typography>
            <TextField fullWidth size="small" placeholder="0.00" inputMode="decimal"
              value={lon} onChange={(e) => setLon(e.target.value)}
              onKeyDown={(e) => numericKeyFilter(e as React.KeyboardEvent<HTMLInputElement>, true)}
              sx={fieldSx} />
          </Box>
        </Box>

        <Box sx={{ width: '100%', height: 300, borderRadius: '8px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          <iframe
            title="Map preview"
            src={mapSrc}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
        <Button variant="text" color="inherit" onClick={onClose}
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={() => onConfirm(lat, lon)}
          sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}>
          Confirm location
        </Button>
      </DialogActions>
    </Dialog>
  );
}
