import {describe, expect, it} from 'vitest';
import {
  buildRuns, eventMatchesRecording, isJSON, isTSV,
} from './recordingFiles';

describe('recording file preparation', () => {
  it('pairs an events file with only one matching recording', () => {
    const recordings = [
      {name: 'sub-01_task-rest_eeg.edf', path: '/first.edf'},
      {name: 'sub-01_task-rest_eeg.set', path: '/second.set'},
    ];
    const events = [{name: 'sub-01_task-rest_events.tsv', path: '/events.tsv'}];

    expect(buildRuns(recordings, events)).toEqual([
      {recordingFile: '/first.edf', eventFile: '/events.tsv'},
      {recordingFile: '/second.set', eventFile: null},
    ]);
    expect(events).toHaveLength(1);
  });

  it('recognizes recording names and rejects malformed JSON', () => {
    expect(eventMatchesRecording(
        {name: 'sub-01_task-rest_events.tsv'},
        {name: 'sub-01_task-rest_ieeg.edf'},
    )).toBe(true);
    expect(isJSON('{')).toBe(false);
    expect(isTSV('onset\tduration\n0\t1')).toBe(true);
  });
});
