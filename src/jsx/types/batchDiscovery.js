// Entry points mirror the backend reader table (eeg2bids/converter.py
// `_PRESERVE_FORMAT_BY_EXT`). Companions share the recording's directory and
// stem but hold its data or markers, so they never become rows of their own.
const RECORDING_FORMATS = {
  '.edf': {format: 'EDF', companions: []},
  '.set': {format: 'EEGLAB', companions: ['.fdt']},
  '.vhdr': {format: 'BrainVision', companions: ['.vmrk', '.eeg']},
  '.fif': {format: 'FIF', companions: []},
};

export const ATTENTION_REASONS = {
  UNKNOWN: 'unknown',
  ORPHAN_COMPANION: 'orphan-companion',
  // Entry points sharing a directory and stem: which one is the recording is
  // ambiguous, so none of them is trusted.
  DUPLICATE_CANDIDATE: 'duplicate-candidate',
};

const COMPANION_EXTS = new Set(
    Object.values(RECORDING_FORMATS).flatMap((f) => f.companions));

const attention = ({path, filename}, reason) => ({path, filename, reason});

// Paths are sorted first so the result never depends on scan order.
export const discoverRecordings = (files) => {
  const paths = (files || [])
      .map((e) => String((typeof e === 'string' ? e : e?.path) || ''))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

  const parsed = paths.map((path) => {
    const filename = path.split(/[\\/]/).pop();
    const dot = filename.lastIndexOf('.');
    const ext = dot > 0 ? filename.slice(dot).toLowerCase() : '';
    // Directory + stem, case-insensitive so `rest.FDT` pairs with `rest.set`.
    const key = path.slice(0, path.length - ext.length).toLowerCase();
    return {path, filename, ext, key};
  });
  const entries = parsed.filter((f) => RECORDING_FORMATS[f.ext]);
  const companions = parsed.filter((f) => COMPANION_EXTS.has(f.ext));
  const needsAttention = parsed
      .filter((f) => !RECORDING_FORMATS[f.ext] && !COMPANION_EXTS.has(f.ext))
      .map((f) => attention(f, ATTENTION_REASONS.UNKNOWN));

  const entriesByKey = Map.groupBy(entries, (f) => f.key);
  const companionsByKey = Map.groupBy(companions, (f) => f.key);
  const consumed = new Set();
  const recordings = [];

  for (const entry of entries) {
    const {format, companions: allowed} = RECORDING_FORMATS[entry.ext];
    const siblings = (companionsByKey.get(entry.key) || [])
        .filter((c) => allowed.includes(c.ext));

    if (entriesByKey.get(entry.key).length > 1) {
      needsAttention.push(
          attention(entry, ATTENTION_REASONS.DUPLICATE_CANDIDATE));
      for (const c of siblings) {
        if (consumed.has(c.path)) continue;
        consumed.add(c.path);
        needsAttention.push(
            attention(c, ATTENTION_REASONS.DUPLICATE_CANDIDATE));
      }
      continue;
    }

    siblings.forEach((c) => consumed.add(c.path));
    recordings.push({
      sourceFile: entry.path,
      filename: entry.filename,
      format,
      companions: siblings.map((c) => c.path),
    });
  }

  needsAttention.push(...companions
      .filter((c) => !consumed.has(c.path))
      .map((c) => attention(c, ATTENTION_REASONS.ORPHAN_COMPANION)));

  return {
    recordings,
    needsAttention: needsAttention.sort((a, b) => a.path.localeCompare(b.path)),
    scannedCount: paths.length,
  };
};
