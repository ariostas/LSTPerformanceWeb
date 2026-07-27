import React, { useState, useMemo, useEffect } from 'react';
import type { GitHubContent } from '../api';

interface SidebarProps {
  directories: GitHubContent[];
  selectedDir: string | null;
  onSelect: (dir: GitHubContent) => void;
  isLoading: boolean;
}

interface RunTreeNode {
  name: string;
  type: 'pr' | 'commit' | 'run';
  children: Record<string, RunTreeNode>;
  dir?: GitHubContent;
}

function getHardwareTag(dirName: string): 'GPU' | 'CPU' | null {
  if (dirName.endsWith('_gpu')) return 'GPU';
  if (dirName.endsWith('_cpu')) return 'CPU';
  return null;
}

const TIMESTAMP_RE = /^\d{12}$/;

function extractTimestamp(dirName: string): { timestamp: string | null; rest: string } {
  const parts = dirName.split('_');
  if (parts.length >= 3 && TIMESTAMP_RE.test(parts[2])) {
    return { timestamp: parts[2], rest: parts.slice(3).join('_') || 'default' };
  }
  return { timestamp: null, rest: parts.slice(2).join('_') || 'default' };
}

function getLatestTimestamp(commitNode: RunTreeNode): string | null {
  const timestamps = Object.values(commitNode.children)
    .map(child => extractTimestamp(child.dir?.name ?? '').timestamp)
    .filter((ts): ts is string => ts !== null);
  return timestamps.length > 0 ? [...timestamps].sort().at(-1) ?? null : null;
}

function formatTimestamp(ts: string): string {
  const date = new Date(
    parseInt(ts.slice(0, 4)),
    parseInt(ts.slice(4, 6)) - 1,
    parseInt(ts.slice(6, 8)),
    parseInt(ts.slice(8, 10)),
    parseInt(ts.slice(10, 12)),
  );
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

const RunTreeItem: React.FC<{
  node: RunTreeNode;
  level: number;
  selectedDir: string | null;
  onSelect: (dir: GitHubContent) => void;
  searchTerm: string;
}> = ({ node, level, selectedDir, onSelect, searchTerm }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (searchTerm) setIsOpen(true);
  }, [searchTerm]);

  const hasSelectedChild = useMemo(() => {
    const check = (n: RunTreeNode): boolean => {
      if (n.dir?.path === selectedDir) return true;
      return Object.values(n.children).some(check);
    };
    return check(node);
  }, [node, selectedDir]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasSelectedChild) setIsOpen(true);
  }, [hasSelectedChild]);

  if (node.name === 'root') {
    const children = Object.values(node.children).sort((a, b) => {
      const aNum = parseInt(a.name.replace('PR', '')) || 0;
      const bNum = parseInt(b.name.replace('PR', '')) || 0;
      return bNum - aNum;
    });
    return (
      <ul className="tree-list">
        {children.map(child => (
          <RunTreeItem
            key={child.name + (child.dir?.path || '')}
            node={child}
            level={0}
            selectedDir={selectedDir}
            onSelect={onSelect}
            searchTerm={searchTerm}
          />
        ))}
      </ul>
    );
  }

  if (node.type === 'run') {
    const dirName = node.dir?.name ?? '';
    const hwTag = getHardwareTag(dirName);
    const { timestamp } = extractTimestamp(dirName);
    return (
      <li
        className={`run-item ${selectedDir === node.dir?.path ? 'selected' : ''}`}
        onClick={() => onSelect(node.dir!)}
        style={{ paddingLeft: `${level * 12 + 15}px` }}
        title={`${node.dir?.name} (${node.dir?.repo})`}
      >
        <div className="run-item-content">
          <span className="icon">🚀</span>
          <span className="run-name">{node.name.replace(/_(gpu|cpu)$/, '')}</span>
          {hwTag && <span className={`hw-tag hw-tag--${hwTag.toLowerCase()}`}>{hwTag}</span>}
          {timestamp && <span className="run-timestamp">{formatTimestamp(timestamp)}</span>}
          <span className="repo-tag">{node.dir?.repo.includes('2026') ? '2026' : 'Legacy'}</span>
        </div>
      </li>
    );
  }

  const children = Object.values(node.children).sort((a, b) => {
    // Sort commits by latest run timestamp desc; no-timestamp commits at bottom alphabetically
    if (a.type === 'commit' && b.type === 'commit') {
      const tsA = getLatestTimestamp(a);
      const tsB = getLatestTimestamp(b);
      if (tsA && tsB) return tsB.localeCompare(tsA);
      if (tsA) return -1;
      if (tsB) return 1;
      return a.name.localeCompare(b.name);
    }
    // Sort runs by timestamp descending (newest first) when available
    if (a.type === 'run' && b.type === 'run') {
      const tsA = extractTimestamp(a.dir?.name ?? '').timestamp ?? '';
      const tsB = extractTimestamp(b.dir?.name ?? '').timestamp ?? '';
      if (tsA && tsB) return tsB.localeCompare(tsA);
    }
    return a.name.localeCompare(b.name);
  });
  if (children.length === 0) return null;

  return (
    <>
      <li
        className="dir-item"
        onClick={() => setIsOpen(!isOpen)}
        style={{ paddingLeft: `${level * 12 + 15}px` }}
      >
        <span className="icon">{isOpen ? '📂' : '📁'}</span> {node.name}
      </li>
      {isOpen && (
        <ul className="tree-list">
          {children.map(child => (
            <RunTreeItem
              key={child.name + (child.dir?.path || '')}
              node={child}
              level={level + 1}
              selectedDir={selectedDir}
              onSelect={onSelect}
              searchTerm={searchTerm}
            />
          ))}
        </ul>
      )}
    </>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ directories, selectedDir, onSelect, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const runTree = useMemo(() => {
    const root: RunTreeNode = { name: 'root', type: 'pr', children: {} };
    const filtered = directories.filter(dir =>
      dir.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    filtered.forEach(dir => {
      const parts = dir.name.split('_');
      const prName = parts[0] || 'Unknown';
      const commitHash = parts[1] || 'NoHash';
      const { rest } = extractTimestamp(dir.name);

      if (!root.children[prName]) {
        root.children[prName] = { name: prName, type: 'pr', children: {} };
      }
      const prNode = root.children[prName];
      if (!prNode.children[commitHash]) {
        prNode.children[commitHash] = { name: commitHash, type: 'commit', children: {} };
      }
      const commitNode = prNode.children[commitHash];
      // Use dir.name as key so entries with different timestamps stay distinct
      commitNode.children[dir.name] = { name: rest, type: 'run', children: {}, dir };
    });
    return root;
  }, [directories, searchTerm]);

  return (
    <aside className="sidebar" style={{ width: '100%' }}>
      <div className="sidebar-header">
        <h2>CI Runs</h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search runs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="loading">Loading directories...</div>
      ) : (
        <ul className="directory-list">
          <RunTreeItem
            node={runTree}
            level={0}
            selectedDir={selectedDir}
            onSelect={onSelect}
            searchTerm={searchTerm}
          />
          {Object.keys(runTree.children).length === 0 && searchTerm && (
            <li className="no-results">No runs found</li>
          )}
        </ul>
      )}
    </aside>
  );
};

export default Sidebar;
