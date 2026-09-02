import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { renderFirstPage } from './parsers/load-pdf';

/** Renders the first page of a PDF File as a thumbnail image (client-side). */
export function PdfThumbnail({ file, width = 280 }: { file: File; width?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    file.arrayBuffer()
      .then((buf) => { if (!cancelled && canvasRef.current) return renderFirstPage(buf, canvasRef.current, width); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [file, width]);

  if (error) {
    return (
      <Box sx={{ width, height: width * 1.3, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid', borderColor: 'divider', borderRadius: '8px', bgcolor: 'grey.50' }}>
        <Typography variant="caption" color="text.secondary">Preview unavailable</Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden',
      bgcolor: 'grey.50', lineHeight: 0, maxHeight: 420, overflowY: 'auto' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width }} />
    </Box>
  );
}
