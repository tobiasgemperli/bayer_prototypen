import React, { useRef, useCallback } from 'react';
import { useNavigate } from '../variants/variant-context';
import { Box, Typography, Button, Breadcrumbs, Link } from '@mui/material';
import { NavigateNext } from '@mui/icons-material';
import { toast } from 'sonner';
import { addPlot } from '../data/plots-data';
import { useDemoMode, setOnboardingStep, setStepProgress, setCoachActive } from '../data/auth-state';
import { PageLayout } from '../design-system/PageLayout';
import {
  AddPlotForm, AddPlotFormHandle, PlotFormValues, packLocation,
} from './AddPlotForm';

interface AddPlotPageProps {
  /** When true, render a "Save as draft" button alongside Save (V5 flow). The
   *  baseline page omits it. Field labels and validation are unchanged —
   *  everything stays visually required either way. */
  allowDraft?: boolean;
  /** V6: planting + flowering dates are rendered as optional. Save passes with
   *  them empty; the forecast tab prompts for them later via a small dialog. */
  softRequiredDates?: boolean;
}

export function AddPlotPage({ allowDraft = false, softRequiredDates = false }: AddPlotPageProps = {}) {
  const navigate = useNavigate();
  const demoMode = useDemoMode();
  const isOnboarding = demoMode === 'onboarding';

  const formRef = useRef<AddPlotFormHandle>(null);

  const handleCancel = () => navigate('/');

  const handleProgress = useCallback((filled: number, total: number) => {
    if (isOnboarding) {
      setCoachActive(true);
      setStepProgress(filled / total);
    }
  }, [isOnboarding]);

  const handleSubmit = (values: PlotFormValues, opts: { asDraft: boolean }) => {
    const newPlot = addPlot({
      plotName: values.plotName.trim(),
      owner: 'anita.baranyi@bayer.com',
      variety: values.variety ?? '',
      location: packLocation(values.gpsLat, values.gpsLon),
      lastTreatment: null,
      crop: values.crop ?? '',
      season: values.season ?? '',
      plantingDate: values.plantingDate ?? null,
      floweringStartDate: values.floweringStartDate ?? null,
    });
    toast.success(
      opts.asDraft
        ? `Plot "${values.plotName.trim()}" saved as draft`
        : `Plot "${values.plotName.trim()}" created successfully`
    );
    if (isOnboarding) {
      setOnboardingStep('add-treatment');
      navigate(`/plot/${newPlot.id}`);
    } else {
      navigate('/');
    }
  };

  return (
    <PageLayout
      variant="centered"
      breadcrumbs={
        <Breadcrumbs separator={<NavigateNext fontSize="small" color="disabled" />}>
          <Link underline="hover" color="text.secondary" onClick={() => navigate('/')}
            sx={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', lineHeight: '1.5rem' }}>
            Plots
          </Link>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'text.primary', lineHeight: '1.5rem' }}>
            Add plot
          </Typography>
        </Breadcrumbs>
      }
      title="Add plot"
      actions={
        <>
          {/* Tertiary: Cancel — text */}
          <Button variant="text" color="inherit" onClick={handleCancel}
            sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 3 }}>
            Cancel
          </Button>
          {/* Secondary: Save as draft — outlined (V5 flow only) */}
          {allowDraft && (
            <Button variant="outlined" color="primary" onClick={() => formRef.current?.submitAsDraft()}
              sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', px: 3 }}>
              Save as draft
            </Button>
          )}
          {/* Primary: Save — contained */}
          <Button variant="contained" color="primary" onClick={() => formRef.current?.submit()}
            sx={{ fontWeight: 600, textTransform: 'none', px: 4 }}>
            Save
          </Button>
        </>
      }
    >
      <AddPlotForm
        ref={formRef}
        hideSeededSeasons={isOnboarding}
        softRequiredDates={softRequiredDates}
        onSubmit={handleSubmit}
        onProgress={handleProgress}
      />
    </PageLayout>
  );
}
