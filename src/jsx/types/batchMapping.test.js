import {describe, it, expect} from 'vitest';
import {
  createManifest,
  addRecordings,
  updateRecording,
  validateManifest,
} from './batchManifest';
import {
  extractValue,
  previewMapping,
  applyMapping,
} from './batchMapping';

const files = [
  {name: 'subj018_SS1.vhdr', path: '/raw/subj018_SS1.vhdr'},
  {name: 'subj019_SS1.vhdr', path: '/raw/subj019_SS1.vhdr'},
  {name: 'notes.vhdr', path: '/raw/notes.vhdr'},
];

/** @return {object} a manifest seeded with the sample non-canonical files */
const seed = () => addRecordings(createManifest(), files);

describe('extractValue', () => {
  it('takes the chosen segment after splitting on the delimiter', () => {
    const {token, value} = extractValue('subj018_SS1',
        {delimiter: '_', index: 0});
    expect(token).toBe('subj018');
    expect(value).toBe('subj018');
  });

  it('applies a pattern with a capture group as the explicit transform', () => {
    const {token, value} = extractValue('subj018',
        {delimiter: '_', index: 0, pattern: '(\\d+)'});
    expect(token).toBe('subj018');
    expect(value).toBe('018');
  });

  it('uses the whole match when the pattern has no capture group', () => {
    const {value} = extractValue('subj018',
        {delimiter: '_', index: 0, pattern: '\\d+'});
    expect(value).toBe('018');
  });

  it('yields an empty value for an out-of-range segment', () => {
    const {value} = extractValue('rest', {delimiter: '_', index: 3});
    expect(value).toBe('');
  });

  it('yields an empty value when the pattern does not match', () => {
    const {value, error} = extractValue('rest',
        {delimiter: '_', index: 0, pattern: '(\\d+)'});
    expect(value).toBe('');
    expect(error).toBeNull();
  });

  it('reports an error for an unparseable pattern instead of throwing', () => {
    const {value, error} = extractValue('rest',
        {delimiter: '_', index: 0, pattern: '('});
    expect(value).toBe('');
    expect(error).toBe('Invalid transform pattern');
  });

  it('treats an empty delimiter as the whole string', () => {
    const {value} = extractValue('subj018_SS1', {delimiter: '', index: 0});
    expect(value).toBe('subj018_SS1');
  });
});

describe('previewMapping', () => {
  const spec = {
    source: 'filename', delimiter: '_', index: 0,
    pattern: '(\\d+)', field: 'participant',
  };

  it('previews the extracted value and change flag per recording', () => {
    const preview = previewMapping(seed(), spec);
    const byName = Object.fromEntries(
        preview.items.map((i) => [i.filename, i]));
    expect(byName['subj018_SS1.vhdr'].extracted).toBe('018');
    expect(byName['subj018_SS1.vhdr'].willChange).toBe(true);
    expect(byName['subj018_SS1.vhdr'].token).toBe('subj018');
  });

  it('counts only recordings the mapping actually matches as affected', () => {
    const preview = previewMapping(seed(), spec);
    // notes.vhdr has no digits in its first segment -> not affected.
    expect(preview.affectedCount).toBe(2);
    const notes = preview.items.find((i) => i.filename === 'notes.vhdr');
    expect(notes.matched).toBe(false);
  });

  it('does not flag a recording that already holds the extracted value', () => {
    let manifest = seed();
    manifest = updateRecording(manifest, manifest.recordings[0].id,
        {participant: '018'});
    const preview = previewMapping(manifest, spec);
    const first = preview.items.find((i) => i.id === manifest.recordings[0].id);
    expect(first.matched).toBe(true);
    expect(first.willChange).toBe(false);
    expect(preview.changeCount).toBe(1); // only subj019 still changes
  });

  it('scopes the preview to the selected recording ids', () => {
    const manifest = seed();
    const onlyFirst = [manifest.recordings[0].id];
    const preview = previewMapping(manifest, spec, onlyFirst);
    expect(preview.items).toHaveLength(1);
    expect(preview.items[0].filename).toBe('subj018_SS1.vhdr');
  });

  it('surfaces a pattern error and does not mutate the manifest', () => {
    const manifest = seed();
    const preview = previewMapping(manifest, {...spec, pattern: '('});
    expect(preview.patternError).toBe('Invalid transform pattern');
    expect(preview.affectedCount).toBe(0);
    expect(manifest.recordings.every((r) => r.participant === '')).toBe(true);
  });

  it('can read a folder token from the whole path', () => {
    const manifest = addRecordings(createManifest(),
        [{name: 'rest.edf', path: '/study/sub-07/rest.edf'}]);
    const preview = previewMapping(manifest,
        {source: 'path', delimiter: '/', index: 2, field: 'participant'});
    expect(preview.items[0].extracted).toBe('sub-07');
  });
});

describe('applyMapping', () => {
  const spec = {
    source: 'filename', delimiter: '_', index: 0,
    pattern: '(\\d+)', field: 'participant',
  };

  it('writes extracted values as explicit assignments', () => {
    const manifest = applyMapping(seed(), spec);
    const values = manifest.recordings.map((r) => r.participant);
    expect(values).toEqual(['018', '019', '']); // notes.vhdr unmatched
  });

  it('leaves unmatched recordings untouched', () => {
    let manifest = seed();
    const notesId = manifest.recordings[2].id;
    manifest = updateRecording(manifest, notesId, {participant: 'keep'});
    manifest = applyMapping(manifest, spec);
    expect(manifest.recordings[2].participant).toBe('keep');
  });

  it('does not depend on being rerun; values persist as assignments', () => {
    const manifest = applyMapping(seed(), spec);
    // The manifest carries no mapping; the assignments stand on their own.
    expect(manifest).not.toHaveProperty('mapping');
    expect(manifest.recordings[0].participant).toBe('018');
  });

  it('scopes the change to the selected ids', () => {
    const manifest = seed();
    const applied = applyMapping(manifest, spec,
        [manifest.recordings[0].id]);
    expect(applied.recordings[0].participant).toBe('018');
    expect(applied.recordings[1].participant).toBe('');
  });

  it('lets an individual recording be corrected after a mapping', () => {
    let manifest = applyMapping(seed(), spec);
    manifest = updateRecording(manifest, manifest.recordings[0].id,
        {participant: '999'});
    expect(manifest.recordings.map((r) => r.participant))
        .toEqual(['999', '019', '']);
  });

  it('does not mutate the input manifest', () => {
    const manifest = seed();
    applyMapping(manifest, spec);
    expect(manifest.recordings.every((r) => r.participant === '')).toBe(true);
  });

  it('produces assignments the manifest validator can then check', () => {
    let manifest = applyMapping(seed(), spec);
    // Give the two mapped rows a task so they become ready.
    manifest = {
      ...manifest,
      recordings: manifest.recordings.map((r) =>
        r.participant ? {...r, task: 'rest'} : r),
    };
    expect(validateManifest(manifest).readyCount).toBe(2);
  });
});
