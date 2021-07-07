/**
 * EEGRun - the EEG Run type
 */
class EEGRun {
  edfFile = null;
  edfBIDSBasename = null;

  eventFile = null;
  annotationsTSV = null;
  annotationsJSON = null;

  eventErrors = null;
  annotationsTSVErrors = null;
  annotationsJSONErrors = null;
}

export default EEGRun;
