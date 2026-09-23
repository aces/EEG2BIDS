/**
 * Build the backend conversion request from renderer task state.
 *
 * Keeping this translation pure makes the UI/backend contract independently
 * testable without mounting the full Configuration component.
 *
 * @param {function(string): *} getFromTask read one task value
 * @param {{eegRuns: Array, preparedBy: string}} options local UI values
 * @return {object} backend recording_to_bids payload
 */
export const buildConversionRequest = (
    getFromTask, {eegRuns = [], preparedBy = ''} = {}) => ({
  recordingData: getFromTask('recordingData'),
  eegRuns,
  modality: getFromTask('modality'),
  outputFormat: getFromTask('outputFormat'),
  anonymize: getFromTask('anonymize'),
  bids_directory: getFromTask('bidsDirectory'),
  read_only: false,
  event_files: getFromTask('eventFiles')?.[0]?.path ?? '',
  bidsMetadata: getFromTask('bidsMetadata'),
  site_id: getFromTask('siteID'),
  project_id: getFromTask('projectID'),
  sub_project_id: getFromTask('subprojectID'),
  session: getFromTask('session'),
  participantID: getFromTask('participantID'),
  age: getFromTask('participantAge'),
  hand: getFromTask('participantHand'),
  sex: getFromTask('participantSex'),
  preparedBy,
  line_freq: getFromTask('lineFreq') || 'n/a',
  recording_type: getFromTask('recordingType'),
  taskName: getFromTask('taskName'),
  reference: getFromTask('reference'),
  subject_id: getFromTask('subject_id'),
});
