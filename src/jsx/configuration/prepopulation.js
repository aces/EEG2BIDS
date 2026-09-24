const FIELD_MAP = {
  Project: 'projectID',
  Subproject: 'subprojectID',
  Visit: 'session',
  Site: 'siteID',
  LineFrequency: 'lineFreq',
  Reference: 'reference',
  RecordingType: 'recordingType',
};

/**
 * Extract usable form values from a parameter file response.
 * @param {object} prepopulation
 * @return {object}
 */
export const formValues = (prepopulation) => Object.fromEntries(
    Object.entries(FIELD_MAP)
        .filter(([parameter]) => prepopulation[parameter] !== undefined &&
          prepopulation[parameter] !== null && prepopulation[parameter] !== '')
        .map(([parameter, field]) => [field, prepopulation[parameter]]),
);
