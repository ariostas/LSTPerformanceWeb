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

const RunTreeItem: React.FC<{
  node: RunTreeNode;
  level: number;
  selectedDir: string | null;
  onSelect: (dir: GitHubContent) => void;
  searchTerm: string;
}> = ({ node, level, selectedDir, onSelect, searchTerm }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
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
          {getHardwareTag(node.dir?.name ?? '') && (
            <span className={`hw-tag hw-tag--${getHardwareTag(node.dir?.name ?? '')!.toLowerCase()}`}>
              {getHardwareTag(node.dir?.name ?? '')}
            </span>
          )}
          <span className="repo-tag">{node.dir?.repo.includes('2026') ? '2026' : 'Legacy'}</span>
        </div>
      </li>
    );
  }

  const children = Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name));
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
      const rest = parts.slice(2).join('_') || 'default';

      if (!root.children[prName]) {
        root.children[prName] = { name: prName, type: 'pr', children: {} };
      }
      const prNode = root.children[prName];
      if (!prNode.children[commitHash]) {
        prNode.children[commitHash] = { name: commitHash, type: 'commit', children: {} };
      }
      const commitNode = prNode.children[commitHash];
      commitNode.children[rest] = { name: rest, type: 'run', children: {}, dir };
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
