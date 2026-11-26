import {describe, it, expect} from 'vitest';
import {discoverRecordings, ATTENTION_REASONS} from './batchDiscovery';

const {UNKNOWN, ORPHAN_COMPANION, DUPLICATE_CANDIDATE} = ATTENTION_REASONS;
const sources = (result) => result.recordings.map((r) => r.sourceFile);
const flagged = (result) =>
  result.needsAttention.map((n) => [n.path, n.reason]);

describe('discoverRecordings', () => {
  it('finds supported entry points at any depth and in any case', () => {
    const result = discoverRecordings([
      '/root/b.edf',
      '/root/study/site-a/p001/visit1/rest.set',
      '/root/deep/deeper/oddball.vhdr',
      '/root/UPPER.EDF',
      {path: '/root/a.fif'},
      '', null, {path: ''},
    ]);
    expect(sources(result)).toEqual([
      '/root/a.fif', '/root/b.edf', '/root/deep/deeper/oddball.vhdr',
      '/root/study/site-a/p001/visit1/rest.set', '/root/UPPER.EDF',
    ]);
    expect(result.recordings[3]).toEqual({
      sourceFile: '/root/study/site-a/p001/visit1/rest.set',
      filename: 'rest.set', format: 'EEGLAB', companions: [],
    });
    expect(result.needsAttention).toEqual([]);
    expect(result.scannedCount).toBe(5);
  });

  it('links companions by directory, stem and format', () => {
    const result = discoverRecordings([
      '/root/p1/rest.set', '/root/p1/rest.FDT',
      '/root/x/rec.vhdr', '/root/x/rec.vmrk', '/root/x/rec.eeg',
      '/root/y/rest.set', '/root/y/rest.vmrk', // wrong format
      '/root/z/rest.fdt', // different directory
    ]);
    expect(result.recordings.map((r) => r.companions)).toEqual([
      ['/root/p1/rest.FDT'],
      ['/root/x/rec.eeg', '/root/x/rec.vmrk'],
      [],
    ]);
    expect(flagged(result)).toEqual([
      ['/root/y/rest.vmrk', ORPHAN_COMPANION],
      ['/root/z/rest.fdt', ORPHAN_COMPANION],
    ]);
  });

  it('holds unknown files and orphan companions for attention', () => {
    const result = discoverRecordings(['/root/readme.txt', '/root/o.fdt']);
    expect(result.recordings).toEqual([]);
    expect(result.needsAttention).toEqual([
      {path: '/root/o.fdt', filename: 'o.fdt', reason: ORPHAN_COMPANION},
      {path: '/root/readme.txt', filename: 'readme.txt', reason: UNKNOWN},
    ]);
  });

  it('flags same-stem entry points and their companions as duplicates', () => {
    const result = discoverRecordings([
      '/root/rest.edf', '/root/rest.set', '/root/rest.fdt',
      '/root/a/ok.edf', '/root/b/ok.edf',
    ]);
    expect(sources(result)).toEqual(['/root/a/ok.edf', '/root/b/ok.edf']);
    expect(flagged(result)).toEqual([
      ['/root/rest.edf', DUPLICATE_CANDIDATE],
      ['/root/rest.fdt', DUPLICATE_CANDIDATE],
      ['/root/rest.set', DUPLICATE_CANDIDATE],
    ]);
  });

  it('produces identical output regardless of input order', () => {
    const paths = [
      '/root/z/last.edf', '/root/a/first.set', '/root/a/first.fdt',
      '/root/m/mid.vhdr', '/root/m/mid.eeg', '/root/junk.txt',
      '/root/d.edf', '/root/d.set',
    ];
    expect(discoverRecordings([...paths].reverse()))
        .toEqual(discoverRecordings(paths));
  });
});
