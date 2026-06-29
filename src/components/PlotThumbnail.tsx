import React, { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface PlotThumbnailProps {
  url: string;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

const PlotThumbnail: React.FC<PlotThumbnailProps> = ({ url, label, isSelected, onClick }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`plot-thumbnail ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={label}
    >
      <div className="thumbnail-pdf">
        {shouldRender ? (
          <Document file={url} loading="">
            <Page
              pageNumber={1}
              width={200}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading=""
            />
          </Document>
        ) : (
          <div className="thumbnail-placeholder" />
        )}
      </div>
      <div className="thumbnail-label">{label}</div>
    </div>
  );
};

export default PlotThumbnail;
