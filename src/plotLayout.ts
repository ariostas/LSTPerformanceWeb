export interface PlotInfo {
  url: string;
  stem: string;        // filename without .pdf
  objectType: string;
  metric: string;
  variable: string;
  selection?: string;  // only for metric='eff'
  pdgid?: number;      // only for metric='eff'
  charge?: number;     // only for metric='eff'
  breakdownType?: 'den' | 'num' | 'ratio';
  breakdownIndex?: number;
}

// Per-dataset parsed data (one for each validation_plots_* / comparison_plots_* dir)
export interface ParsedDataset {
  plotsByKey: Map<string, PlotInfo>;
  breakdowns: Map<string, PlotInfo[]>;
  objectTypes: string[];
  metricsForObj: Map<string, string[]>;
  selectionsForObjMetric: Map<string, string[]>;
  chargesForObjMetricSel: Map<string, number[]>;
  pdgidsForObjMetricSelCharge: Map<string, number[]>;
  variablesForNav: Map<string, string[]>;
}

export interface ParsedFiles {
  isMtvRun: boolean;
  // keyed by directory name, e.g. "validation_plots_8da008-PU200"
  datasets: Map<string, ParsedDataset>;
}

const SELECTION_SET = new Set(['base', 'loweta', 'xtr', 'vtr']);

export const METRIC_LABELS: Record<string, string> = {
  eff: 'Efficiency',
  fakerate: 'Fake Rate',
  duplrate: 'Duplicate Rate',
  fakeorduplrate: 'Fake or Dup. Rate',
  avgOTlen: 'Avg. OT Length',
};

export const SELECTION_LABELS: Record<string, string> = {
  base: '|η| < 4.5',
  loweta: '|η| < 2.4',
  xtr: '1.1 < |η| < 2.7',
  vtr: 'barrel non-transition',
};

export const PDGID_LABELS: Record<number, string> = {
  0: 'All',
  11: 'Electron',
  13: 'Muon',
  211: 'Pion',
  321: 'Kaon',
};

export const CHARGE_LABELS: Record<number, string> = {
  0: 'Both',
  1: 'Positive+',
  [-1]: 'Negative−',
};

const VARIABLE_ORDER: string[] = [
  'pt', 'ptzoom', 'ptlow', 'ptlowzoom', 'ptmtv', 'ptmtvzoom',
  'eta', 'etazoom', 'etacoarse', 'etacoarsezoom',
  'phi', 'phizoom', 'phicoarse', 'phicoarsezoom',
  'dxy', 'dxyzoom', 'dxycoarse', 'dxycoarsezoom',
  'dz', 'dzzoom', 'dzcoarse', 'dzcoarsezoom',
  'vxy', 'vxyzoom', 'vxycoarse', 'vxycoarsezoom',
];

const VARIABLE_ORDER_IDX = new Map(VARIABLE_ORDER.map((v, i) => [v, i]));

const VARIABLE_LABELS: Record<string, string> = {
  pt: 'pT', ptzoom: 'pT zoom', ptlow: 'pT low', ptlowzoom: 'pT low zoom',
  ptmtv: 'pT (MTV)', ptmtvzoom: 'pT (MTV) zoom',
  eta: 'η', etazoom: 'η zoom', etacoarse: 'η coarse', etacoarsezoom: 'η coarse zoom',
  phi: 'φ', phizoom: 'φ zoom', phicoarse: 'φ coarse', phicoarsezoom: 'φ coarse zoom',
  dxy: 'dxy', dxyzoom: 'dxy zoom', dxycoarse: 'dxy coarse', dxycoarsezoom: 'dxy coarse zoom',
  dz: 'dz', dzzoom: 'dz zoom', dzcoarse: 'dz coarse', dzcoarsezoom: 'dz coarse zoom',
  vxy: 'vxy', vxyzoom: 'vxy zoom', vxycoarse: 'vxy coarse', vxycoarsezoom: 'vxy coarse zoom',
};

export function formatVariable(v: string): string {
  return VARIABLE_LABELS[v] ?? v;
}

export function formatMetric(m: string): string {
  return METRIC_LABELS[m] ?? m;
}

export function formatDatasetName(name: string): string {
  if (name.startsWith('validation_plots_')) {
    return 'Validation: ' + name.slice('validation_plots_'.length);
  }
  if (name.startsWith('comparison_plots_')) {
    const rest = name.slice('comparison_plots_'.length);
    // rest is like "8da008-PU200_8da008-PU200"; the two runs are _ separated
    const idx = rest.indexOf('_');
    if (idx !== -1) {
      return 'Comparison: ' + rest.slice(0, idx) + ' vs ' + rest.slice(idx + 1);
    }
    return 'Comparison: ' + rest;
  }
  return name;
}

export function sortVariables(vars: string[]): string[] {
  return [...vars].sort((a, b) => {
    const ia = VARIABLE_ORDER_IDX.get(a) ?? 999;
    const ib = VARIABLE_ORDER_IDX.get(b) ?? 999;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b);
  });
}

const SELECTION_ORDER = ['base', 'loweta', 'xtr', 'vtr'];
const PDGID_ORDER = [0, 11, 13, 211, 321];
const CHARGE_ORDER = [0, 1, -1];

function parseStem(stem: string): Omit<PlotInfo, 'url' | 'stem'> | null {
  const parts = stem.split('_');
  if (parts.length < 2) return null;
  const objectType = parts[0];

  // Efficiency: objectType_selection_pdgid_charge_eff_variable
  if (parts.length >= 6 && SELECTION_SET.has(parts[1]) && parts[4] === 'eff') {
    const selection = parts[1];
    const pdgid = parseInt(parts[2]);
    const charge = parseInt(parts[3]);
    const variable = parts.slice(5).join('_');
    if (isNaN(pdgid) || isNaN(charge)) return null;
    return { objectType, metric: 'eff', variable, selection, pdgid, charge };
  }

  // Reco metric: objectType_metric_variable
  if (parts.length >= 3) {
    const metric = parts[1];
    const variable = parts.slice(2).join('_');
    return { objectType, metric, variable };
  }

  return null;
}

export function makeNavKey(...parts: (string | number)[]): string {
  return parts.join('\x00');
}

function makeEmptyDataset(): {
  plotsByKey: Map<string, PlotInfo>;
  breakdowns: Map<string, PlotInfo[]>;
  objTypesSet: Set<string>;
  metricsSet: Map<string, Set<string>>;
  selectionsSet: Map<string, Set<string>>;
  chargesSet: Map<string, Set<number>>;
  pdgidsSet: Map<string, Set<number>>;
  variablesSet: Map<string, Set<string>>;
} {
  return {
    plotsByKey: new Map(),
    breakdowns: new Map(),
    objTypesSet: new Set(),
    metricsSet: new Map(),
    selectionsSet: new Map(),
    chargesSet: new Map(),
    pdgidsSet: new Map(),
    variablesSet: new Map(),
  };
}

export function parseFiles(decompressedFiles: { name: string; url: string }[]): ParsedFiles {
  // Each entry in rawDatasets corresponds to one *_plots_* directory
  const rawDatasets = new Map<string, ReturnType<typeof makeEmptyDataset>>();

  let isMtvRun = false;

  for (const file of decompressedFiles) {
    // Capture the immediate parent of mtv/ as the dataset name
    const mtvMatch = file.name.match(/\/([^/]+)\/mtv\/(var|den|num|ratio)\/(.+)\.pdf$/);
    if (!mtvMatch) continue;
    isMtvRun = true;

    const datasetName = mtvMatch[1];
    const category = mtvMatch[2] as 'var' | 'den' | 'num' | 'ratio';
    const filename = mtvMatch[3];

    if (!rawDatasets.has(datasetName)) rawDatasets.set(datasetName, makeEmptyDataset());
    const ds = rawDatasets.get(datasetName)!;

    // Check for breakdown suffix: _den0, _num0, _ratio0, etc.
    const breakdownMatch = filename.match(/^(.+)_(den|num|ratio)(\d+)$/);
    if (breakdownMatch) {
      const mainStem = breakdownMatch[1];
      const breakdownType = breakdownMatch[2] as 'den' | 'num' | 'ratio';
      const breakdownIndex = parseInt(breakdownMatch[3]);
      const parsed = parseStem(mainStem);
      if (!parsed) continue;

      const info: PlotInfo = { url: file.url, stem: filename, breakdownType, breakdownIndex, ...parsed };
      if (!ds.breakdowns.has(mainStem)) ds.breakdowns.set(mainStem, []);
      ds.breakdowns.get(mainStem)!.push(info);
      continue;
    }

    if (category !== 'var') continue;

    const parsed = parseStem(filename);
    if (!parsed) continue;

    const info: PlotInfo = { url: file.url, stem: filename, ...parsed };
    ds.plotsByKey.set(filename, info);

    const { objectType, metric, selection, pdgid, charge, variable } = parsed;
    ds.objTypesSet.add(objectType);

    if (!ds.metricsSet.has(objectType)) ds.metricsSet.set(objectType, new Set());
    ds.metricsSet.get(objectType)!.add(metric);

    if (metric === 'eff' && selection !== undefined && pdgid !== undefined && charge !== undefined) {
      const selKey = makeNavKey(objectType, metric);
      if (!ds.selectionsSet.has(selKey)) ds.selectionsSet.set(selKey, new Set());
      ds.selectionsSet.get(selKey)!.add(selection);

      const chKey = makeNavKey(objectType, metric, selection);
      if (!ds.chargesSet.has(chKey)) ds.chargesSet.set(chKey, new Set());
      ds.chargesSet.get(chKey)!.add(charge);

      const pgKey = makeNavKey(objectType, metric, selection, charge);
      if (!ds.pdgidsSet.has(pgKey)) ds.pdgidsSet.set(pgKey, new Set());
      ds.pdgidsSet.get(pgKey)!.add(pdgid);

      const vKey = makeNavKey(objectType, metric, selection, charge, pdgid);
      if (!ds.variablesSet.has(vKey)) ds.variablesSet.set(vKey, new Set());
      ds.variablesSet.get(vKey)!.add(variable);
    } else if (metric !== 'eff') {
      const vKey = makeNavKey(objectType, metric);
      if (!ds.variablesSet.has(vKey)) ds.variablesSet.set(vKey, new Set());
      ds.variablesSet.get(vKey)!.add(variable);
    }
  }

  const BREAKDOWN_ORDER = { den: 0, num: 1, ratio: 2 };

  // Sort dataset names: validation first, then comparison, then others alphabetically
  const datasetOrder = (name: string) =>
    name.startsWith('validation_plots_') ? 0 : name.startsWith('comparison_plots_') ? 1 : 2;

  const sortedNames = [...rawDatasets.keys()].sort((a, b) => {
    const da = datasetOrder(a), db = datasetOrder(b);
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });

  const datasets = new Map<string, ParsedDataset>();

  for (const name of sortedNames) {
    const ds = rawDatasets.get(name)!;

    ds.breakdowns.forEach(list => {
      list.sort((a, b) => {
        const ta = BREAKDOWN_ORDER[a.breakdownType!] ?? 3;
        const tb = BREAKDOWN_ORDER[b.breakdownType!] ?? 3;
        if (ta !== tb) return ta - tb;
        return (a.breakdownIndex ?? 0) - (b.breakdownIndex ?? 0);
      });
    });

    const objectTypes = [...ds.objTypesSet].sort();

    const metricsForObj = new Map<string, string[]>();
    ds.metricsSet.forEach((v, k) => {
      const order = ['eff', 'fakerate', 'duplrate', 'fakeorduplrate', 'avgOTlen'];
      const ordered = order.filter(m => v.has(m));
      const remaining = [...v].filter(m => !order.includes(m)).sort();
      metricsForObj.set(k, [...ordered, ...remaining]);
    });

    const selectionsForObjMetric = new Map<string, string[]>();
    ds.selectionsSet.forEach((v, k) => {
      selectionsForObjMetric.set(k, SELECTION_ORDER.filter(s => v.has(s)));
    });

    const chargesForObjMetricSel = new Map<string, number[]>();
    ds.chargesSet.forEach((v, k) => {
      chargesForObjMetricSel.set(k, CHARGE_ORDER.filter(c => v.has(c)));
    });

    const pdgidsForObjMetricSelCharge = new Map<string, number[]>();
    ds.pdgidsSet.forEach((v, k) => {
      pdgidsForObjMetricSelCharge.set(k, PDGID_ORDER.filter(p => v.has(p)));
    });

    const variablesForNav = new Map<string, string[]>();
    ds.variablesSet.forEach((v, k) => {
      variablesForNav.set(k, sortVariables([...v]));
    });

    datasets.set(name, {
      plotsByKey: ds.plotsByKey,
      breakdowns: ds.breakdowns,
      objectTypes,
      metricsForObj,
      selectionsForObjMetric,
      chargesForObjMetricSel,
      pdgidsForObjMetricSelCharge,
      variablesForNav,
    });
  }

  return { isMtvRun, datasets };
}

export function getEffStem(objectType: string, selection: string, pdgid: number, charge: number, variable: string): string {
  return `${objectType}_${selection}_${pdgid}_${charge}_eff_${variable}`;
}

export function getRecoStem(objectType: string, metric: string, variable: string): string {
  return `${objectType}_${metric}_${variable}`;
}

// ── CMSSW run parsing ────────────────────────────────────────────────────────

export interface CmssPlotFile {
  url: string;
  stem: string;
  category: string;
  group: string;
}

export interface ParsedCmssFiles {
  categories: string[];
  groupsForCategory: Map<string, string[]>;
  filesForCategoryGroup: Map<string, CmssPlotFile[]>;
}

// Order matters: longer/more-specific prefixes must come before their prefixes.
const CMSS_GROUP_PREFIXES: [string, string][] = [
  ['effandfake', 'Efficiency & Fake Rate'],
  ['dupandfake', 'Duplicate & Fake Rate'],
  ['distsim',   'Sim Distributions'],
  ['dist',      'Distributions'],
  ['resolutions', 'Resolutions'],
  ['residual',  'Residuals'],
  ['pvassociation', 'PV Association'],
  ['hits',      'Hits'],
];

export const CMSS_GROUP_LABELS: Record<string, string> = {
  ...Object.fromEntries(CMSS_GROUP_PREFIXES),
  other: 'Other',
};

const CMSS_GROUP_ORDER = [
  'effandfake', 'dupandfake', 'dist', 'distsim',
  'resolutions', 'residual', 'pvassociation', 'hits', 'other',
];

function detectCmssGroup(stem: string): string {
  const lower = stem.toLowerCase();
  for (const [prefix] of CMSS_GROUP_PREFIXES) {
    if (lower.startsWith(prefix)) return prefix;
  }
  return 'other';
}

const CATEGORY_LABELS: Record<string, string> = {
  plots_ootb: 'OOTB',
  plots_building_highPtTripletStep: 'High-pT Triplet Step',
};

export function formatCategoryName(cat: string): string {
  if (CATEGORY_LABELS[cat]) return CATEGORY_LABELS[cat];
  const name = cat.replace(/^plots_/, '').replace(/^building_/, '');
  const spaced = name.replace(/([A-Z])/g, ' $1').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatCmssStemLabel(stem: string, group: string): string {
  const prefix = group === 'other' ? '' : group;
  let label = stem;
  if (prefix && stem.toLowerCase().startsWith(prefix.toLowerCase())) {
    label = stem.slice(prefix.length);
  }
  if (!label) return stem;
  label = label.charAt(0).toUpperCase() + label.slice(1);
  return label.replace(/([A-Z][a-z])/g, ' $1').trim();
}

export function parseCmssFiles(decompressedFiles: { name: string; url: string }[]): ParsedCmssFiles {
  const categoriesSet = new Set<string>();
  const groupsForCategorySet = new Map<string, Set<string>>();
  const filesForCategoryGroup = new Map<string, CmssPlotFile[]>();

  for (const file of decompressedFiles) {
    if (file.name.includes('/mtv/')) continue;
    const match = file.name.match(/\/([^/]+)\/([^/]+)\.pdf$/);
    if (!match) continue;

    const category = match[1];
    const stem = match[2];
    const group = detectCmssGroup(stem);

    categoriesSet.add(category);
    if (!groupsForCategorySet.has(category)) groupsForCategorySet.set(category, new Set());
    groupsForCategorySet.get(category)!.add(group);

    const key = `${category}\x00${group}`;
    if (!filesForCategoryGroup.has(key)) filesForCategoryGroup.set(key, []);
    filesForCategoryGroup.get(key)!.push({ url: file.url, stem, category, group });
  }

  const sortCat = (cat: string) => {
    if (cat === 'plots_ootb') return 0;
    if (cat.startsWith('plots_building_')) return 2;
    return 1;
  };
  const categories = [...categoriesSet].sort((a, b) => {
    const d = sortCat(a) - sortCat(b);
    return d !== 0 ? d : a.localeCompare(b);
  });

  const groupsForCategory = new Map<string, string[]>();
  groupsForCategorySet.forEach((v, k) => {
    groupsForCategory.set(k, CMSS_GROUP_ORDER.filter(g => v.has(g)));
  });

  return { categories, groupsForCategory, filesForCategoryGroup };
}
