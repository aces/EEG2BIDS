import {describe, it, expect} from 'vitest';
import {createManifest, addRecordings, updateRecording} from './batchManifest';
import {extractValue, previewMapping, applyMapping} from './batchMapping';

const seed = () => addRecordings(createManifest(), [
  {name: 'subj018_SS1.vhdr', path: '/raw/subj018_SS1.vhdr'},
  {name: 'subj019_SS1.vhdr', path: '/raw/subj019_SS1.vhdr'},
  {name: 'notes.vhdr', path: '/raw/notes.vhdr'},
]);

const spec = {
  source: 'filename', delimiter: '_', index: 0,
  pattern: '(\\d+)', field: 'participant',
};

describe('extractValue', () => {
  const extract = (str, overrides) =>
    extractValue(str, {delimiter: '_', index: 0, ...overrides});

  it('takes the chosen segment, optionally transformed by a pattern', () => {
    expect(extract('subj018_SS1'))
        .toEqual({token: 'subj018', value: 'subj018', error: null});
    expect(extract('subj018', {pattern: '(\\d+)'}).value).toBe('018');
    expect(extract('subj018', {pattern: '\\d+'}).value).toBe('018');
    expect(extract('subj018_SS1', {delimiter: ''}).value)
        .toBe('subj018_SS1');
  });

  it('yields an empty value for a missing segment or failed match', () => {
    expect(extract('rest', {index: 3}).value).toBe('');
    expect(extract('rest', {pattern: '(\\d+)'}))
        .toEqual({token: 'rest', value: '', error: null});
  });

  it('reports an error for an unparsable pattern instead of throwing', () => {
    expect(extract('rest', {pattern: '('})).toEqual({
      token: 'rest', value: '', error: 'Invalid transform pattern',
    });
  });
});

describe('previewMapping', () => {
  it('shows each extraction and which rows would change', () => {
    const manifest = updateRecording(seed(), 'rec-1', {participant: '018'});
    const preview = previewMapping(manifest, spec);
    expect(preview.items.map((i) => [i.extracted, i.matched, i.willChange]))
        .toEqual([
          ['018', true, false], ['019', true, true], ['', false, false],
        ]);
    expect(preview).toMatchObject({
      field: 'participant', affectedCount: 2, changeCount: 1,
      patternError: null,
    });
  });

  it('scopes to ids, reads whole paths, and surfaces pattern errors', () => {
    expect(previewMapping(seed(), spec, ['rec-2']).items.map((i) => i.id))
        .toEqual(['rec-2']);
    const pathPreview = previewMapping(seed(),
        {source: 'path', delimiter: '/', index: 1, field: 'task'});
    expect(pathPreview.items[0].extracted).toBe('raw');
    const bad = previewMapping(seed(), {...spec, pattern: '('});
    expect(bad).toMatchObject({
      patternError: 'Invalid transform pattern', affectedCount: 0,
    });
  });
});

describe('applyMapping', () => {
  it('writes matched values and leaves unmatched rows untouched', () => {
    const before = updateRecording(seed(), 'rec-3', {participant: 'keep'});
    const after = applyMapping(before, spec);
    expect(after.recordings.map((r) => r.participant))
        .toEqual(['018', '019', 'keep']);
    expect(before.recordings[0].participant).toBe('');
    expect(after).not.toHaveProperty('mapping');
  });

  it('scopes the change to the selected ids', () => {
    expect(applyMapping(seed(), spec, ['rec-1']).recordings
        .map((r) => r.participant)).toEqual(['018', '', '']);
  });
});
