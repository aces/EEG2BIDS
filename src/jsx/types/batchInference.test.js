import {describe, it, expect} from 'vitest';
import {createManifest, addRecordings, toManifest} from './batchManifest';
import {
  inferRecordingFields,
  prefillFromPaths,
  ENTITY_FIELDS,
} from './batchInference';

/**
 * Build a manifest seeded with recordings from mock source paths.
 * Recording ids are assigned in selection order (rec-1, rec-2, …), so tests
 * can predict which row a pre-fill targets.
 * @param {string[]} paths - mock entry-point source paths
 * @return {object} a manifest state
 */
const seed = (paths) =>
  addRecordings(createManifest(), paths.map((path) => ({path})));

/**
 * The fields a single source path proves on its own.
 * @param {string} path - a mock source path
 * @return {Object<string, string>} proven field -> value
 */
const fieldsFor = (path) => inferRecordingFields({sourceFile: path});

describe('inferRecordingFields — canonical BIDS entity tokens', () => {
  it('reads participant/session/task/run from a fully-entity name', () => {
    expect(fieldsFor('/study/sub-01_ses-02_task-rest_run-1_eeg.edf')).toEqual({
      participant: '01',
      session: '02',
      task: 'rest',
      run: '1',
    });
  });

  it('reads entity tokens from directory names, not only filenames', () => {
    expect(fieldsFor('/study/sub-07/ses-A/rest.edf')).toEqual({
      participant: '07',
      session: 'A',
    });
  });

  it('maps each entity key to its manifest field', () => {
    expect(ENTITY_FIELDS).toMatchObject({
      sub: 'participant', ses: 'session', task: 'task', run: 'run',
    });
  });

  it('takes the token value verbatim', () => {
    expect(fieldsFor('/study/sub-018/x.edf').participant).toBe('018');
  });

  it('only matches entities at a path or underscore boundary', () => {
    // "clubsub-01" is not a "sub-" entity: no boundary before "sub".
    expect(fieldsFor('/study/clubsub-01/rest.edf')).toEqual({});
  });

  it('de-duplicates a token repeated in both a folder and the filename', () => {
    // sub-01 appears twice with the same value, so it is not a conflict.
    expect(fieldsFor('/study/sub-01/sub-01_eeg.edf').participant).toBe('01');
  });
});

describe('inferRecordingFields — proves only, never guesses', () => {
  it('does not guess a task from a non-entity filename token', () => {
    // "rest" here is not a task- entity, so no task is read from it.
    expect(fieldsFor('/study/p001/eeg_rest.edf').task).toBeUndefined();
  });

  it('does not read a "subj018"-style near-miss as a participant', () => {
    // Resembling an entity is not being one; "subj" is not the "sub-" key.
    expect(fieldsFor('/dl/raw/subj018_SS1.vhdr')).toEqual({});
  });

  it('does not trust a folder name to encode participant or session', () => {
    // A plain "visit1" folder is not a canonical entity, so nothing is read.
    expect(fieldsFor('/study/visit1/rest.edf')).toEqual({});
  });

  it('omits a field whose token has two different values (ambiguous)', () => {
    const fields = fieldsFor('/study/sub-01/sub-02/rest.edf');
    expect(fields.participant).toBeUndefined();
  });

  it('still reads the unambiguous fields of a conflicted recording', () => {
    const fields = fieldsFor('/study/sub-01/sub-02/task-rest_eeg.edf');
    expect(fields.participant).toBeUndefined();
    expect(fields.task).toBe('rest');
  });
});

describe('prefillFromPaths — fill empty fields on import', () => {
  it('fills proven fields into a freshly added recording', () => {
    const manifest = prefillFromPaths(
        seed(['/study/sub-01_task-rest_eeg.edf']));
    expect(manifest.recordings[0]).toMatchObject({
      participant: '01', task: 'rest',
    });
  });

  it('leaves unproven fields blank', () => {
    const manifest = prefillFromPaths(seed(['/study/sub-01_eeg.edf']));
    const [row] = manifest.recordings;
    expect(row.participant).toBe('01');
    expect(row.task).toBe('');
    expect(row.session).toBe('');
  });

  it('never overwrites a value the user has already typed', () => {
    const seeded = seed(['/study/sub-01_task-rest_eeg.edf']);
    // The user renamed participant to "control" before the pre-fill runs.
    const edited = {
      ...seeded,
      recordings: seeded.recordings.map(
          (r) => ({...r, participant: 'control'})),
    };
    const manifest = prefillFromPaths(edited);
    expect(manifest.recordings[0].participant).toBe('control');
    // A still-empty field is filled.
    expect(manifest.recordings[0].task).toBe('rest');
  });

  it('pre-fills only the recordings named in ids', () => {
    const manifest = seed([
      '/study/sub-01_eeg.edf',
      '/study/sub-02_eeg.edf',
    ]);
    // Only the second row (rec-2) is pre-filled.
    const filled = prefillFromPaths(manifest, ['rec-2']);
    expect(filled.recordings[0].participant).toBe('');
    expect(filled.recordings[1].participant).toBe('02');
  });

  it('fills nothing for a flat folder of non-BIDS filenames', () => {
    // Real case: "subj018_SS1" names in one shared folder prove nothing.
    const manifest = prefillFromPaths(seed([
      '/dl/look/raw/subj018_SS1.vhdr',
      '/dl/look/raw/subj021_SS2.vhdr',
    ]));
    for (const row of manifest.recordings) {
      expect(row).toMatchObject({
        participant: '', session: '', task: '', run: '',
      });
    }
  });

  it('does not mutate the manifest it is given', () => {
    const manifest = seed(['/study/sub-01_eeg.edf']);
    prefillFromPaths(manifest);
    expect(manifest.recordings[0].participant).toBe('');
  });

  it('is idempotent — a second pass changes nothing', () => {
    const once = prefillFromPaths(seed(['/study/sub-01_task-rest.edf']));
    const twice = prefillFromPaths(once);
    expect(twice.recordings).toEqual(once.recordings);
  });

  it('pre-filled values export like any other explicit assignment', () => {
    const manifest = prefillFromPaths(
        seed(['/study/sub-01_task-rest_eeg.edf']));
    // Exported without re-running inference: the manifest owns the values.
    const exported = toManifest(manifest);
    expect(exported.recordings[0]).toMatchObject({
      participant: '01', task: 'rest',
    });
  });
});
