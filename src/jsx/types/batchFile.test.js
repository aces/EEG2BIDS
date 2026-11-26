import {describe, it, expect} from 'vitest';
import {
  createManifest,
  addRecordings,
  bulkAssign,
  updateDemographics,
  setRecordingExcluded,
} from './batchManifest';
import {
  serializeManifest,
  deserializeManifest,
  reconcileSources,
  SOURCE_STATUS,
} from './batchFile';

// Assignments, a shared participant, demographics and one excluded row.
const sampleManifest = () => {
  let manifest = addRecordings(createManifest(), [
    {name: 'rest.edf', path: '/data/p001/rest.edf', format: 'edf'},
    {
      name: 'oddball.set', path: '/data/p001/oddball.set', format: 'set',
      companions: ['/data/p001/oddball.fdt'],
    },
    {name: 'rest.edf', path: '/data/p002/rest.edf', format: 'edf'},
  ]);
  manifest = bulkAssign(manifest, ['rec-1', 'rec-2'],
      {participant: 'p001', task: 'rest'});
  manifest = bulkAssign(manifest, ['rec-3'], {participant: 'p002'});
  manifest = updateDemographics(manifest, 'p001', {age: '31', sex: 'F'});
  return setRecordingExcluded(manifest, 'rec-2', true);
};

describe('serializeManifest', () => {
  it('writes a versioned document of sources and explicit assignments', () => {
    const manifest = sampleManifest();
    manifest.recordings[0].provenance = {source: 'token-mapping'};
    const spec = {source: 'filename', delimiter: '_', index: 0};
    const file = serializeManifest(manifest, {
      mappings: [spec],
      signatures: {'/data/p001/rest.edf': {size: 100, mtimeMs: 5}},
    });
    expect(file.schemaVersion).toBe(1);
    expect(file.recordings[0]).toEqual({
      id: 'rec-1',
      source: {
        path: '/data/p001/rest.edf', filename: 'rest.edf', format: 'edf',
        companions: [], signature: {size: 100, mtimeMs: 5},
      },
      assignments: {participant: 'p001', session: '', task: 'rest', run: ''},
      excluded: false,
      ready: true,
      provenance: {source: 'token-mapping'},
    });
    expect(file.recordings[1]).toMatchObject({
      source: {companions: ['/data/p001/oddball.fdt'], signature: null},
      excluded: true,
    });
    expect(file.recordings[2]).toMatchObject({ready: false});
    expect('provenance' in file.recordings[1]).toBe(false);
    expect(file.demographics.p001).toMatchObject({age: '31', sex: 'F'});
    expect(file.mappings).toEqual([spec]);
    expect(serializeManifest(manifest).mappings).toEqual([]);
  });
});

describe('deserializeManifest', () => {
  it('round-trips through JSON to the same document', () => {
    const manifest = sampleManifest();
    manifest.recordings[0].provenance = {source: 'token-mapping'};
    const once = serializeManifest(manifest);
    const reopened = deserializeManifest(JSON.parse(JSON.stringify(once)));
    expect(reopened).toMatchObject({version: 1, problems: [], mappings: []});
    expect(serializeManifest(reopened.manifest)).toEqual(once);
  });

  it('defaults optional fields when partial rows omit them', () => {
    const {manifest, problems} = deserializeManifest({
      schemaVersion: 1,
      recordings: [{source: {path: '/x/y.edf'}, assignments: {task: 't'}}],
      demographics: {p1: {age: '9', extra: 'x'}, p2: 'junk'},
    });
    expect(manifest.recordings[0]).toEqual({
      id: 'rec-1', sourceFile: '/x/y.edf', filename: 'y.edf', format: '',
      companions: [], sourceSignature: null, excluded: false,
      participant: '', session: '', task: 't', run: '',
    });
    expect(manifest.demographics)
        .toEqual({p1: {age: '9', sex: '', handedness: ''}});
    expect(problems).toEqual([]);
  });

  it('reports version and structure problems but still opens', () => {
    const future = deserializeManifest(
        {...serializeManifest(sampleManifest()), schemaVersion: 2});
    expect(future.problems).toEqual([expect.stringMatching(/newer schema/)]);
    expect(future.manifest.recordings).toHaveLength(3);

    for (const bad of [null, {}]) {
      const {manifest, problems} = deserializeManifest(bad);
      expect(problems.length).toBeGreaterThan(0);
      expect(manifest).toEqual(createManifest());
    }
  });
});

describe('reconcileSources', () => {
  it('reports present, changed and missing sources per recording', () => {
    const signatures = {
      '/data/p001/rest.edf': {size: 100, mtimeMs: 5},
      '/data/p001/oddball.set': {size: 200, mtimeMs: 6},
      '/data/p002/rest.edf': {size: 300, mtimeMs: 7},
    };
    const {manifest} = deserializeManifest(
        serializeManifest(sampleManifest(), {signatures}));
    const report = reconcileSources(manifest, {
      '/data/p001/rest.edf': {size: 100, mtimeMs: 5},
      '/data/p001/oddball.set': {size: 999, mtimeMs: 6},
      '/data/p002/rest.edf': null,
    });
    expect(report.map((r) => r.status)).toEqual([
      SOURCE_STATUS.PRESENT, SOURCE_STATUS.CHANGED, SOURCE_STATUS.MISSING,
    ]);
  });

  it('treats any existing file as present when no signature was saved', () => {
    const report = reconcileSources(sampleManifest(),
        {'/data/p001/rest.edf': {size: 1, mtimeMs: 1}});
    expect(report.map((r) => r.status)).toEqual([
      SOURCE_STATUS.PRESENT, SOURCE_STATUS.MISSING, SOURCE_STATUS.MISSING,
    ]);
  });
});
