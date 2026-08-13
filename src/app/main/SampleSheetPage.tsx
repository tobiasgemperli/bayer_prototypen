import React, { useMemo } from 'react';
import { useParams } from 'react-router';
import { getLabSample } from '../data/lab-results-data';
import { usePlots } from '../data/plots-data';
import ResiYouLogo from '../../imports/ResiYouLogo1';

/** The only spacing values allowed anywhere on this page — every margin,
 *  padding, and gap must come from here. `SPACE[28]` would be a type error:
 *  that's the point, it keeps off-scale values from creeping back in. */
const SPACE = { 2: 2, 4: 4, 8: 8, 12: 12, 16: 16, 24: 24, 32: 32, 48: 48 } as const;

const PAGE_STYLES = `
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #f0f0f0; }
  @media print {
    html, body { background: #fff; }
    .sheet { box-shadow: none !important; margin: 0 !important; }
  }
  .sheet {
    width: 210mm;
    min-height: 297mm;
    margin: ${SPACE[32]}px auto;
    padding: 16mm; /* physical print-page margin, not a UI spacing value — exempt from the px scale */
    box-sizing: border-box;
    background: #fff;
    color: #000;
    font-family: Inter, Arial, sans-serif;
    box-shadow: 0 2px 24px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
  }
  .sheet h1 { font-size: 22px; font-weight: 700; margin: 0 0 ${SPACE[24]}px; }
  .sheet h2 { font-size: 14px; font-weight: 700; margin: 0 0 ${SPACE[4]}px; }
  .sheet p { font-size: 14px; line-height: 1.6; margin: 0 0 ${SPACE[4]}px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: ${SPACE[24]}px; margin-bottom: ${SPACE[32]}px; }
`;

const fmtDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d) : '—';

/** One "Label: value" text line — the whole content section is just a list of these. */
function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return <p>{label}: {value}</p>;
}

function QrPlaceholder() {
  return (
    <div style={{ width: 88, height: 88, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#fff', margin: 0 }}>QR code</p>
    </div>
  );
}

/** Material Symbols Outlined "info" — the actual icon font (already loaded
 *  app-wide via src/styles/fonts.css), not a hand-drawn approximation. */
function InfoIcon() {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: 16, lineHeight: 1, color: '#000', marginRight: SPACE[4], flexShrink: 0,
        fontWeight: 600,
        fontVariationSettings: '"FILL" 0, "wght" 600, "GRAD" 0, "opsz" 24',
      }}
    >
      info
    </span>
  );
}

export function SampleSheetPage() {
  const { sampleId } = useParams();
  const sample = sampleId ? getLabSample(sampleId) : undefined;
  const plots = usePlots();
  const plot = useMemo(() => plots.find((p) => p.id === sample?.plotId), [plots, sample]);

  if (!sample) {
    return (
      <div style={{ fontFamily: 'Inter, Arial, sans-serif', padding: SPACE[48], textAlign: 'center' }}>
        <h1 style={{ fontSize: 20 }}>Sample sheet not found</h1>
        <p style={{ color: '#808080' }}>This sample no longer exists or the link is incorrect.</p>
      </div>
    );
  }

  const labLabel = sample.laboratory || 'the laboratory';

  return (
    <>
      <style>{PAGE_STYLES}</style>

      <div className="sheet">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACE[32] }}>
          <div style={{ width: 120, height: 30 }}>
            <ResiYouLogo />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ border: '1px solid #E6E6E6', padding: SPACE[16] }}>
              <QrPlaceholder />
            </div>
            <p style={{ marginTop: SPACE[8], marginBottom: 0, lineHeight: 1.4, textAlign: 'right' }}>Sample ID: {sample.sampleCode}</p>
          </div>
        </div>

        <h1>Sample submission sheet</h1>

        <div className="cols">
          <div>
            <h2>Sample</h2>
            <Line label="Sample name" value={sample.sampleName || '—'} />
            <Line label="Sample date" value={fmtDate(sample.dateOfSample)} />
            <Line label="Commodity" value={sample.commodity ?? '—'} />
            <p>Analytical method: <span style={{ color: '#808080' }}>…</span></p>
          </div>
          <div>
            <h2>Plot</h2>
            <Line label="Plot name" value={plot?.plotName ?? '—'} />
            <Line label="Crop" value={plot?.crop ?? '—'} />
            <Line label="Variety" value={plot?.variety || '—'} />
            <Line label="Location" value={plot?.location ?? '—'} />
            <Line label="Contact" value={plot?.owner ?? '—'} />
          </div>
        </div>

        {sample.comments?.trim() && (
          <div style={{ marginBottom: SPACE[32] }}>
            <h2>Notes</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{sample.comments}</p>
          </div>
        )}

        <div className="cols" style={{ marginTop: 'auto', paddingTop: SPACE[32], marginBottom: 0 }}>
          <div style={{ border: '1px solid #E6E6E6', padding: SPACE[16] }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <InfoIcon />
              <h2 style={{ margin: 0 }}>For the grower</h2>
            </div>
            <p style={{ marginTop: SPACE[8] }}>
              Attach the sheet to the sample container and send both to {labLabel}.
              ResiYou adds the results automatically and notifies you by email.
            </p>
          </div>
          <div style={{ border: '1px solid #E6E6E6', padding: SPACE[16] }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <InfoIcon />
              <h2 style={{ margin: 0 }}>For the laboratory</h2>
            </div>
            <p style={{ marginTop: SPACE[8] }}>
              Scan the QR code or enter the sample ID when uploading the report.
              This links the report to the correct sample and plot.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#808080', marginTop: SPACE[24] }}>
          <span>ResiYou by Bayer · resiyou.bayer.com</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </>
  );
}
