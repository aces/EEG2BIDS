import {describe, it, expect} from 'vitest';
import {
  createManifest,
  addRecordings,
  updateRecording,
  bulkAssign,
  setRecordingExcluded,
} from './batchManifest';
import {
  proposedDestination,
  relativeOutputStems,
  preflightBatch,
  PREFLIGHT_STATUS,
  PREVIEW_MODALITIES,
  DEFAULT_MODALITY,
} from './batchPreview';

/**
 * assigned - a manifest seeded with rows carrying explicit assignments.
 * @param {object[]} rows - {path, name?, format?} plus assignment fields
 * @return {object} a manifest with each row added and its fields assigned
 */
const assigned = (rows) => rows.reduce((manifest, row) => {
  const withRow = addRecordings(manifest, [
    {path: row.path, name: row.name, format: row.format},
  ]);
  const id = withRow.recordings[withRow.recordings.length - 1].id;
  return updateRecording(withRow, id, {
    participant: row.participant ?? '',
    session: row.session ?? '',
    task: row.task ?? '',
    run: row.run ?? '',
  });
}, createManifest());

describe('proposedDestination', () => {
  it('builds the iEEG destination with acq-seeg and the ieeg datatype', () => {
    const dest = proposedDestination(
        {participant: '01', session: '', task: 'rest', run: '',
          sourceFile: '/raw/rest.edf', format: 'EDF'},
        {modality: 'ieeg'});
    expect(dest.dir).toBe('sub-01/ieeg');
    expect(dest.stem).toBe('sub-01_task-rest_acq-seeg_ieeg');
    expect(dest.path).toBe('sub-01/ieeg/sub-01_task-rest_acq-seeg_ieeg.edf');
    expect(dest.datatype).toBe('ieeg');
  });

  it('builds the EEG destination with acq-eeg and the eeg datatype', () => {
    const dest = proposedDestination(
        {participant: '01', session: '', task: 'rest', run: '',
          sourceFile: '/raw/rest.edf', format: 'EDF'},
        {modality: 'eeg'});
    expect(dest.dir).toBe('sub-01/eeg');
    expect(dest.stem).toBe('sub-01_task-rest_acq-eeg_eeg');
    expect(dest.path).toBe('sub-01/eeg/sub-01_task-rest_acq-eeg_eeg.edf');
  });

  it('includes ses- and run- entities when supplied', () => {
    const dest = proposedDestination(
        {participant: '02', session: '01', task: 'oddball', run: '3',
          sourceFile: '/raw/x.set', format: 'EEGLAB'},
        {modality: 'ieeg'});
    expect(dest.dir).toBe('sub-02/ses-01/ieeg');
    expect(dest.stem)
        .toBe('sub-02_ses-01_task-oddball_acq-seeg_run-3_ieeg');
    expect(dest.path).toBe(
        'sub-02/ses-01/ieeg/' +
        'sub-02_ses-01_task-oddball_acq-seeg_run-3_ieeg.set');
  });

  it('strips delimiters from the subject label like the backend', () => {
    // The backend sanitizes the subject id (removing _, -, spaces); the
    // preview must match so the predicted path equals the real output.
    const dest = proposedDestination(
        {participant: 'sub-01', task: 'rest', session: '', run: '',
          sourceFile: '/raw/rest.edf'},
        {modality: 'eeg'});
    expect(dest.dir).toBe('sub-sub01/eeg');
    expect(dest.stem).toBe('sub-sub01_task-rest_acq-eeg_eeg');
  });

  it('derives the display extension from the source when no format', () => {
    const dest = proposedDestination(
        {participant: '01', task: 'rest', session: '', run: '',
          sourceFile: '/raw/rest.vhdr'},
        {modality: 'eeg'});
    expect(dest.extension).toBe('.vhdr');
  });

  it('falls back to the default modality for an unknown modality', () => {
    const dest = proposedDestination(
        {participant: '01', task: 'rest', session: '', run: '',
          sourceFile: '/raw/rest.edf'},
        {modality: 'bogus'});
    expect(dest.datatype)
        .toBe(DEFAULT_MODALITY === 'eeg' ? 'eeg' : 'ieeg');
  });

  it('returns null when a required entity is missing', () => {
    expect(proposedDestination(
        {participant: '', task: 'rest', sourceFile: '/raw/x.edf'},
        {modality: 'eeg'})).toBeNull();
    expect(proposedDestination(
        {participant: '01', task: '', sourceFile: '/raw/x.edf'},
        {modality: 'eeg'})).toBeNull();
  });
});

describe('relativeOutputStems', () => {
  it('relativizes to the root and drops the extension', () => {
    const stems = relativeOutputStems([
      '/out/sub-01/eeg/sub-01_task-rest_acq-eeg_eeg.edf',
      '/out/sub-01/eeg/sub-01_task-rest_acq-eeg_eeg.json',
      '/out/participants.tsv',
    ], '/out');
    expect(stems.has('sub-01/eeg/sub-01_task-rest_acq-eeg_eeg')).toBe(true);
    // The data file and its JSON sidecar collapse to one recording stem.
    expect(stems.size).toBe(2);
  });

  it('normalizes backslashes so Windows paths compare correctly', () => {
    const stems = relativeOutputStems(
        ['C:\\out\\sub-01\\eeg\\sub-01_task-rest_acq-eeg_eeg.edf'],
        'C:\\out');
    expect(stems.has('sub-01/eeg/sub-01_task-rest_acq-eeg_eeg')).toBe(true);
  });
});

describe('preflightBatch', () => {
  const {NEW, ALREADY_PROCESSED, CONFLICT, EXCLUDED, UNRESOLVED} =
    PREFLIGHT_STATUS;

  /** @param {object} result - a preflight result
   * @param {string} id - a recording id
   * @return {string} that recording's status */
  const statusOf = (result, id) =>
    result.recordings.find((r) => r.id === id).status;

  it('classifies a resolved recording with no existing output as new', () => {
    const manifest = assigned([
      {path: '/raw/a.edf', participant: '01', task: 'rest'},
    ]);
    const result = preflightBatch(manifest, [], {modality: 'eeg'});
    expect(statusOf(result, 'rec-1')).toBe(NEW);
    expect(result.readyIds).toEqual(['rec-1']);
  });

  it('flags a matching existing output as already processed', () => {
    // The exact output file (same slot AND extension) is already present.
    const manifest = assigned([
      {path: '/raw/a.edf', participant: '01', task: 'rest', format: 'EDF'},
    ]);
    const existing =
      ['/out/sub-01/eeg/sub-01_task-rest_acq-eeg_eeg.edf'];
    const result = preflightBatch(manifest, existing,
        {modality: 'eeg', root: '/out'});
    expect(statusOf(result, 'rec-1')).toBe(ALREADY_PROCESSED);
    expect(result.readyIds).toEqual([]);
  });

  it('flags a conflicting existing output when the slot holds another file',
      () => {
        // The BIDS slot is occupied by a .set while the batch would write .edf:
        // a different file in the same slot, which must not be overwritten.
        const manifest = assigned([
          {path: '/raw/a.edf', participant: '01', task: 'rest', format: 'EDF'},
        ]);
        const existing =
          ['/out/sub-01/eeg/sub-01_task-rest_acq-eeg_eeg.set'];
        const result = preflightBatch(manifest, existing,
            {modality: 'eeg', root: '/out'});
        expect(statusOf(result, 'rec-1')).toBe(CONFLICT);
        expect(result.readyIds).toEqual([]);
      });

  it('distinguishes new, matching, and conflicting existing outputs', () => {
    const manifest = assigned([
      {path: '/raw/fresh.edf', participant: '01', task: 'rest', format: 'EDF'},
      {path: '/raw/done.edf', participant: '02', task: 'rest', format: 'EDF'},
      {path: '/raw/clash.edf', participant: '03', task: 'rest', format: 'EDF'},
    ]);
    const existing = [
      '/out/sub-02/eeg/sub-02_task-rest_acq-eeg_eeg.edf', // matching
      '/out/sub-03/eeg/sub-03_task-rest_acq-eeg_eeg.set', // different file
    ];
    const result = preflightBatch(manifest, existing,
        {modality: 'eeg', root: '/out'});
    expect(statusOf(result, 'rec-1')).toBe(NEW);
    expect(statusOf(result, 'rec-2')).toBe(ALREADY_PROCESSED);
    expect(statusOf(result, 'rec-3')).toBe(CONFLICT);
  });

  it('flags two recordings resolving to one destination as conflict', () => {
    const manifest = assigned([
      {path: '/raw/a.edf', participant: '01', task: 'rest'},
      {path: '/raw/b.edf', participant: '01', task: 'rest'},
    ]);
    const result = preflightBatch(manifest, [], {modality: 'eeg'});
    expect(statusOf(result, 'rec-1')).toBe(CONFLICT);
    expect(statusOf(result, 'rec-2')).toBe(CONFLICT);
    expect(result.readyIds).toEqual([]);
    expect(result.conflicts).toHaveLength(1);
    expect(new Set(result.conflicts[0].ids))
        .toEqual(new Set(['rec-1', 'rec-2']));
  });

  it('separates recordings that differ only by run', () => {
    const manifest = assigned([
      {path: '/raw/a.edf', participant: '01', task: 'rest', run: '1'},
      {path: '/raw/b.edf', participant: '01', task: 'rest', run: '2'},
    ]);
    const result = preflightBatch(manifest, [], {modality: 'eeg'});
    expect(statusOf(result, 'rec-1')).toBe(NEW);
    expect(statusOf(result, 'rec-2')).toBe(NEW);
  });

  it('marks a recording with missing required fields as unresolved', () => {
    const manifest = assigned([
      {path: '/raw/a.edf', participant: '01', task: ''},
    ]);
    const result = preflightBatch(manifest, [], {modality: 'eeg'});
    expect(statusOf(result, 'rec-1')).toBe(UNRESOLVED);
    expect(result.recordings[0].destination).toBeNull();
    expect(result.readyIds).toEqual([]);
  });

  it('marks an excluded recording excluded and keeps it unready', () => {
    let manifest = assigned([
      {path: '/raw/a.edf', participant: '01', task: 'rest'},
    ]);
    manifest = setRecordingExcluded(manifest, 'rec-1', true);
    const result = preflightBatch(manifest, [], {modality: 'eeg'});
    expect(statusOf(result, 'rec-1')).toBe(EXCLUDED);
    expect(result.readyIds).toEqual([]);
  });

  it('lets exclusion resolve an otherwise conflicting destination', () => {
    let manifest = assigned([
      {path: '/raw/a.edf', participant: '01', task: 'rest'},
      {path: '/raw/b.edf', participant: '01', task: 'rest'},
    ]);
    manifest = setRecordingExcluded(manifest, 'rec-2', true);
    const result = preflightBatch(manifest, [], {modality: 'eeg'});
    expect(statusOf(result, 'rec-1')).toBe(NEW);
    expect(statusOf(result, 'rec-2')).toBe(EXCLUDED);
    expect(result.readyIds).toEqual(['rec-1']);
  });

  it('keeps every non-new status out of the ready set', () => {
    let manifest = assigned([
      {path: '/raw/new.edf', participant: '01', task: 'rest'},
      {path: '/raw/done.edf', participant: '02', task: 'rest'},
      {path: '/raw/dupA.edf', participant: '03', task: 'rest'},
      {path: '/raw/dupB.edf', participant: '03', task: 'rest'},
      {path: '/raw/bad.edf', participant: '04', task: ''},
      {path: '/raw/skip.edf', participant: '05', task: 'rest'},
    ]);
    manifest = setRecordingExcluded(manifest, 'rec-6', true);
    const existing =
      ['/out/sub-02/eeg/sub-02_task-rest_acq-eeg_eeg.edf'];
    const result = preflightBatch(manifest, existing,
        {modality: 'eeg', root: '/out'});
    expect(result.readyIds).toEqual(['rec-1']);
    expect(result.counts).toMatchObject({
      [NEW]: 1,
      [ALREADY_PROCESSED]: 1,
      [CONFLICT]: 2,
      [UNRESOLVED]: 1,
      [EXCLUDED]: 1,
    });
  });

  it('does not mutate the manifest or the existing-output list', () => {
    const manifest = assigned([
      {path: '/raw/a.edf', participant: '01', task: 'rest'},
      {path: '/raw/b.edf', participant: '01', task: 'rest'},
    ]);
    const existing =
      ['/out/sub-01/eeg/sub-01_task-rest_acq-eeg_eeg.edf'];
    const manifestBefore = JSON.parse(JSON.stringify(manifest));
    const existingBefore = [...existing];
    preflightBatch(manifest, existing, {modality: 'eeg', root: '/out'});
    expect(manifest).toEqual(manifestBefore);
    expect(existing).toEqual(existingBefore);
  });

  it('reports each ready recording its own proposed destination path', () => {
    const manifest = assigned([
      {path: '/raw/a.edf', participant: '01', task: 'rest'},
      {path: '/raw/b.set', participant: '02', task: 'oddball',
        format: 'EEGLAB'},
    ]);
    const result = preflightBatch(manifest, [], {modality: 'ieeg'});
    const first = result.recordings.find((r) => r.id === 'rec-1');
    const second = result.recordings.find((r) => r.id === 'rec-2');
    expect(first.destination.path)
        .toBe('sub-01/ieeg/sub-01_task-rest_acq-seeg_ieeg.edf');
    expect(second.destination.path)
        .toBe('sub-02/ieeg/sub-02_task-oddball_acq-seeg_ieeg.set');
  });

  it('depends only on the final assignment, not on how it was set', () => {
    // A value set via bulkAssign must preflight identically to the same value
    // typed on one row: preflight reads the manifest, never the edit history.
    const base = assigned([
      {path: '/raw/a.edf', participant: '01', task: 'rest'},
    ]);
    const bulk = bulkAssign(
        assigned([{path: '/raw/a.edf'}]), ['rec-1'],
        {participant: '01', task: 'rest'});
    const direct = preflightBatch(base, [], {modality: 'eeg'});
    const viaBulk = preflightBatch(bulk, [], {modality: 'eeg'});
    expect(viaBulk.recordings[0].destination)
        .toEqual(direct.recordings[0].destination);
    expect(viaBulk.recordings[0].status).toBe(direct.recordings[0].status);
  });

  it('exposes the two supported preview modalities', () => {
    expect(PREVIEW_MODALITIES).toEqual(['ieeg', 'eeg']);
  });
});
