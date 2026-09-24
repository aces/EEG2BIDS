import {buildRuns} from '../configuration/recordingFiles';

/**
 * Translate the reviewed form snapshot into a backend conversion request.
 * The same snapshot determines readiness and submission; the task store is
 * only used by screens outside the conversion form.
 *
 * @param {object} form current conversion form values
 * @param {string} preparedBy name of the person performing conversion
 * @return {object} backend recording_to_bids payload
 */
export const buildConversionRequest = (form, preparedBy) => ({
  recordingData: form.recordingData,
  eegRuns: buildRuns(form.recordingData?.files ?? [], form.eventFiles ?? []),
  modality: form.modality,
  outputFormat: form.outputFormat,
  anonymize: form.anonymize,
  bids_directory: form.bidsDirectory,
  bidsMetadata: form.bidsMetadata,
  site_id: form.siteID,
  project_id: form.projectID,
  sub_project_id: form.subprojectID,
  session: form.session,
  participantID: form.participantID,
  age: form.participantAge,
  hand: form.participantHand,
  sex: form.participantSex,
  preparedBy,
  line_freq: form.lineFreq || 'n/a',
  recording_type: form.recordingType,
  taskName: form.taskName,
  reference: form.reference,
});
