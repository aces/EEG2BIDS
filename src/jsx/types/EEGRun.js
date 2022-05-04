/**
 * EEGRun - the EEG Run type
 */
class EEGRun {
  eegFile = null;
  eegBIDSBasename = null;

  eventFile = null;
  annotationsTSV = null;
  annotationsJSON = null;

  eventErrors = null;
  annotationsTSVErrors = null;
  annotationsJSONErrors = null;

  task = null;
  run = null;
}

export default EEGRun;
