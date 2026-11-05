import {describe, it, expect} from 'vitest';
import {
  createManifest,
  addRecordings,
  updateRecording,
  bulkAssign,
  setRecordingExcluded,
  removeRecording,
  renameParticipant,
  updateDemographics,
  findParticipantConflicts,
  validateRecording,
  validateManifest,
  getParticipants,
  toManifest,
} from './batchManifest';

const seed = (files) => addRecordings(createManifest(), files);

const twoFiles = [
  {name: 'rest.edf', path: '/data/p001/rest.edf'},
  {name: 'oddball.set', path: '/data/p001/oddball.set'},
];

// One recording per participant label, in order.
const withParticipants = (...labels) => labels.reduce(
    (m, label, i) => updateRecording(m, m.recordings[i].id,
        {participant: label}),
    seed(labels.map((_, i) => ({path: `/${i}.edf`}))));

describe('addRecordings', () => {
  it('creates an included, unassigned row per entry-point file', () => {
    const manifest = seed(twoFiles);
    expect(manifest.recordings).toHaveLength(2);
    expect(manifest.recordings[0]).toEqual({
      id: 'rec-1', sourceFile: '/data/p001/rest.edf', filename: 'rest.edf',
      format: '', companions: [], excluded: false,
      participant: '', session: '', task: '', run: '',
    });
    expect(manifest.recordings[1].id).toBe('rec-2');
  });

  it('carries a discovered format and companion files onto the row', () => {
    const [row] = seed([{
      path: '/data/p1/rest.set', format: 'EEGLAB',
      companions: ['/data/p1/rest.fdt'],
    }]).recordings;
    expect(row).toMatchObject({
      filename: 'rest.set', format: 'EEGLAB',
      companions: ['/data/p1/rest.fdt'],
    });
  });

  it('appends without reusing ids or duplicating a source path', () => {
    const first = seed([twoFiles[0]]);
    const removed = removeRecording(seed(twoFiles), 'rec-1');
    const next = addRecordings(removed, [twoFiles[0], twoFiles[1]]);
    expect(next.recordings.map((r) => r.id)).toEqual(['rec-2', 'rec-3']);
    expect(addRecordings(first, [twoFiles[0]]).recordings).toHaveLength(1);
    expect(first.recordings).toHaveLength(1);
  });
});

describe('validateRecording', () => {
  const ready = {
    participant: '001', session: 'baseline', task: 'rest', run: '1',
  };

  it('is ready when required fields are valid and optional ones blank', () => {
    expect(validateRecording(ready)).toEqual({ready: true, errors: {}});
    expect(validateRecording({...ready, session: '', run: ''}).ready)
        .toBe(true);
  });

  it('requires participant and task', () => {
    expect(validateRecording({...ready, participant: '', task: ''}).errors)
        .toEqual({
          participant: 'Participant is required',
          task: 'Task is required',
        });
  });

  it('rejects non-alphanumeric BIDS labels', () => {
    for (const bad of ['a_b', 'a-b', 'a b', 'a/b']) {
      expect(validateRecording({...ready, session: bad}).errors.session)
          .toMatch(/alphanumeric/);
    }
  });

  it('rejects a run that is not a positive integer', () => {
    for (const bad of ['0', '-1', 'one', '1.5']) {
      expect(validateRecording({...ready, run: bad}).errors)
          .toEqual({run: 'Run must be a positive integer'});
    }
  });

  it('validates rows independently in validateManifest', () => {
    let manifest = seed(twoFiles);
    manifest = updateRecording(manifest, 'rec-1',
        {participant: '001', task: 'rest'});
    manifest = updateRecording(manifest, 'rec-2', {participant: '001'});
    const validated = validateManifest(manifest);
    expect(validated.recordings.map((r) => r.ready)).toEqual([true, false]);
    expect(validated).toMatchObject({totalCount: 2, readyCount: 1});
  });
});

describe('bulkAssign', () => {
  it('changes only the supplied fields on the selected rows', () => {
    let manifest = seed([...twoFiles, {path: '/c.edf'}]);
    manifest = updateRecording(manifest, 'rec-1', {run: '2'});
    const next = bulkAssign(manifest, ['rec-1', 'rec-2'], {task: 'rest'});
    expect(next.recordings.map((r) => [r.task, r.run]))
        .toEqual([['rest', '2'], ['rest', ''], ['', '']]);
    expect(manifest.recordings[0].task).toBe('');
  });
});

describe('setRecordingExcluded', () => {
  it('excludes and re-includes only the named row', () => {
    const manifest = seed(twoFiles);
    const excluded = setRecordingExcluded(manifest, 'rec-1', true);
    expect(excluded.recordings.map((r) => r.excluded)).toEqual([true, false]);
    expect(setRecordingExcluded(excluded, 'rec-1', false).recordings[0]
        .excluded).toBe(false);
    expect(manifest.recordings[0].excluded).toBe(false);
  });
});

describe('renameParticipant', () => {
  const assigned = () => withParticipants('001', '001', '002');

  it('rewrites every linked recording and leaves others alone', () => {
    const before = assigned();
    const manifest = renameParticipant(before, '001', '999');
    expect(manifest.recordings.map((r) => r.participant))
        .toEqual(['999', '999', '002']);
    expect(before.recordings[0].participant).toBe('001');
  });

  it('merges when renamed onto an existing participant id', () => {
    const manifest = renameParticipant(assigned(), '001', '002');
    expect(getParticipants(manifest)).toHaveLength(1);
  });

  it('returns the same manifest for a blank or unchanged target', () => {
    // The workbench relies on the identical object to skip a re-render.
    const before = assigned();
    expect(renameParticipant(before, '001', '   ')).toBe(before);
    expect(renameParticipant(before, '001', '001')).toBe(before);
  });

  it('moves demographics, keeping the target values on a merge', () => {
    let manifest = updateDemographics(assigned(), '001', {age: '30'});
    expect(renameParticipant(manifest, '001', '999').demographics)
        .toEqual({999: {age: '30', sex: '', handedness: ''}});
    manifest = updateDemographics(manifest, '002', {age: '40'});
    expect(renameParticipant(manifest, '001', '002').demographics)
        .toEqual({'002': {age: '40', sex: '', handedness: ''}});
  });
});

describe('participants and demographics', () => {
  it('lists assigned participants in first-seen order with links', () => {
    const manifest = withParticipants('002', '001', '002', '');
    const people = getParticipants(manifest);
    expect(people.map((p) => [p.participant, p.recordingIds]))
        .toEqual([['002', ['rec-1', 'rec-3']], ['001', ['rec-2']]]);
    expect(people[0].demographics)
        .toEqual({age: '', sex: '', handedness: ''});
  });

  it('stores merged demographic edits apart from recording rows', () => {
    let manifest = updateDemographics(withParticipants('001'), '001',
        {age: '30'});
    manifest = updateDemographics(manifest, '001', {sex: 'M'});
    expect(getParticipants(manifest)[0].demographics)
        .toEqual({age: '30', sex: 'M', handedness: ''});
    expect(manifest.recordings[0]).not.toHaveProperty('age');
  });

  it('flags labels differing only by sub- prefix or case', () => {
    expect(findParticipantConflicts(
        withParticipants('sub-01', '01', 'Sub-01', '02')))
        .toEqual([['sub-01', '01', 'Sub-01']]);
    expect(findParticipantConflicts(withParticipants('01', '02')))
        .toEqual([]);
  });
});

describe('toManifest', () => {
  it('exports participants and validated recordings', () => {
    let manifest = bulkAssign(seed(twoFiles), ['rec-1', 'rec-2'],
        {participant: '001', task: 'rest'});
    manifest = updateDemographics(manifest, '001', {age: '27'});
    const out = toManifest(manifest);
    expect(out.participants).toEqual([{
      participant: '001',
      recordingCount: 2,
      demographics: {age: '27', sex: '', handedness: ''},
    }]);
    expect(out).toMatchObject({totalCount: 2, readyCount: 2, ready: true});
    expect(out.recordings[0]).toMatchObject({ready: true, errors: {}});

    const partial = toManifest(updateRecording(manifest, 'rec-2', {task: ''}));
    expect(partial).toMatchObject({readyCount: 1, ready: false});
    expect(toManifest(createManifest()).ready).toBe(false);
  });
});
