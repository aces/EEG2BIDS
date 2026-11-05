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
});
