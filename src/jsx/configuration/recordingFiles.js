import Papa from 'papaparse';

/**
 * Match an optional events TSV to the recording it accompanies.
 * @param {object} eventFile
 * @param {object} recordingFile
 * @return {boolean}
 */
export const eventMatchesRecording = (eventFile, recordingFile) => {
  const recordingName = recordingFile.name.toLowerCase();
  const eventStem = eventFile.name.toLowerCase()
      .replace('_events.tsv', '').replace('.tsv', '');
  return eventStem === recordingName.replace(/_i?eeg\.(edf|set)/i, '')
      .replace(/\.(edf|set)/i, '') ||
    eventStem === recordingName.replace(/\.(edf|set)/i, '');
};

export const invalidFiles = async (files, isValid) => {
  const results = await Promise.all(files.map(
      async (file) => (isValid(await file.text()) ? null : file.name),
  ));
  return results.filter(Boolean);
};

export const isJSON = (text) => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

export const isTSV = (text) =>
  Papa.parse(text, {quoteChar: ''}).errors.length === 0;

/**
 * Assign each events file to at most one recording.
 * @param {object[]} recordingFiles
 * @param {object[]} selectedEventFiles
 * @return {object[]}
 */
export const buildRuns = (recordingFiles, selectedEventFiles) => {
  const availableEvents = [...selectedEventFiles];
  return recordingFiles.map((recordingFile) => {
    const run = {recordingFile: recordingFile.path, eventFile: null};
    const eventIndex = availableEvents.findIndex(
        (eventFile) => eventMatchesRecording(eventFile, recordingFile),
    );
    if (eventIndex > -1) {
      run.eventFile = availableEvents[eventIndex].path;
      availableEvents.splice(eventIndex, 1);
    }
    return run;
  });
};
