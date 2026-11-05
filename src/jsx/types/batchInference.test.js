import {describe, it, expect} from 'vitest';
import {createManifest, addRecordings} from './batchManifest';
import {inferRecordingFields, prefillFromPaths} from './batchInference';

const seed = (paths) =>
  addRecordings(createManifest(), paths.map((path) => ({path})));
const fieldsFor = (path) => inferRecordingFields({sourceFile: path});

describe('inferRecordingFields', () => {
  it('reads canonical entity tokens from filenames and folders', () => {
    expect(fieldsFor('/study/sub-01_ses-02_task-rest_run-1_eeg.edf')).toEqual({
      participant: '01', session: '02', task: 'rest', run: '1',
    });
    expect(fieldsFor('/study/sub-07/ses-A/rest.edf'))
        .toEqual({participant: '07', session: 'A'});
    // The same token repeated is not a conflict.
    expect(fieldsFor('/study/sub-01/sub-01_eeg.edf'))
        .toEqual({participant: '01'});
  });

  it('never guesses from non-entity tokens or folder names', () => {
    for (const path of [
      '/study/clubsub-01/rest.edf', // no boundary before "sub"
      '/dl/raw/subj018_SS1.vhdr', // near-miss, not "sub-"
      '/study/visit1/eeg_rest.edf',
    ]) {
      expect(fieldsFor(path)).toEqual({});
    }
  });

  it('omits only the field whose token has two different values', () => {
    expect(fieldsFor('/study/sub-01/sub-02/task-rest_eeg.edf'))
        .toEqual({task: 'rest'});
  });
});

describe('prefillFromPaths', () => {
  it('fills proven fields and leaves the rest blank', () => {
    const before = seed(['/study/sub-01_task-rest_eeg.edf']);
    const [row] = prefillFromPaths(before).recordings;
    expect(row).toMatchObject({
      participant: '01', task: 'rest', session: '', run: '',
    });
    expect(before.recordings[0].participant).toBe('');
  });

  it('never overwrites a value the user has already typed', () => {
    const seeded = seed(['/study/sub-01_task-rest_eeg.edf']);
    const edited = {
      ...seeded,
      recordings: seeded.recordings.map(
          (r) => ({...r, participant: 'control'})),
    };
    expect(prefillFromPaths(edited).recordings[0])
        .toMatchObject({participant: 'control', task: 'rest'});
  });

  it('pre-fills only the recordings named in ids', () => {
    const manifest = seed(['/study/sub-01_eeg.edf', '/study/sub-02_eeg.edf']);
    expect(prefillFromPaths(manifest, ['rec-2']).recordings
        .map((r) => r.participant)).toEqual(['', '02']);
  });
});
