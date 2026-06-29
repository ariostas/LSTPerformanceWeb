import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { DecompressedFile } from '../decompress';

interface FlatPdfViewerProps {
  files: DecompressedFile[];
}

const FlatPdfViewer: React.FC<FlatPdfViewerProps> = ({ files }) => {
  const [selected, setSelected] = useState<DecompressedFile | null>(null);
  const [listWidth, setListWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const left = containerRef.current.getBoundingClientRect().left;
      setListWidth(Math.max(150, Math.min(600, e.clientX - left)));
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const groups = useMemo(() => {
    const map = new Map<string, DecompressedFile[]>();
    for (const f of files) {
      const parts = f.name.split('/');
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
      if (!map.has(dir)) map.set(dir, []);
      map.get(dir)!.push(f);
    }
    return map;
  }, [files]);

  return (
    <div ref={containerRef} className={`plot-viewer ${isResizing ? 'is-resizing' : ''}`} style={{ flexDirection: 'row' }}>
      <div style={{ width: listWidth, display: 'flex', flexShrink: 0 }}>
        <div className="flat-file-list" style={{ width: '100%' }}>
          {[...groups.entries()].map(([dir, groupFiles]) => (
            <div key={dir} className="flat-file-group">
              <p className="flat-file-group-name">{dir}</p>
              {groupFiles.map(f => {
                const name = f.name.split('/').at(-1) ?? f.name;
                return (
                  <div
                    key={f.name}
                    className={`flat-file-item ${selected?.name === f.name ? 'active' : ''}`}
                    onClick={() => setSelected(f)}
                  >
                    {name}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="resizer-h" onMouseDown={handleMouseDown} />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, background: '#525659' }}>
        {selected ? (
          <Document
            file={selected.url}
            loading={<div style={{ color: 'white', padding: 20 }}>Loading…</div>}
          >
            <Page
              pageNumber={1}
              width={Math.min(window.innerWidth - 600, 900)}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        ) : (
          <div style={{ color: '#ccc', fontStyle: 'italic', padding: 40 }}>
            Select a plot from the list.
          </div>
        )}
      </div>
    </div>
  );
};

export default FlatPdfViewer;
