import {describe, expect, it} from 'vitest';
import {initialState} from '../configuration/initialState';
import {buildConversionRequest} from './conversionRequest';

const requestFor = (overrides = {}) => buildConversionRequest({
  ...initialState,
  recordingData: {files: [{path: '/data/rest.edf', name: 'rest.edf'}]},
  ...overrides,
}, 'Tester');

describe('buildConversionRequest', () => {
  it('sends the current anonymization choice', () => {
    expect(requestFor({anonymize: true}).anonymize).toBe(true);
    expect(requestFor().anonymize).toBe(false);
  });

  it('pairs current events with recordings when submitting', () => {
    const request = requestFor({
      recordingData: {files: [{
        path: '/data/rest.edf', name: 'sub-01_task-rest_eeg.edf',
      }]},
      eventFiles: [{
        path: '/data/events.tsv', name: 'sub-01_task-rest_events.tsv',
      }],
    });
    expect(request.eegRuns).toEqual([{
      recordingFile: '/data/rest.edf', eventFile: '/data/events.tsv',
    }]);
  });
});
