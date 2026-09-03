import {
  AppBar, Toolbar, IconButton, Avatar, Box, Menu, MenuItem,
  ListItemIcon, Typography, Divider,
  Drawer, List, ListItemButton, ListItemText,
} from '@mui/material';
import {
  Notifications, HelpOutline, Menu as MenuIcon, Person,
  Settings, Logout, KeyboardArrowDown,
  GrassOutlined, DescriptionOutlined, ScienceOutlined,
} from '@mui/icons-material';
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import ResiYouLogo from '../../imports/ResiYouLogo1';
import { useDemoMode } from '../data/auth-state';
import { demoUser } from '../data/demo-content';
import { PrototypeSwitcher } from './PrototypeSwitcher';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ChatBubbleOutline, GridViewOutlined } from '@mui/icons-material';
import { useCurrentPrototype } from '../data/prototypes';
import { useChatFirstMode, setChatFirstMode } from '../data/chat-first';

export function Header() {
  const demoMode = useDemoMode();
  const isOnboarding = demoMode === 'onboarding';
  const navigate = useNavigate();
  const location = useLocation();
  const proto = useCurrentPrototype();
  const chatFirstMode = useChatFirstMode();
  const isChatFirst = proto.id === 'chat-first';

  // Logo always goes to the Plots list (keeps the current variant prefix, if any).
  const goToPlots = () => {
    const m = location.pathname.match(/^\/v\/([^/]+)/);
    navigate(m ? `/v/${m[1]}/` : '/');
  };
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [navOpen, setNavOpen] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const variantPrefix = (location.pathname.match(/^\/v\/([^/]+)/) || [])[0] || '';
  const navItems = [
    { label: 'Plots', icon: <GrassOutlined fontSize="small" />, path: `${variantPrefix}/` },
    { label: 'Samples', icon: <ScienceOutlined fontSize="small" />, path: `${variantPrefix}/samples` },
    { label: 'Sample Reports', icon: <DescriptionOutlined fontSize="small" />, path: `${variantPrefix}/sample-reports` },
  ];
  const go = (path: string) => { navigate(path); setNavOpen(false); };

  return (
    <AppBar position="static" elevation={0}
      sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', height: 56 }}>
      <Toolbar sx={{ minHeight: '56px !important', px: 3 }}>
        {/* Hamburger — hidden during onboarding, visible in full product */}
        {!isOnboarding && (
          <Box sx={{ mr: 1 }}>
            <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => setNavOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Box>
        )}

        <Drawer anchor="left" open={navOpen} onClose={() => setNavOpen(false)}>
          <Box sx={{ width: 260, pt: 1 }} role="navigation">
            <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>Navigate</Typography>
            <List>
              {navItems.map((item) => {
                const selected = item.label === 'Plots'
                  ? location.pathname === item.path || location.pathname === `${variantPrefix}` || location.pathname === '/'
                  : location.pathname === item.path;
                return (
                  <ListItemButton key={item.label} selected={selected} onClick={() => go(item.path)}>
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        </Drawer>

        <Box onClick={goToPlots} sx={{ height: 32, width: 128, cursor: 'pointer' }}>
          <ResiYouLogo />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Chat-first: fullscreen Chat / UI segmented control */}
        {isChatFirst && (
          <ToggleButtonGroup
            exclusive size="small" value={chatFirstMode}
            onChange={(_, v) => { if (v) setChatFirstMode(v); }}
            sx={{
              mr: 3,
              '& .MuiToggleButton-root': { textTransform: 'none', px: 2, py: 0.5, borderRadius: '8px' },
              '& .MuiToggleButton-root.Mui-selected': { bgcolor: 'grey.900', color: 'common.white', '&:hover': { bgcolor: '#000' } },
            }}
          >
            <ToggleButton value="ui"><GridViewOutlined sx={{ fontSize: 18, mr: 0.75 }} />UI</ToggleButton>
            <ToggleButton value="chat"><ChatBubbleOutline sx={{ fontSize: 18, mr: 0.75 }} />Chat</ToggleButton>
          </ToggleButtonGroup>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {/* Demo prototype switcher */}
          {!isOnboarding && <PrototypeSwitcher />}

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
