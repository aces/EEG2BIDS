import {describe, expect, it} from 'vitest';
import {buildConversionRequest} from './conversionRequest';

// Mirrors Configuration's initial state, which is copied into the task on
// mount, so the getter below behaves like AppContext.getFromTask.
const requiredTask = {
  recordingData: {files: [{path: '/data/rest.edf', name: 'rest.edf'}]},
  eventFiles: [],
  anonymize: false,
};

const requestFor = (overrides = {}) => {
  const task = {...requiredTask, ...overrides};
  return buildConversionRequest(
      (key) => task[key] ?? '',
      {eegRuns: [], preparedBy: 'Tester'},
  );
};

describe('buildConversionRequest anonymization', () => {
  it('sends enabled anonymization to the backend', () => {
    expect(requestFor({anonymize: true}).anonymize).toBe(true);
  });

  it('sends disabled anonymization when the toggle is untouched', () => {
    expect(requestFor().anonymize).toBe(false);
  });
});
