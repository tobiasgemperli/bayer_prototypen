import {
  AppBar, Toolbar, IconButton, Avatar, Box, Menu, MenuItem,
  ListItemIcon, Typography, Divider,
} from '@mui/material';
import {
  Notifications, HelpOutline, Menu as MenuIcon, Person,
  Settings, Logout, KeyboardArrowDown,
} from '@mui/icons-material';
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import ResiYouLogo from '../../imports/ResiYouLogo1';
import { useDemoMode } from '../data/auth-state';
import { demoUser } from '../data/demo-content';

export function Header() {
  const demoMode = useDemoMode();
  const isOnboarding = demoMode === 'onboarding';
  const navigate = useNavigate();
  const location = useLocation();

  // Logo always goes to the Plots list (keeps the current variant prefix, if any).
  const goToPlots = () => {
    const m = location.pathname.match(/^\/v\/([^/]+)/);
    navigate(m ? `/v/${m[1]}/` : '/');
  };
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <AppBar position="static" elevation={0}
      sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', height: 56 }}>
      <Toolbar sx={{ minHeight: '56px !important', px: 3 }}>
        {/* Hamburger — hidden during onboarding, visible in full product */}
        {!isOnboarding && (
          <Box sx={{ mr: 1 }}>
            <IconButton size="small" sx={{ color: 'text.secondary' }}><MenuIcon /></IconButton>
          </Box>
        )}

        <Box onClick={goToPlots} sx={{ height: 32, width: 128, cursor: 'pointer' }}>
          <ResiYouLogo />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {/* Notifications + Help — hidden in onboarding */}
          {!isOnboarding && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton size="small" sx={{ color: 'text.secondary' }}><Notifications /></IconButton>
              <IconButton size="small" sx={{ color: 'text.secondary' }}><HelpOutline /></IconButton>
            </Box>
          )}

          <Box onClick={handleClick}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '13px' }}>{demoUser.initial}</Avatar>
            <Typography sx={{ fontSize: '13px', color: 'text.primary' }}>{demoUser.name}</Typography>
            <KeyboardArrowDown sx={{ fontSize: 20, color: 'text.secondary' }} />
          </Box>

          <Menu anchorEl={anchorEl} open={open} onClose={handleClose} onClick={handleClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{ sx: { mt: 1, minWidth: 220 } }}>
            <MenuItem disabled>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>My Account</Typography>
            </MenuItem>
            <Divider />
            <MenuItem><ListItemIcon><Person fontSize="small" /></ListItemIcon>Profile</MenuItem>
            <MenuItem><ListItemIcon><Settings fontSize="small" /></ListItemIcon>Settings</MenuItem>
            <Divider />
            <MenuItem><ListItemIcon><Logout fontSize="small" /></ListItemIcon>Log out</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
