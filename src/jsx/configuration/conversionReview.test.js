import {describe, expect, it} from 'vitest';
import {buildConversionReview} from './conversionReview';
import {initialState} from './initialState';

const readyForm = {
  ...initialState,
  recordingData: {files: [{name: 'sub-01_task-rest_eeg.edf'}]},
  bidsDirectory: '/out',
  LORIScompliant: false,
  participantEntryMode: 'manual',
  participantID: '01',
  session: '01',
  taskName: 'rest',
  reference: 'n/a',
};

describe('conversion review', () => {
  it('derives readiness from the form snapshot', () => {
    const review = buildConversionReview(readyForm);
    expect(review.hasError).toBe(false);
    expect(review.sections.details).toContainEqual({
      kind: 'pass', message: 'Task Name: rest',
    });
    expect(buildConversionReview({...readyForm, taskName: ''}).hasError)
        .toBe(true);
  });

  it('blocks unmatched events and a failed LORIS lookup', () => {
    const unmatched = buildConversionReview({
      ...readyForm,
      eventFiles: [{name: 'other_events.tsv'}],
    });
    expect(unmatched.hasError).toBe(true);
    expect(unmatched.sections.data.some((status) => status.kind === 'error'))
        .toBe(true);

    const lookup = buildConversionReview({
      ...readyForm,
      participantEntryMode: 'existing_loris',
      participantPSCID: 'P1',
      participantCandID: '42',
    }, 'Candidate not found');
    expect(lookup.hasError).toBe(true);
    expect(lookup.sections.participant).toContainEqual({
      kind: 'error', message: 'Candidate not found',
    });
  });

  it('shows ignored metadata as a warning without blocking submission', () => {
    const review = buildConversionReview({
      ...readyForm,
      bidsMetadata: {
        metadata: {TaskDescription: '', InstitutionName: 'Lab'},
        ignored_keys: ['TaskDescription'],
      },
    });
    expect(review.hasError).toBe(false);
    expect(review.sections.parameters[0]).toEqual({
      kind: 'warning', message: 'TaskDescription: ',
    });
  });
});
