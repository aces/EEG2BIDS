import React, {useContext} from 'react';
import {AppContext} from '../../context';
import {
  FileInput,
} from '../elements/inputs';

/**
 * Recording Metadata - the Recording Metadata component.
 * @param {object} props
 * @return {JSX.Element}
 */
const RecordingMetadata = (props) => {
  const {state, setState} = useContext(AppContext);

  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string|boolean} value - element value
   */
  const onUserInput = (name, value) => {
    if (name in state) {
      setState({[name]: value});
    }
  };

  return (
    <>
      <span className='header'>
        Recording metadata
        <div className='header-hint'>
          ⓘ For details please see BIDS specification
        </div>
      </span>
      <div className='info'>
        <small>Annotation and events file names
        must match one of the EDF file names.</small>
      </div>
      <div className='container'>
        <div className='info half'>
          <div className='small-pad'>
            <FileInput id='bidsMetadataFile'
              name='bidsMetadataFile'
              accept='.json'
              placeholder={
                state.bidsMetadataFile?.map(
                    (bidsMetadataFile) => bidsMetadataFile['name'],
                ).join(', ')
              }
              label='Recording Parameters (json)'
              onUserInput={onUserInput}
              help='Used to contribute non-required fields to *.json BIDS
              parameter file. See BIDS spec and template available with
              this release. Blank fields ignored.'
            />
          </div>
          <div className='small-pad'>
            <FileInput id='annotationsJSON'
              name='annotationsJSON'
              multiple={true}
              accept='.json'
              placeholder={
                state.annotationsJSON?.map(
                    (annotationJSON) => annotationJSON['name'],
                ).join(', ')
              }
              label='annotations.json'
              onUserInput={onUserInput}
              help='Labels for Annotations, compliant with BIDS spec.
              One file per task/run. Filename must be formatted correctly.'
            />
          </div>
        </div>
        <div className='info half'>
          <div className='small-pad'>
            <FileInput id='eventFiles'
              name='eventFiles'
              multiple={true}
              accept='.tsv'
              placeholder={
                state.eventFiles?.map(
                    (eventFile) => eventFile['name'],
                ).join(', ')
              }
              label='events.tsv (additional)'
              onUserInput={onUserInput}
              help='Additional events only. Events embedded in
              the EDF Annotations signal are automatically extracted.'
            />
          </div>
          <div className='small-pad'>
            <FileInput id='annotationsTSV'
              name='annotationsTSV'
              multiple={true}
              accept='.tsv'
              placeholder={
                state.annotationsTSV?.map(
                    (annotationTSV) => annotationTSV['name'],
                ).join(', ')
              }
              label='annotations.tsv'
              onUserInput={onUserInput}
              help='Annotation data: time, label, etc compliant
              with BIDS spec. One file per task/run.
              Filename must be formatted correctly.'
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default RecordingMetadata;
