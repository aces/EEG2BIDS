import {eventMatchesRecording} from './recordingFiles';

const pass = (message) => ({kind: 'pass', message});
const warning = (message) => ({kind: 'warning', message});
const error = (message) => ({kind: 'error', message});

/**
 * Decide what the conversion review displays from a single form snapshot.
 * Only the LORIS lookup error lives outside the form: it is a response to
 * credentials/participant lookup, not a user-editable field.
 * @param {object} form
 * @param {string} participantLookupError
 * @return {object}
 */
export const buildConversionReview = (form, participantLookupError = '') => {
  const data = [];
  const recordingFiles = form.recordingData?.files ?? [];
  if (form.recordingData?.error) {
    data.push(error(form.recordingData.error));
  } else if (recordingFiles.length) {
    data.push(pass('Recording file(s): ' +
      recordingFiles.map((file) => file.name).join(', ')));
  } else {
    data.push(error('No recording file selected'));
  }

  data.push(form.modality ? pass(`Modality: ${form.modality}`) :
    error('No modality selected'));
  data.push(pass(`Output format: ${form.outputFormat === 'auto' ?
    'Auto (keep source, EDF when converting)' : form.outputFormat}`));

  if (!form.eventFiles?.length) {
    data.push(warning('No events.tsv selected (for additional events)'));
  } else if (form.invalidEventFiles?.length) {
    data.push(error(`Event file(s) ${form.invalidEventFiles.join(', ')} ` +
      'are not valid TSV file(s).'));
  } else {
    const unmatched = form.eventFiles.findLast((eventFile) =>
      !recordingFiles.some((recording) =>
        eventMatchesRecording(eventFile, recording)));
    data.push(unmatched ?
      error(`Event file ${unmatched.name} is not matching any ` +
        'recording file names.') :
      pass('Event file(s): ' + form.eventFiles.map((file) => file.name)
          .join(', ')));
  }

  data.push(form.bidsDirectory ?
    pass('BIDS output directory: ' + form.bidsDirectory) :
    error('No BIDS output folder selected'));
  data.push(typeof form.LORIScompliant === 'boolean' ?
    pass(`Data loaded in LORIS: ${form.LORIScompliant}`) :
    error('Select if the data will be loaded into LORIS.'));

  const required = (value, label) => value ?
    pass(`${label}: ${value}`) : error(`${label} is not specified`);
  const details = [required(form.taskName, 'Task Name')];
  if (form.LORIScompliant) {
    details.push(required(form.siteID, 'Site'));
    details.push(required(form.projectID, 'Project'));
    details.push(required(form.subprojectID, 'Subproject'));
  }
  details.push(form.session ?
    (/[ -]/.test(form.session) ? error('Session is containing a dash/space.') :
      pass(`Session: ${form.session}`)) : error('Session is not specified'));
  details.push(form.lineFreq ?
    pass(`Powerline Frequency: ${form.lineFreq}`) :
    warning('Powerline frequency is not specified'));
  details.push(required(form.reference, 'Reference'));

  const participant = form.participantEntryMode === 'existing_loris' ? [
    required(form.participantPSCID, 'LORIS PSCID'),
    participantLookupError ? error(participantLookupError) :
      required(form.participantCandID, 'LORIS DCCID'),
  ] : [required(form.participantID, 'Participant ID')];

  const parameters = [];
  if (!form.bidsMetadata) {
    parameters.push(warning('No EEG Parameter metadata file selected'));
  } else if (form.invalidBidsMetadataFile?.length) {
    parameters.push(error('EEG Parameter metadata file(s) ' +
      form.invalidBidsMetadataFile.join(', ') +
      ' are not valid JSON file(s).'));
  } else if (form.bidsMetadata.error) {
    parameters.push(warning(form.bidsMetadata.error));
  } else {
    const {metadata, ignored_keys: ignoredKeys} = form.bidsMetadata;
    if (!metadata || !Array.isArray(ignoredKeys) ||
        !Object.keys(metadata).length) {
      parameters.push(warning('An error occurred while processing ' +
        'the recording parameters file selected.'));
    } else {
      Object.entries(metadata).forEach(([key, value]) => {
        const text = `${key}: ${typeof value === 'object' ?
          JSON.stringify(value) : value}`;
        parameters.push(ignoredKeys.includes(key) ? warning(text) :
          {kind: 'plain', message: text});
      });
      if (ignoredKeys.length) {
        parameters.push(warning('Note: invalid or extra parameters, as well ' +
          'as parameters with empty values are ignored.'));
      }
    }
  }

  const sections = {data, details, participant, parameters};
  return {
    sections,
    hasError: Object.values(sections).some((statuses) =>
      statuses.some((status) => status.kind === 'error')),
  };
};
