import React, { useMemo, useState, useEffect } from 'react';
import { useWindowWidth } from '../hooks/useWindowWidth';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { DecompressedFile } from '../decompress';
import type { CmssPlotFile } from '../plotLayout';
import {
  parseCmssFiles,
  formatCategoryName,
  formatCmssStemLabel,
  CMSS_GROUP_LABELS,
} from '../plotLayout';
import PlotThumbnail from './PlotThumbnail';
import FlatPdfViewer from './FlatPdfViewer';

interface CmssPlotViewerProps {
  files: DecompressedFile[];
}

const CmssPlotViewer: React.FC<CmssPlotViewerProps> = ({ files }) => {
  const parsed = useMemo(() => parseCmssFiles(files), [files]);
  const windowWidth = useWindowWidth();

  const [category, setCategory] = useState('');
  const [group, setGroup] = useState('');
  const [detail, setDetail] = useState<CmssPlotFile | null>(null);

  // Initialise from URL params when parsed data changes, falling back to defaults
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const first = parsed.categories[0] ?? '';
    const urlCat = params.get('cat') ?? '';
    const resolvedCat = parsed.categories.includes(urlCat) ? urlCat : first;
    setCategory(resolvedCat);

    const groups = parsed.groupsForCategory.get(resolvedCat) ?? [];
    const urlGrp = params.get('grp') ?? '';
    const resolvedGrp = groups.includes(urlGrp) ? urlGrp : (groups[0] ?? '');
    setGroup(resolvedGrp);

    const urlPlot = params.get('plot') ?? '';
    if (urlPlot) {
      const key = `${resolvedCat}\x00${resolvedGrp}`;
      const catFiles = parsed.filesForCategoryGroup.get(key) ?? [];
      setDetail(catFiles.find(f => f.stem === urlPlot) ?? null);
    } else {
      setDetail(null);
    }
  }, [parsed]);

  // Sync nav state → URL
  useEffect(() => {
    if (!category) return;
    const url = new URL(window.location.href);
    url.searchParams.set('cat', category);
    url.searchParams.set('grp', group);
    detail
      ? url.searchParams.set('plot', detail.stem)
      : url.searchParams.delete('plot');
    url.searchParams.delete('ds');
    url.searchParams.delete('obj');
    url.searchParams.delete('metric');
    url.searchParams.delete('sel');
    url.searchParams.delete('charge');
    window.history.replaceState({}, '', url);
  }, [category, group, detail]);

  if (parsed.categories.length === 0) {
    return <FlatPdfViewer files={files} />;
  }

  const groups = parsed.groupsForCategory.get(category) ?? [];
  const currentFiles = parsed.filesForCategoryGroup.get(`${category}\x00${group}`) ?? [];

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setGroup(parsed.groupsForCategory.get(cat)?.[0] ?? '');
    setDetail(null);
  };

  if (detail) {
    return (
      <div className="plot-detail-container">
        <button className="plot-detail-back" onClick={() => setDetail(null)}>
          ← Back to grid
        </button>
        <h2 className="plot-detail-title">{detail.stem}</h2>
        <div className="plot-detail-section">
          <div className="plot-detail-pdf">
            <Document
              file={detail.url}
              loading={<div style={{ padding: 12, color: '#888' }}>Loading…</div>}
            >
              <Page
                pageNumber={1}
                width={Math.min(windowWidth - 420, 900)}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="plot-viewer">
      <div className="nav-bar">
        {parsed.categories.length > 0 && (
          <div className="nav-group">
            <span className="nav-label">Category:</span>
            <div className="nav-tabs">
              {parsed.categories.map(cat => (
                <button
                  key={cat}
                  className={`nav-tab ${category === cat ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {formatCategoryName(cat)}
                </button>
              ))}
            </div>
          </div>
        )}

        {groups.length > 0 && (
          <div className="nav-group">
            <span className="nav-label">Group:</span>
            <div className="nav-tabs">
              {groups.map(g => (
                <button
                  key={g}
                  className={`nav-tab ${group === g ? 'active' : ''}`}
                  onClick={() => { setGroup(g); setDetail(null); }}
                >
                  {CMSS_GROUP_LABELS[g] ?? g}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="plot-grid-container">
        <div className="plot-section">
          <div className="plot-section-grid">
            {currentFiles.map(f => (
              <PlotThumbnail
                key={f.stem}
                url={f.url}
                label={formatCmssStemLabel(f.stem, group)}
                isSelected={false}
                onClick={() => setDetail(f)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CmssPlotViewer;
