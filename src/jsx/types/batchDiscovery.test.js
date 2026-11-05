import {describe, it, expect} from 'vitest';
import {
  discoverRecordings,
  RECORDING_FORMATS,
  ATTENTION_REASONS,
} from './batchDiscovery';

/**
 * Discover from bare path strings, the shape the filesystem scan returns.
 * @param {string[]} paths - absolute or relative file paths
 * @return {object} the discovery result
 */
const discover = (paths) => discoverRecordings(paths);

describe('discoverRecordings — recursive entry points', () => {
  it('discovers supported entry points at arbitrary nesting depths', () => {
    const result = discover([
      '/root/a.edf',
      '/root/study/site-a/p001/visit1/rest.set',
      '/root/deep/deeper/deepest/oddball.vhdr',
    ]);
    const sources = result.recordings.map((r) => r.sourceFile);
    expect(sources).toContain('/root/a.edf');
    expect(sources).toContain('/root/study/site-a/p001/visit1/rest.set');
    expect(sources).toContain('/root/deep/deeper/deepest/oddball.vhdr');
    expect(result.recordings).toHaveLength(3);
  });

  it('recognises entry points case-insensitively by extension', () => {
    const result = discover(['/root/UPPER.EDF', '/root/mixed.SeT']);
    expect(result.recordings).toHaveLength(2);
    expect(result.needsAttention).toHaveLength(0);
  });

  it('records the resolved format and display filename per row', () => {
    const [row] = discover(['/root/nested/rest.set']).recordings;
    expect(row.format).toBe(RECORDING_FORMATS['.set'].format);
    expect(row.filename).toBe('rest.set');
  });

  it('counts every scanned file for reporting', () => {
    const result = discover(['/root/a.edf', '/root/notes.txt']);
    expect(result.scannedCount).toBe(2);
  });
});

describe('discoverRecordings — companion grouping', () => {
  it('links a .fdt companion to its .set recording, not a new row', () => {
    const result = discover(['/root/p1/rest.set', '/root/p1/rest.fdt']);
    expect(result.recordings).toHaveLength(1);
    expect(result.recordings[0].companions).toEqual(['/root/p1/rest.fdt']);
    // The companion never appears as a recording nor as needs-attention.
    expect(result.needsAttention).toHaveLength(0);
  });

  it('links BrainVision .vmrk and .eeg companions to the .vhdr row', () => {
    const result = discover([
      '/root/x/rec.vhdr',
      '/root/x/rec.vmrk',
      '/root/x/rec.eeg',
    ]);
    expect(result.recordings).toHaveLength(1);
    expect(result.recordings[0].companions).toEqual([
      '/root/x/rec.eeg',
      '/root/x/rec.vmrk',
    ]);
    expect(result.needsAttention).toHaveLength(0);
  });

  it('matches companions by directory and stem, ignoring ext case', () => {
    const result = discover(['/root/rest.set', '/root/rest.FDT']);
    expect(result.recordings[0].companions).toEqual(['/root/rest.FDT']);
  });

  it('does not link a same-stem companion from a different directory', () => {
    const result = discover(['/root/a/rest.set', '/root/b/rest.fdt']);
    expect(result.recordings[0].companions).toEqual([]);
    expect(result.needsAttention).toHaveLength(1);
    expect(result.needsAttention[0].reason)
        .toBe(ATTENTION_REASONS.ORPHAN_COMPANION);
  });

  it('does not link a companion belonging to a different format', () => {
    // .vmrk is a BrainVision companion, never an EEGLAB one.
    const result = discover(['/root/rest.set', '/root/rest.vmrk']);
    expect(result.recordings[0].companions).toEqual([]);
    expect(result.needsAttention.map((n) => n.path))
        .toEqual(['/root/rest.vmrk']);
  });

  it('keeps a .set with embedded data (no .fdt) as a ready recording', () => {
    const result = discover(['/root/embedded.set']);
    expect(result.recordings).toHaveLength(1);
    expect(result.recordings[0].companions).toEqual([]);
    expect(result.needsAttention).toHaveLength(0);
  });
});

describe('discoverRecordings — needs-attention', () => {
  it('reports unknown files without adding them as recordings', () => {
    const result = discover(['/root/rest.edf', '/root/readme.txt']);
    expect(result.recordings.map((r) => r.sourceFile)).toEqual([
      '/root/rest.edf',
    ]);
    const unknown = result.needsAttention.find(
        (n) => n.reason === ATTENTION_REASONS.UNKNOWN);
    expect(unknown.path).toBe('/root/readme.txt');
  });

  it('reports an orphan companion with no parent recording', () => {
    const result = discover(['/root/orphan.fdt']);
    expect(result.recordings).toHaveLength(0);
    expect(result.needsAttention).toEqual([
      {
        path: '/root/orphan.fdt',
        filename: 'orphan.fdt',
        reason: ATTENTION_REASONS.ORPHAN_COMPANION,
      },
    ]);
  });

  it('flags ambiguous same-stem entry points as duplicate candidates', () => {
    const result = discover(['/root/rest.edf', '/root/rest.set']);
    // Neither ambiguous candidate enters the ready set.
    expect(result.recordings).toHaveLength(0);
    const reasons = result.needsAttention.map((n) => n.reason);
    expect(reasons).toEqual([
      ATTENTION_REASONS.DUPLICATE_CANDIDATE,
      ATTENTION_REASONS.DUPLICATE_CANDIDATE,
    ]);
    expect(result.needsAttention.map((n) => n.path)).toEqual([
      '/root/rest.edf',
      '/root/rest.set',
    ]);
  });

  it('flags a duplicate candidate companion as duplicate not orphan', () => {
    const result = discover([
      '/root/rest.edf', '/root/rest.set', '/root/rest.fdt',
    ]);
    expect(result.recordings).toHaveLength(0);
    // The .fdt belongs to the contested .set, so it joins the ambiguous
    // cluster rather than being reported as a parentless orphan.
    expect(result.needsAttention).toEqual([
      {
        path: '/root/rest.edf', filename: 'rest.edf',
        reason: ATTENTION_REASONS.DUPLICATE_CANDIDATE,
      },
      {
        path: '/root/rest.fdt', filename: 'rest.fdt',
        reason: ATTENTION_REASONS.DUPLICATE_CANDIDATE,
      },
      {
        path: '/root/rest.set', filename: 'rest.set',
        reason: ATTENTION_REASONS.DUPLICATE_CANDIDATE,
      },
    ]);
  });

  it('does not treat same-stem entry points in different dirs as dupes', () => {
    const result = discover(['/root/a/rest.edf', '/root/b/rest.edf']);
    expect(result.recordings).toHaveLength(2);
    expect(result.needsAttention).toHaveLength(0);
  });

  it('excludes everything in needs-attention from the ready recordings', () => {
    const result = discover([
      '/root/ok.edf',
      '/root/dup.edf', '/root/dup.set',
      '/root/mystery.dat',
      '/root/lonely.vmrk',
    ]);
    expect(result.recordings.map((r) => r.sourceFile)).toEqual([
      '/root/ok.edf',
    ]);
    expect(result.needsAttention).toHaveLength(4);
  });
});

describe('discoverRecordings — determinism & traceability', () => {
  it('produces identical output regardless of input order', () => {
    const paths = [
      '/root/z/last.edf',
      '/root/a/first.set', '/root/a/first.fdt',
      '/root/m/mid.vhdr', '/root/m/mid.eeg',
      '/root/junk.txt',
    ];
    const forward = discover(paths);
    const reversed = discover([...paths].reverse());
    expect(reversed).toEqual(forward);
  });

  it('sorts recordings and needs-attention deterministically by path', () => {
    const result = discover([
      '/root/b.edf', '/root/a.edf', '/root/c.txt',
    ]);
    expect(result.recordings.map((r) => r.sourceFile)).toEqual([
      '/root/a.edf', '/root/b.edf',
    ]);
  });

  it('lets every proposed row be traced back to its source path', () => {
    const result = discover(['/root/deep/rec.set', '/root/deep/rec.fdt']);
    const [row] = result.recordings;
    expect(row.sourceFile).toBe('/root/deep/rec.set');
    expect(row.companions).toContain('/root/deep/rec.fdt');
  });

  it('accepts file entries as {path} objects as well as strings', () => {
    const result = discoverRecordings([{path: '/root/rest.edf'}]);
    expect(result.recordings[0].sourceFile).toBe('/root/rest.edf');
  });

  it('ignores blank or missing paths', () => {
    const result = discoverRecordings(['', null, undefined, {path: ''}]);
    expect(result.recordings).toHaveLength(0);
    expect(result.needsAttention).toHaveLength(0);
    expect(result.scannedCount).toBe(0);
  });
});
