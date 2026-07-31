import {describe, expect, it} from 'vitest';
import {buildConversionRequest} from './conversionRequest';

const requiredTask = {
  recordingData: {files: [{path: '/data/rest.edf', name: 'rest.edf'}]},
  eventFiles: [],
};

const requestFor = (overrides = {}) => {
  const task = {...requiredTask, ...overrides};
  return buildConversionRequest(
      (key) => task[key],
      {eegRuns: [], preparedBy: 'Tester'},
  );
};

describe('buildConversionRequest anonymization', () => {
  it('sends enabled anonymization to the backend', () => {
    expect(requestFor({anonymize: true}).anonymize).toBe(true);
  });

  it('defaults anonymization off when the toggle has not been set', () => {
    expect(requestFor().anonymize).toBe(false);
  });
});
