import {describe, it, expect} from 'vitest';
import {
  createManifest,
  addRecordings,
  updateRecording,
  removeRecording,
  renameParticipant,
  validateRecording,
  validateManifest,
  getParticipants,
  toManifest,
} from './batchManifest';

/**
 * Build a manifest seeded with recordings from mock entry-point files.
 * @param {Array<{name: string, path: string}>} files - mock selections
 * @return {object} a manifest state
 */
const seed = (files) => addRecordings(createManifest(), files);

const twoFiles = [
  {name: 'rest.edf', path: '/data/p001/rest.edf'},
  {name: 'oddball.set', path: '/data/p001/oddball.set'},
];

describe('addRecordings', () => {
  it('creates one independently identified row per entry-point file', () => {
    const manifest = seed(twoFiles);
    expect(manifest.recordings).toHaveLength(2);
    const ids = manifest.recordings.map((r) => r.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('exposes the source file and empty explicit assignments per row', () => {
    const [row] = seed(twoFiles).recordings;
    expect(row.sourceFile).toBe('/data/p001/rest.edf');
    expect(row.filename).toBe('rest.edf');
    expect(row).toMatchObject({
      participant: '', session: '', task: '', run: '',
    });
  });

  it('appends to an existing manifest without reusing row ids', () => {
    const first = seed([twoFiles[0]]);
    const second = addRecordings(first, [twoFiles[1]]);
    expect(second.recordings).toHaveLength(2);
    expect(second.recordings[0].id).not.toBe(second.recordings[1].id);
  });

  it('ignores a file already present by source path', () => {
    const manifest = addRecordings(seed(twoFiles), [twoFiles[0]]);
    expect(manifest.recordings).toHaveLength(2);
  });

  it('does not mutate the input manifest', () => {
    const before = seed(twoFiles);
    addRecordings(before, [{name: 'x.edf', path: '/data/x.edf'}]);
    expect(before.recordings).toHaveLength(2);
  });
});

describe('validateRecording', () => {
  const ready = {
    id: 'rec-1', sourceFile: '/a.edf', filename: 'a.edf',
    participant: '001', session: 'baseline', task: 'rest', run: '1',
  };

  it('is ready when required fields are present and valid', () => {
    expect(validateRecording(ready)).toEqual({ready: true, errors: {}});
  });

  it('is ready when optional session and run are blank', () => {
    const result = validateRecording({...ready, session: '', run: ''});
    expect(result.ready).toBe(true);
  });

  it('is unready when the required participant is missing', () => {
    const result = validateRecording({...ready, participant: ''});
    expect(result.ready).toBe(false);
    expect(result.errors).toHaveProperty('participant');
  });

  it('is unready when the required task is missing', () => {
    const result = validateRecording({...ready, task: ''});
    expect(result.ready).toBe(false);
    expect(result.errors).toHaveProperty('task');
  });

  it('rejects non-alphanumeric BIDS labels', () => {
    for (const bad of ['a_b', 'a-b', 'a b', 'a/b']) {
      expect(validateRecording({...ready, task: bad}).ready).toBe(false);
    }
  });

  it('rejects a run that is not a positive integer', () => {
    for (const bad of ['0', '-1', 'one', '1.5']) {
      const result = validateRecording({...ready, run: bad});
      expect(result.ready).toBe(false);
      expect(result.errors).toHaveProperty('run');
    }
  });
});

describe('validateManifest readiness is per-row', () => {
  it('marks only the affected row unready', () => {
    let manifest = seed(twoFiles);
    const [a, b] = manifest.recordings;
    manifest = updateRecording(manifest, a.id,
        {participant: '001', task: 'rest'});
    manifest = updateRecording(manifest, b.id,
        {participant: '002', task: ''}); // missing required task

    const validated = validateManifest(manifest);
    const rowA = validated.recordings.find((r) => r.id === a.id);
    const rowB = validated.recordings.find((r) => r.id === b.id);
    expect(rowA.ready).toBe(true);
    expect(rowB.ready).toBe(false);
    expect(validated.readyCount).toBe(1);
  });

  it('does not let an invalid shared participant spill onto siblings', () => {
    let manifest = seed(twoFiles);
    const [a, b] = manifest.recordings;
    // a is fully valid; b shares nothing and is independently valid.
    manifest = updateRecording(manifest, a.id,
        {participant: '001', task: 'rest'});
    manifest = updateRecording(manifest, b.id,
        {participant: '002', task: 'oddball'});
    expect(validateManifest(manifest).readyCount).toBe(2);
  });
});

describe('renameParticipant propagation', () => {
  /** @return {object} a manifest with three assigned recordings */
  const assigned = () => {
    let manifest = addRecordings(createManifest(), [
      {name: 'r1.edf', path: '/1.edf'},
      {name: 'r2.edf', path: '/2.edf'},
      {name: 'r3.edf', path: '/3.edf'},
    ]);
    const [a, b, c] = manifest.recordings;
    manifest = updateRecording(manifest, a.id, {participant: '001'});
    manifest = updateRecording(manifest, b.id, {participant: '001'});
    manifest = updateRecording(manifest, c.id, {participant: '002'});
    return manifest;
  };

  it('renames every recording linked to the participant', () => {
    const manifest = renameParticipant(assigned(), '001', '999');
    const linked = manifest.recordings
        .filter((r) => r.participant === '999');
    expect(linked).toHaveLength(2);
  });

  it('leaves unrelated participants untouched', () => {
    const manifest = renameParticipant(assigned(), '001', '999');
    const other = manifest.recordings.find((r) => r.participant === '002');
    expect(other).toBeDefined();
  });

  it('merges when renamed onto an existing participant id', () => {
    const manifest = renameParticipant(assigned(), '001', '002');
    expect(manifest.recordings.every((r) => r.participant === '002'))
        .toBe(true);
    expect(getParticipants(manifest)).toHaveLength(1);
  });

  it('is a no-op that preserves links when the target is blank', () => {
    const manifest = renameParticipant(assigned(), '001', '   ');
    expect(manifest.recordings.filter((r) => r.participant === '001'))
        .toHaveLength(2);
  });

  it('returns the same manifest reference for a no-op rename', () => {
    // The workbench relies on this: a no-op returns the identical object, so
    // React skips the re-render and the UI must snap its input back itself.
    const before = assigned();
    expect(renameParticipant(before, '001', '   ')).toBe(before);
    expect(renameParticipant(before, '001', '001')).toBe(before);
  });

  it('does not mutate the input manifest', () => {
    const before = assigned();
    renameParticipant(before, '001', '999');
    expect(before.recordings.filter((r) => r.participant === '001'))
        .toHaveLength(2);
  });
});

describe('getParticipants', () => {
  it('lists unique participants in first-seen order with link counts', () => {
    let manifest = addRecordings(createManifest(), [
      {name: 'r1.edf', path: '/1.edf'},
      {name: 'r2.edf', path: '/2.edf'},
      {name: 'r3.edf', path: '/3.edf'},
    ]);
    const [a, b, c] = manifest.recordings;
    manifest = updateRecording(manifest, a.id, {participant: '002'});
    manifest = updateRecording(manifest, b.id, {participant: '001'});
    manifest = updateRecording(manifest, c.id, {participant: '002'});

    const people = getParticipants(manifest);
    expect(people.map((p) => p.participant)).toEqual(['002', '001']);
    expect(people[0].count).toBe(2);
    expect(people[1].count).toBe(1);
  });

  it('excludes recordings with no participant assigned yet', () => {
    const manifest = seed(twoFiles);
    expect(getParticipants(manifest)).toHaveLength(0);
  });
});

describe('removeRecording', () => {
  it('drops the row and leaves the rest intact', () => {
    const manifest = seed(twoFiles);
    const kept = removeRecording(manifest, manifest.recordings[0].id);
    expect(kept.recordings).toHaveLength(1);
    expect(kept.recordings[0].id).toBe(manifest.recordings[1].id);
  });
});

describe('toManifest export contract', () => {
  it('exposes participants and validated recordings for later slices', () => {
    let manifest = seed(twoFiles);
    const [a, b] = manifest.recordings;
    manifest = updateRecording(manifest, a.id,
        {participant: '001', task: 'rest'});
    manifest = updateRecording(manifest, b.id,
        {participant: '001', task: ''});

    const out = toManifest(manifest);
    expect(out.participants).toEqual([{participant: '001'}]);
    expect(out.totalCount).toBe(2);
    expect(out.readyCount).toBe(1);
    expect(out.ready).toBe(false); // not every row is ready
    expect(out.recordings[0]).toHaveProperty('ready');
    expect(out.recordings[0]).toHaveProperty('errors');
  });

  it('is ready only when every recording is ready', () => {
    let manifest = seed(twoFiles);
    for (const row of manifest.recordings) {
      manifest = updateRecording(manifest, row.id,
          {participant: '001', task: 'rest'});
    }
    expect(toManifest(manifest).ready).toBe(true);
  });
});
