import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';

export interface ActionItem {
  label?: string;
  icon?: React.ReactNode;
  key: string;
  divider?: boolean;
  color?: string;
  onClick: (key: string) => void;
}

interface ActionMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  actions: ActionItem[];
}

export function ActionMenu({ anchorEl, open, onClose, actions }: ActionMenuProps) {
  // Ensure the menu is only considered "open" if we have a valid anchor element
  const isOpen = open && Boolean(anchorEl);

  return (
    <Menu
      anchorEl={anchorEl}
      open={isOpen}
      onClose={onClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      // Disable transition if anchorEl might be missing during close
      transitionDuration={isOpen ? undefined : 0}
      PaperProps={{
        sx: {
          mt: 1,
          minWidth: 220,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'divider',
          '& .MuiMenuItem-root': {
            py: 1.2,
            px: 2,
            gap: 1.5,
            '&:hover': {
              bgcolor: 'action.hover',
            }
          }
        }
      }}
    >
      {actions.map((action, index) => {
        const itemKey = action.key || `action-item-${index}`;
        
        if (action.divider) {
          return <Divider key={itemKey} sx={{ my: 0.5 }} />;
        }

        return (
          <MenuItem 
            key={itemKey} 
            onClick={() => {
              action.onClick(action.key);
              onClose();
            }}
            sx={{ color: action.color || 'text.primary' }}
          >
            {action.icon && (
              <ListItemIcon sx={{ 
                minWidth: 'auto', 
                color: action.color || 'primary.main' 
              }}>
                {action.icon}
              </ListItemIcon>
            )}
            <ListItemText 
              primary={action.label} 
              primaryTypographyProps={{ 
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'inherit'
              }} 
            />
          </MenuItem>
        );
      })}
    </Menu>
  );
}
