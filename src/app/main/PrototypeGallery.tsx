import React from 'react';
import { Box, Typography, Card, CardActionArea, CardContent, Chip } from '@mui/material';
import { useNavigate } from 'react-router';
import { PROTOTYPE_SECTIONS, launchPrototype, useCurrentPrototype } from '../data/prototypes';

/** Landing page listing every prototype as a card — a clean place to start a demo. */
export function PrototypeGallery() {
  const navigate = useNavigate();
  const current = useCurrentPrototype();

  const open = (id: string) => { navigate('/'); launchPrototype(id); };

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 4 }}>
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Prototypes</Typography>
        <Typography sx={{ color: 'text.secondary', mb: 4 }}>
          Pick an experience to demo — you can switch any time from the header.
        </Typography>
        {PROTOTYPE_SECTIONS.map(section => (
          <Box key={section.title} sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mb: 1.5 }}>
              {section.title}
            </Typography>
            {section.prototypes.length === 0 ? (
              <Typography sx={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'text.disabled' }}>Coming soon.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
                {section.prototypes.map(p => (
                  <Card key={p.id} variant="outlined"
                    sx={{ borderRadius: '12px', borderColor: p.id === current.id ? 'primary.main' : 'divider' }}>
                    <CardActionArea onClick={() => open(p.id)} sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                          <Typography sx={{ fontWeight: 700 }}>{p.name}</Typography>
                          {p.id === current.id && (
                            <Chip label="Active" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{p.blurb}</Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
