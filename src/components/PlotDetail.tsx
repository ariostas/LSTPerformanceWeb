import React from 'react';
import { useWindowWidth } from '../hooks/useWindowWidth';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { PlotInfo, ParsedDataset } from '../plotLayout';
import { formatMetric, formatVariable, PDGID_LABELS, SELECTION_LABELS, CHARGE_LABELS } from '../plotLayout';

interface PlotDetailProps {
  mainPlot: PlotInfo;
  dataset: ParsedDataset;
  onBack: () => void;
}

function sectionLabel(breakdown: PlotInfo): string {
  if (breakdown.breakdownType === 'den') return `Denominator ${breakdown.breakdownIndex}`;
  if (breakdown.breakdownType === 'num') return `Numerator ${breakdown.breakdownIndex}`;
  if (breakdown.breakdownType === 'ratio') return `Double Ratio ${breakdown.breakdownIndex}`;
  return 'Breakdown';
}

function makePlotTitle(plot: PlotInfo): string {
  const metric = formatMetric(plot.metric);
  const variable = formatVariable(plot.variable);
  if (plot.metric === 'eff') {
    const pdgLabel = plot.pdgid !== undefined ? (PDGID_LABELS[plot.pdgid] ?? String(plot.pdgid)) : '';
    const selLabel = plot.selection ? (SELECTION_LABELS[plot.selection] ?? plot.selection) : '';
    const chLabel = plot.charge !== undefined ? (CHARGE_LABELS[plot.charge] ?? String(plot.charge)) : '';
    return `${plot.objectType} ${metric} — ${variable} | ${pdgLabel}, ${selLabel}, charge: ${chLabel}`;
  }
  return `${plot.objectType} ${metric} — ${variable}`;
}

const SinglePdf: React.FC<{ url: string; label: string }> = ({ url, label }) => {
  const windowWidth = useWindowWidth();
  return (
    <div className="plot-detail-section">
      <p className="plot-detail-section-label">{label}</p>
      <div className="plot-detail-pdf">
        <Document file={url} loading={<div style={{ padding: 12, color: '#888' }}>Loading…</div>}>
          <Page
            pageNumber={1}
            width={Math.min(windowWidth - 420, 900)}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
    </div>
  );
};

const PlotDetail: React.FC<PlotDetailProps> = ({ mainPlot, dataset, onBack }) => {
  const breakdownList = dataset.breakdowns.get(mainPlot.stem) ?? [];

  return (
    <div className="plot-detail-container">
      <button className="plot-detail-back" onClick={onBack}>
        ← Back to summary
      </button>
      <h2 className="plot-detail-title">{makePlotTitle(mainPlot)}</h2>

      <SinglePdf url={mainPlot.url} label="Ratio" />

      {breakdownList.map(bd => (
        <SinglePdf key={bd.stem} url={bd.url} label={sectionLabel(bd)} />
      ))}
    </div>
  );
};

export default PlotDetail;
