import {describe, it, expect} from 'vitest';
import {
  createManifest,
  addRecordings,
  updateRecording,
  setRecordingExcluded,
} from './batchManifest';
import {
  proposedDestination,
  preflightBatch,
  PREFLIGHT_STATUS,
} from './batchPreview';

const {NEW, ALREADY_PROCESSED, CONFLICT, EXCLUDED, UNRESOLVED} =
  PREFLIGHT_STATUS;

// A manifest with one row per spec: {path, format?, ...assignments}.
const assigned = (rows) => rows.reduce((manifest, {path, format, ...rest}) => {
  const next = addRecordings(manifest, [{path, format}]);
  return updateRecording(next, next.recordings.at(-1).id, rest);
}, createManifest());

const statuses = (result) => result.recordings.map((r) => r.status);

describe('proposedDestination', () => {
  const rec = {participant: '01', task: 'rest', sourceFile: '/raw/rest.edf'};

  it('builds the iEEG (default) and EEG destinations', () => {
    expect(proposedDestination({...rec, format: 'EDF'})).toEqual({
      modality: 'ieeg',
      datatype: 'ieeg',
      dir: 'sub-01/ieeg',
      stem: 'sub-01_task-rest_acq-seeg_ieeg',
      key: 'sub-01/ieeg/sub-01_task-rest_acq-seeg_ieeg',
      extension: '.edf',
      path: 'sub-01/ieeg/sub-01_task-rest_acq-seeg_ieeg.edf',
    });
    expect(proposedDestination(rec, {modality: 'eeg'}).path)
        .toBe('sub-01/eeg/sub-01_task-rest_acq-eeg_eeg.edf');
    expect(proposedDestination(rec, {modality: 'bogus'}).datatype)
        .toBe('ieeg');
  });

  it('includes ses- and run- entities when supplied', () => {
    const dest = proposedDestination({
      participant: '02', session: '01', task: 'oddball', run: '3',
      sourceFile: '/raw/x.set', format: 'EEGLAB',
    });
    expect(dest.path).toBe('sub-02/ses-01/ieeg/' +
      'sub-02_ses-01_task-oddball_acq-seeg_run-3_ieeg.set');
  });

  it('strips delimiters from the subject label like the backend', () => {
    expect(proposedDestination({...rec, participant: 'sub-0 1'}).dir)
        .toBe('sub-sub01/ieeg');
  });

  it('takes the extension from output format, then format, then source', () => {
    const ext = (r, outputFormat) =>
      proposedDestination(r, {outputFormat}).extension;
    expect(ext({...rec, format: 'EDF'}, 'brainvision')).toBe('.vhdr');
    expect(ext({...rec, format: 'EEGLAB'}, 'auto')).toBe('.set');
    expect(ext({...rec, sourceFile: 'C:\\raw\\rest.VHDR'})).toBe('.vhdr');
  });

  it('returns null when subject or task is missing', () => {
    expect(proposedDestination({...rec, participant: ''})).toBeNull();
    expect(proposedDestination({...rec, task: ''})).toBeNull();
  });
});

describe('preflightBatch', () => {
  it('classifies every status and readies only new recordings', () => {
    let manifest = assigned([
      {path: '/raw/new.edf', participant: '01', task: 'rest'},
      {path: '/raw/done.edf', participant: '02', task: 'rest'},
      {path: '/raw/clash.edf', participant: '03', task: 'rest'},
      {path: '/raw/dupA.edf', participant: '04', task: 'rest'},
      {path: '/raw/dupB.edf', participant: '04', task: 'rest'},
      {path: '/raw/bad.edf', participant: '05', task: ''},
      {path: '/raw/skip.edf', participant: '06', task: 'rest'},
      {path: '/raw/run1.edf', participant: '07', task: 'rest', run: '1'},
      {path: '/raw/run2.edf', participant: '07', task: 'rest', run: '2'},
    ]);
    manifest = setRecordingExcluded(manifest, 'rec-7', true);
    const result = preflightBatch(manifest, [
      '/out/sub-02/eeg/sub-02_task-rest_acq-eeg_eeg.edf', // matching
      '/out/sub-03/eeg/sub-03_task-rest_acq-eeg_eeg.set', // different file
    ], {modality: 'eeg', root: '/out'});

    expect(statuses(result)).toEqual([
      NEW, ALREADY_PROCESSED, CONFLICT, CONFLICT, CONFLICT, UNRESOLVED,
      EXCLUDED, NEW, NEW,
    ]);
    expect(result.readyIds).toEqual(['rec-1', 'rec-8', 'rec-9']);
    expect(result.conflicts).toEqual([{
      key: 'sub-04/eeg/sub-04_task-rest_acq-eeg_eeg', ids: ['rec-4', 'rec-5'],
    }]);
    expect(result.counts).toEqual({
      [NEW]: 3, [ALREADY_PROCESSED]: 1, [CONFLICT]: 3, [EXCLUDED]: 1,
      [UNRESOLVED]: 1,
    });
    expect(result.recordings[5].destination).toBeNull();
    expect(result).toMatchObject({
      modality: 'eeg', datatype: 'eeg', total: 9, readyCount: 3,
    });
  });

  it('lets exclusion resolve an otherwise conflicting destination', () => {
    const manifest = setRecordingExcluded(assigned([
      {path: '/raw/a.edf', participant: '01', task: 'rest'},
      {path: '/raw/b.edf', participant: '01', task: 'rest'},
    ]), 'rec-2', true);
    expect(statuses(preflightBatch(manifest))).toEqual([NEW, EXCLUDED]);
  });

  it('normalizes Windows paths and treats a sidecar as an occupied slot',
      () => {
        const manifest = assigned([
          {path: '/raw/a.edf', participant: '01', task: 'rest'},
          {path: '/raw/b.edf', participant: '02', task: 'rest'},
        ]);
        const result = preflightBatch(manifest, [
          'C:\\out\\sub-01\\ieeg\\sub-01_task-rest_acq-seeg_ieeg.edf',
          {path: 'C:\\out\\sub-02\\ieeg\\sub-02_task-rest_acq-seeg_ieeg.json'},
          'C:\\out',
        ], {root: 'C:\\out\\'});
        expect(statuses(result)).toEqual([ALREADY_PROCESSED, CONFLICT]);
      });

  it('applies the output format extension to the existing-output check', () => {
    const manifest = assigned(
        [{path: '/raw/a.edf', participant: '01', task: 'rest'}]);
    const existing = ['/out/sub-01/ieeg/sub-01_task-rest_acq-seeg_ieeg.vhdr'];
    expect(statuses(preflightBatch(manifest, existing,
        {root: '/out', outputFormat: 'brainvision'})))
        .toEqual([ALREADY_PROCESSED]);
    expect(statuses(preflightBatch(manifest, existing, {root: '/out'})))
        .toEqual([CONFLICT]);
  });

  it('does not mutate the manifest or the existing-output list', () => {
    const manifest = assigned([
      {path: '/raw/a.edf', participant: '01', task: 'rest'},
      {path: '/raw/b.edf', participant: '01', task: 'rest'},
    ]);
    const existing = ['/out/sub-01/eeg/sub-01_task-rest_acq-eeg_eeg.edf'];
    const manifestBefore = structuredClone(manifest);
    preflightBatch(manifest, existing, {modality: 'eeg', root: '/out'});
    expect(manifest).toEqual(manifestBefore);
    expect(existing).toEqual(
        ['/out/sub-01/eeg/sub-01_task-rest_acq-eeg_eeg.edf']);
  });
});
