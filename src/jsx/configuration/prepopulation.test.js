import {expect, it} from 'vitest';
import {formValues} from './prepopulation';

it('maps known nonempty fields, ignoring unknown ones', () => {
  expect(formValues({
    Project: 'study',
    Visit: '',
    LineFrequency: 0,
    Reference: null,
    Unknown: 'unused',
  })).toEqual({projectID: 'study', lineFreq: 0});
});
