import React, { useMemo, useState, useEffect } from 'react';
import type { DecompressedFile } from '../decompress';
import type { PlotInfo } from '../plotLayout';
import {
  parseFiles,
  formatMetric,
  formatDatasetName,
  SELECTION_LABELS,
  CHARGE_LABELS,
  makeNavKey,
} from '../plotLayout';
import PlotGrid from './PlotGrid';
import PlotDetail from './PlotDetail';
import CmssPlotViewer from './CmssPlotViewer';
import FlatPdfViewer from './FlatPdfViewer';

interface PlotViewerProps {
  files: DecompressedFile[];
  isExtracting: boolean;
}

const PlotViewer: React.FC<PlotViewerProps> = ({ files, isExtracting }) => {
  const parsedFiles = useMemo(() => parseFiles(files), [files]);
  const isMtvRun = parsedFiles.isMtvRun;

  const [datasetName, setDatasetName] = useState('');
  const [objectType, setObjectType] = useState('');
  const [metric, setMetric] = useState('');
  const [selection, setSelection] = useState('');
  const [charge, setCharge] = useState(0);
  const [detailPlot, setDetailPlot] = useState<PlotInfo | null>(null);

  // Initialise nav state from URL params when files change, falling back to defaults
  useEffect(() => {
    if (!isMtvRun || parsedFiles.datasets.size === 0) {
      setDatasetName('');
      setObjectType('');
      setMetric('');
      setSelection('');
      setCharge(0);
      setDetailPlot(null);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const firstDs = parsedFiles.datasets.keys().next().value as string;
    const urlDs = params.get('ds') ?? '';
    const resolvedDs = parsedFiles.datasets.has(urlDs) ? urlDs : firstDs;
    setDatasetName(resolvedDs);

    const ds = parsedFiles.datasets.get(resolvedDs)!;

    const firstObj = ds.objectTypes[0] ?? '';
    const urlObj = params.get('obj') ?? '';
    const resolvedObj = ds.objectTypes.includes(urlObj) ? urlObj : firstObj;
    setObjectType(resolvedObj);

    const metrics = ds.metricsForObj.get(resolvedObj) ?? [];
    const firstMetric = metrics[0] ?? '';
    const urlMetric = params.get('metric') ?? '';
    const resolvedMetric = metrics.includes(urlMetric) ? urlMetric : firstMetric;
    setMetric(resolvedMetric);

    if (resolvedMetric === 'eff') {
      const sels = ds.selectionsForObjMetric.get(makeNavKey(resolvedObj, 'eff')) ?? [];
      const firstSel = sels[0] ?? '';
      const urlSel = params.get('sel') ?? '';
      const resolvedSel = sels.includes(urlSel) ? urlSel : firstSel;
      setSelection(resolvedSel);

      const chargeOpts = ds.chargesForObjMetricSel.get(makeNavKey(resolvedObj, 'eff', resolvedSel)) ?? [];
      const firstCharge = chargeOpts[0] ?? 0;
      const urlCharge = parseInt(params.get('charge') ?? '');
      setCharge(chargeOpts.includes(urlCharge) ? urlCharge : firstCharge);
    } else {
      setSelection('');
      setCharge(0);
    }

    const urlPlot = params.get('plot') ?? '';
    setDetailPlot(urlPlot ? (ds.plotsByKey.get(urlPlot) ?? null) : null);
  }, [parsedFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync nav state → URL
  useEffect(() => {
    if (!isMtvRun || !datasetName) return;
    const url = new URL(window.location.href);
    url.searchParams.set('ds', datasetName);
    url.searchParams.set('obj', objectType);
    url.searchParams.set('metric', metric);
    if (metric === 'eff' && selection) {
      url.searchParams.set('sel', selection);
      url.searchParams.set('charge', String(charge));
    } else {
      url.searchParams.delete('sel');
      url.searchParams.delete('charge');
    }
    detailPlot
      ? url.searchParams.set('plot', detailPlot.stem)
      : url.searchParams.delete('plot');
    url.searchParams.delete('cat');
    url.searchParams.delete('grp');
    window.history.replaceState({}, '', url);
  }, [isMtvRun, datasetName, objectType, metric, selection, charge, detailPlot]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetNavForDataset(dsName: string) {
    const ds = parsedFiles.datasets.get(dsName);
    if (!ds) return;

    const firstObj = ds.objectTypes[0] ?? '';
    setObjectType(firstObj);

    const metrics = ds.metricsForObj.get(firstObj) ?? [];
    const firstMetric = metrics[0] ?? '';
    setMetric(firstMetric);

    if (firstMetric === 'eff') {
      const sels = ds.selectionsForObjMetric.get(makeNavKey(firstObj, 'eff')) ?? [];
      const firstSel = sels[0] ?? '';
      setSelection(firstSel);
      const charges = ds.chargesForObjMetricSel.get(makeNavKey(firstObj, 'eff', firstSel)) ?? [];
      setCharge(charges[0] ?? 0);
    } else {
      setSelection('');
      setCharge(0);
    }
  }

  const handleDatasetChange = (name: string) => {
    setDatasetName(name);
    resetNavForDataset(name);
    setDetailPlot(null);
  };

  const handleObjectTypeChange = (obj: string) => {
    const ds = parsedFiles.datasets.get(datasetName);
    if (!ds) return;
    setObjectType(obj);
    const metrics = ds.metricsForObj.get(obj) ?? [];
    const firstMetric = metrics[0] ?? '';
    setMetric(firstMetric);
    if (firstMetric === 'eff') {
      const sels = ds.selectionsForObjMetric.get(makeNavKey(obj, 'eff')) ?? [];
      const firstSel = sels[0] ?? '';
      setSelection(firstSel);
      const charges = ds.chargesForObjMetricSel.get(makeNavKey(obj, 'eff', firstSel)) ?? [];
      setCharge(charges[0] ?? 0);
    }
    setDetailPlot(null);
  };

  const handleMetricChange = (m: string) => {
    const ds = parsedFiles.datasets.get(datasetName);
    if (!ds) return;
    setMetric(m);
    if (m === 'eff') {
      const sels = ds.selectionsForObjMetric.get(makeNavKey(objectType, 'eff')) ?? [];
      const firstSel = sels[0] ?? '';
      setSelection(firstSel);
      const charges = ds.chargesForObjMetricSel.get(makeNavKey(objectType, 'eff', firstSel)) ?? [];
      setCharge(charges[0] ?? 0);
    }
    setDetailPlot(null);
  };

  const handleSelectionChange = (sel: string) => {
    const ds = parsedFiles.datasets.get(datasetName);
    if (!ds) return;
    setSelection(sel);
    const charges = ds.chargesForObjMetricSel.get(makeNavKey(objectType, metric, sel)) ?? [];
    setCharge(charges[0] ?? 0);
    setDetailPlot(null);
  };

  if (isExtracting) {
    return <div className="viewer-placeholder">Decompressing plots…</div>;
  }

  if (files.length === 0) {
    return <div className="viewer-placeholder">Select a CI run from the sidebar to view plots.</div>;
  }

  if (!parsedFiles.isMtvRun) {
    return <CmssPlotViewer files={files} />;
  }

  const datasetNames = [...parsedFiles.datasets.keys()];
  const currentDataset = parsedFiles.datasets.get(datasetName);
  if (!currentDataset) return <FlatPdfViewer files={files} />;

  const objectTypes = currentDataset.objectTypes;
  const metrics = currentDataset.metricsForObj.get(objectType) ?? [];
  const selections = metric === 'eff'
    ? (currentDataset.selectionsForObjMetric.get(makeNavKey(objectType, metric)) ?? [])
    : [];
  const charges = metric === 'eff' && selection
    ? (currentDataset.chargesForObjMetricSel.get(makeNavKey(objectType, metric, selection)) ?? [])
    : [];

  if (detailPlot) {
    return (
      <PlotDetail
        mainPlot={detailPlot}
        dataset={currentDataset}
        onBack={() => setDetailPlot(null)}
      />
    );
  }

  return (
    <div className="plot-viewer">
      <div className="nav-bar">
        {datasetNames.length > 1 && (
          <div className="nav-group">
            <span className="nav-label">Dataset:</span>
            <div className="nav-tabs">
              {datasetNames.map(name => (
                <button
                  key={name}
                  className={`nav-tab ${datasetName === name ? 'active' : ''}`}
                  onClick={() => handleDatasetChange(name)}
                >
                  {formatDatasetName(name)}
                </button>
              ))}
            </div>
          </div>
        )}

        {objectTypes.length > 1 && (
          <div className="nav-group">
            <span className="nav-label">Object:</span>
            <div className="nav-tabs">
              {objectTypes.map(obj => (
                <button
                  key={obj}
                  className={`nav-tab ${objectType === obj ? 'active' : ''}`}
                  onClick={() => handleObjectTypeChange(obj)}
                >
                  {obj}
                </button>
              ))}
            </div>
          </div>
        )}

        {metrics.length > 0 && (
          <div className="nav-group">
            <span className="nav-label">Metric:</span>
            <div className="nav-tabs">
              {metrics.map(m => (
                <button
                  key={m}
                  className={`nav-tab ${metric === m ? 'active' : ''}`}
                  onClick={() => handleMetricChange(m)}
                >
                  {formatMetric(m)}
                </button>
              ))}
            </div>
          </div>
        )}

        {metric === 'eff' && selections.length > 1 && (
          <div className="nav-group">
            <span className="nav-label">Selection:</span>
            <select
              className="nav-select"
              value={selection}
              onChange={e => handleSelectionChange(e.target.value)}
            >
              {selections.map(sel => (
                <option key={sel} value={sel}>
                  {SELECTION_LABELS[sel] ?? sel}
                </option>
              ))}
            </select>
          </div>
        )}

        {metric === 'eff' && charges.length > 1 && (
          <div className="nav-group">
            <span className="nav-label">Charge:</span>
            <div className="nav-tabs">
              {charges.map(ch => (
                <button
                  key={ch}
                  className={`nav-tab ${charge === ch ? 'active' : ''}`}
                  onClick={() => { setCharge(ch); setDetailPlot(null); }}
                >
                  {CHARGE_LABELS[ch] ?? String(ch)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <PlotGrid
        dataset={currentDataset}
        objectType={objectType}
        metric={metric}
        selection={selection}
        charge={charge}
        selectedStem={null}
        onSelect={setDetailPlot}
      />
    </div>
  );
};

export default PlotViewer;
