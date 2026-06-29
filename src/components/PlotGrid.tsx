import React from 'react';
import PlotThumbnail from './PlotThumbnail';
import type { ParsedDataset, PlotInfo } from '../plotLayout';
import {
  formatVariable,
  PDGID_LABELS,
  makeNavKey,
  getEffStem,
  getRecoStem,
} from '../plotLayout';

interface PlotGridProps {
  dataset: ParsedDataset;
  objectType: string;
  metric: string;
  selection: string;
  charge: number;
  selectedStem: string | null;
  onSelect: (plot: PlotInfo) => void;
}

const PlotGrid: React.FC<PlotGridProps> = ({
  dataset,
  objectType,
  metric,
  selection,
  charge,
  selectedStem,
  onSelect,
}) => {
  if (metric === 'eff') {
    const pdgidKey = makeNavKey(objectType, metric, selection, charge);
    const pdgids = dataset.pdgidsForObjMetricSelCharge.get(pdgidKey) ?? [];

    const varKey = (pdgid: number) => makeNavKey(objectType, metric, selection, charge, pdgid);

    return (
      <div className="plot-grid-container">
        {pdgids.map(pdgid => {
          const variables = dataset.variablesForNav.get(varKey(pdgid)) ?? [];
          return (
            <div key={pdgid} className="plot-section">
              {pdgids.length > 1 && (
                <h3 className="plot-section-header">
                  {PDGID_LABELS[pdgid] ?? String(pdgid)}
                </h3>
              )}
              <div className="plot-section-grid">
                {variables.map(variable => {
                  const stem = getEffStem(objectType, selection, pdgid, charge, variable);
                  const plot = dataset.plotsByKey.get(stem);
                  if (!plot) return null;
                  return (
                    <PlotThumbnail
                      key={stem}
                      url={plot.url}
                      label={formatVariable(variable)}
                      isSelected={selectedStem === stem}
                      onClick={() => onSelect(plot)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Reco metrics: flat grid of variables
  const vKey = makeNavKey(objectType, metric);
  const variables = dataset.variablesForNav.get(vKey) ?? [];

  return (
    <div className="plot-grid-container">
      <div className="plot-section">
        <div className="plot-section-grid">
          {variables.map(variable => {
            const stem = getRecoStem(objectType, metric, variable);
            const plot = dataset.plotsByKey.get(stem);
            if (!plot) return null;
            return (
              <PlotThumbnail
                key={stem}
                url={plot.url}
                label={formatVariable(variable)}
                isSelected={selectedStem === stem}
                onClick={() => onSelect(plot)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlotGrid;
