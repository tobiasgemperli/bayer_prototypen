import React, { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Box } from '@mui/material';
import { KeyboardArrowDown, Check, GridView } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { PROTOTYPES, launchPrototype, useCurrentPrototype } from '../data/prototypes';

/** Header control to jump between prototype experiences during a demo. */
export function PrototypeSwitcher() {
  const current = useCurrentPrototype();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <>
      <Button
        size="small" variant="outlined"
        onClick={e => setAnchor(e.currentTarget)}
        endIcon={<KeyboardArrowDown />}
        sx={{
          textTransform: 'none', borderRadius: '8px', height: 32,
          color: 'text.primary', borderColor: 'divider',
          '&:hover': { borderColor: 'text.disabled', bgcolor: 'action.hover' },
        }}
      >
        <Box component="span" sx={{ color: 'text.secondary', mr: 0.5 }}>Prototype:</Box>
        {current.name}
      </Button>
      <Menu
        anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}
        PaperProps={{ sx: { mt: 1, minWidth: 300, maxWidth: 340 } }}
      >
        {PROTOTYPES.map(p => (
          <MenuItem
            key={p.id} selected={p.id === current.id}
            onClick={() => { launchPrototype(p.id); setAnchor(null); }}
          >
            <ListItemIcon>{p.id === current.id ? <Check fontSize="small" /> : null}</ListItemIcon>
            <ListItemText
              primary={p.name} secondary={p.blurb}
              secondaryTypographyProps={{ sx: { fontSize: '0.72rem', whiteSpace: 'normal' } }}
            />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => { navigate('/prototypes'); setAnchor(null); }}>
          <ListItemIcon><GridView fontSize="small" /></ListItemIcon>
          <ListItemText primary="Open gallery…" />
        </MenuItem>
      </Menu>
    </>
  );
}
