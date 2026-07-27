import { useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import PlotViewer from './components/PlotViewer';
import { fetchDirectories, fetchTarball } from './api';
import type { GitHubContent } from './api';
import { decompressTarGz, revokeFileUrls } from './decompress';
import type { DecompressedFile } from './decompress';
import './App.css';

const REPOS = [
  { name: 'lst-performance-plots-archive-2026', branch: 'main' },
  { name: 'TrackLooper-plots-archive', branch: 'cmssw' },
];

function App() {
  const [directories, setDirectories] = useState<GitHubContent[]>([]);
  const [selectedDir, setSelectedDir] = useState<GitHubContent | null>(null);
  const [plotFiles, setPlotFiles] = useState<DecompressedFile[]>([]);
  const [isLoadingDirs, setIsLoadingDirs] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function initApp() {
      try {
        const allDirsResults = await Promise.all(REPOS.map(repo => fetchDirectories(repo.name)));
        const allDirs = allDirsResults.flat();
        setDirectories(allDirs);

        const params = new URLSearchParams(window.location.search);
        const runName = params.get('run');
        if (runName) {
          const matchedDir = allDirs.find(d => d.name === runName);
          if (matchedDir) handleDirSelect(matchedDir);
        }
      } catch (err) {
        setError('Failed to load directories from GitHub.');
        console.error(err);
      } finally {
        setIsLoadingDirs(false);
      }
    }
    initApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      setSidebarWidth(Math.max(150, Math.min(600, e.clientX)));
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

  const handleDirSelect = async (dir: GitHubContent) => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setSelectedDir(prev => {
      if (prev?.path === dir.path && prev?.repo === dir.repo) return prev;
      return dir;
    });

    const url = new URL(window.location.href);
    url.searchParams.set('run', dir.name);
    window.history.pushState({}, '', url);

    setPlotFiles(prev => { revokeFileUrls(prev); return []; });
    setIsExtracting(true);
    setError(null);

    try {
      const repoInfo = REPOS.find(r => r.name === dir.repo);
      const buffer = await fetchTarball(dir.repo, dir.path, repoInfo?.branch ?? 'main', controller.signal);
      const files = await decompressTarGz(buffer);
      setPlotFiles(files);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(`Failed to process plots for ${dir.name}.`);
      console.error(err);
    } finally {
      // Only reset state if this request is still the current one
      if (fetchAbortRef.current === controller) setIsExtracting(false);
    }
  };

  return (
    <div className={`app-container ${isResizing ? 'is-resizing' : ''}`}>
      <header className="app-header">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="LST logo" className="app-logo" />
        <h1>LST Performance Web</h1>
      </header>
      <main className="app-body">
        <div style={{ width: sidebarWidth, display: 'flex' }}>
          <Sidebar
            directories={directories}
            selectedDir={selectedDir?.path ?? null}
            onSelect={handleDirSelect}
            isLoading={isLoadingDirs}
          />
          <div className="resizer-h" onMouseDown={handleMouseDown} />
        </div>
        <section className="content-area">
          {error && <div className="error-message">{error}</div>}
          <PlotViewer files={plotFiles} isExtracting={isExtracting} />
        </section>
      </main>
    </div>
  );
}

export default App;
