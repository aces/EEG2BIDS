import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import styles from '../css/Converter.module.css';

// Display Loading, Success, Error
import Modal from './elements/modal';
import {TextInput} from './elements/inputs';

// Socket.io
import {SocketContext} from './socket.io';

/**
 * Converter - the EDF to BIDS component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Converter = (props) => {
  const [preparedBy, setPreparedBy] = useState('');

  // React Context
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  // React State
  const [outputTime, setOutputTime] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalText, setModalText] = useState({
    mode: 'loading',
    title: {
      loading: '⏱ Task in Progress!',
      success: '⭐ Task Finished!',
      error: '❌ Task Error!',
    },
    message: {
      loading: <span style={{padding: '40px'}}>
        <span className={styles['bids-loading']}>
            BIDS creation in progress<span>.</span><span>.</span><span>.</span>
            😴
        </span>
      </span>,
      success: <span style={{padding: '40px'}}>
        <span className={styles['bids-success']}>
          <span className={styles.checkmark}>
            &#x2714;
          </span> Success creating BIDS!
        </span></span>,
      error: '',
    },
  });

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    // if (socketContext) {}
  }, [socketContext]);


  /**
   * beginBidsCreation - create BIDS format.
   *   Sent by socket to python: edf_to_bids.
   */
  const beginBidsCreation = () => {
    setModalText((prevState) => {
      return {...prevState, ['mode']: 'loading'};
    });
    setModalVisible(true);

    if (appContext.getFromTask('edfData')?.['files'].length > 0) {
      socketContext.emit('edf_to_bids', {
        edfData: appContext.getFromTask('edfData') ?? [],
        modality: appContext.getFromTask('modality') ?? 'ieeg',
        bids_directory: appContext.getFromTask('bidsDirectory') ?? '',
        read_only: false,
        events_tsv: appContext.getFromTask('eventsTSV').length > 0 ?
          appContext.getFromTask('eventsTSV')[0]['path'] : '',
        annotations_tsv: appContext.getFromTask('annotationsTSV').length > 0 ?
          appContext.getFromTask('annotationsTSV')[0]['path'] : '',
        annotations_json: appContext.getFromTask('annotationsJSON').length > 0 ?
          appContext.getFromTask('annotationsJSON')[0]['path'] : '',
        bidsMetadata: appContext.getFromTask('bidsMetadata') ?? '',
        site_id: appContext.getFromTask('siteID') ?? '',
        project_id: appContext.getFromTask('projectID') ?? '',
        sub_project_id: appContext.getFromTask('subprojectID') ?? '',
        session: appContext.getFromTask('session') ?? '',
        participantID: appContext.getFromTask('participantID') ?? '',
        age: appContext.getFromTask('participantAge') ?? '',
        hand: appContext.getFromTask('participantHand') ?? '',
        sex: appContext.getFromTask('participantSex') ?? '',
        preparedBy: preparedBy ?? '',
        line_freq: appContext.getFromTask('lineFreq') || 'n/a',
        software_filters: appContext.getFromTask('softwareFilters') ?? 'n/a',
        recording_type: appContext.getFromTask('recordingType') ?? 'n/a',
        taskName: appContext.getFromTask('taskName') ?? '',
        reference: appContext.getFromTask('reference') ?? '',
        subject_id: appContext.getFromTask('subject_id') ?? '',
      });
    }
  };

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    if (outputTime) {
      // cleanup time display for user.
      let time = outputTime.replace('output-', '');
      time = time.slice(0, time.lastIndexOf('-')) + ' ' +
        time.slice(time.lastIndexOf('-')+1);
      setSuccessMessage(<>
        <a className={styles['task-finished']}>Last created at: {time}</a>
      </>);
    }
  }, [outputTime]);

  /**
   * hideModal - display Modal.
   * @param {boolean} hidden
   */
  const hideModal = (hidden) => {
    setModalVisible(!hidden);
  };

  useEffect(() => {
    if (socketContext) {
      socketContext.on('bids', (message) => {
        if (message['output_time']) {
          setOutputTime(message['output_time']);
          appContext.setTask('output_time', message['output_time']);
          setModalText((prevState) => {
            return {...prevState, ['mode']: 'success'};
          });
        } else if (message['error']) {
          setModalText((prevState) => {
            prevState.message['error'] = (
              <div className={styles['bids-errors']}>
                {message['error'].map((error, i) =>
                  <span key={i}>{error}<br/></span>)}
              </div>
            );
            return {...prevState, ['mode']: 'error'};
          });
        }
      });
    }
  }, [socketContext]);

  let error = false;
  const metadataReport = [];
  if (appContext.getFromTask('bidsMetadata')) {
    if (
      'metadata' in appContext.getFromTask('bidsMetadata') &&
      'invalid_keys' in appContext.getFromTask('bidsMetadata')
    ) {
      const metadata = appContext.getFromTask('bidsMetadata')['metadata'];
      const invalidKeys =
        appContext.getFromTask('bidsMetadata')['invalid_keys'];

      Object.keys(metadata).map((key) => {
        metadataReport.push(
            <div key={key}>
              {invalidKeys.indexOf(key) > -1 ?
                <>
                  <span className={styles.warning}>&#x26A0;</span>
                  {key}: {metadata[key]}
                </> :
                <>
                  {key}: {metadata[key]}
                </>
              }
            </div>,
        );
      });
      metadataReport.push(
          <p key="message">
            <span className={styles.warning}>&#x26A0;</span>
            Invalid keys for the selected modality will be ignored.
          </p>,
      );
    } else if ('error' in appContext.getFromTask('bidsMetadata')) {
      metadataReport.push(
          <div key="error ">
            <span className={styles.warning}>&#x26A0;</span>
            {appContext.getFromTask('bidsMetadata')['error']}
          </div>,
      );
    }
  }

  /**
   * Renders the React component.
   *
   * @param {string} _
   * @param {string} value
   *
   * @return {JSX.Element} - React markup for component.
   */
  return props.visible ? (
    <>
      <span className='header'>
        EDF to BIDS format
      </span>
      <div className='info report'>
        <div className='small-pad'>
          <b>Review your data configuration:</b>
          <div>
            {appContext.getFromTask('edfData')?.['error'] ?
              <div>
                {error = true}
                <span className={styles.error}>&#x274C;</span>
                {appContext.getFromTask('edfData')['error']}
              </div> :
              appContext.getFromTask('edfData') &&
              appContext.getFromTask('edfData')?.['files']?.length > 0 ?
                <>
                  <span className={styles.checkmark}>&#x2714;</span>
                  EDF data file(s):&nbsp;
                  {appContext.getFromTask('edfData')['files']
                      .map((edfFile) => edfFile['name']).join(', ')
                  }
                </> :
                <>
                  {error = true}
                  <span className={styles.error}>
                    &#x274C;
                  </span> No EDF file selected.
                </>
            }
          </div>
          <div>
            {(appContext.getFromTask('eventsTSV') &&
              Object.keys(appContext.getFromTask('eventsTSV'))
                  .length > 0) ?
              <>
                <span className={styles.checkmark}>&#x2714;</span> Including:
                {appContext.getFromTask('eventsTSV').name}
              </> :
              <>
                <span className={styles.warning}>&#x26A0;</span>
                No events.tsv selected.
              </>
            }
          </div>
          <div>
            {appContext.getFromTask('bidsDirectory') ?
              <>
                <span className={styles.checkmark}>&#x2714;</span>
                BIDS output directory:
                {appContext.getFromTask('bidsDirectory')}
              </> :
              <>
                {error = true}
                <span className={styles.error}>&#x274C;</span>
                No BIDS output directory selected.
              </>
            }
          </div>
        </div>
        <div className='small-pad'>
          <b>Review your recording details:</b>
          <div>
            {appContext.getFromTask('taskName') ?
              <>
                <span className={styles.checkmark}>&#x2714;</span>
                Task name: {appContext.getFromTask('taskName')}
              </> :
              <>
                {error = true}
                <span className={styles.error}>&#x274C;</span>
                Task name is not specified.
              </>
            }
          </div>
          <div>
            {appContext.getFromTask('siteID') ?
              <>
                <span className={styles.checkmark}>&#x2714;</span>
                Site: {appContext.getFromTask('siteID')}
              </> :
              <>
                {appContext.getFromTask('LORIScompliant') ?
                  <>
                    {error = true}
                    <span className={styles.error}>&#x274C;</span>
                    Site is not specified.
                  </> :
                  <span>Site is not specified.</span>
                }
              </>
            }
          </div>
          <div>
            {appContext.getFromTask('projectID') ?
              <>
                <span className={styles.checkmark}>&#x2714;</span>
                Project: {appContext.getFromTask('projectID')}
              </> :
              <>
                {appContext.getFromTask('LORIScompliant') ?
                  <>
                    {error = true}
                    <span className={styles.error}>&#x274C;</span>
                    Project is not specified.
                  </> :
                  <span>
                    Project is not specified.
                  </span>
                }
              </>
            }
          </div>
          <div>
            {appContext.getFromTask('subprojectID') ?
              <>
                <span className={styles.checkmark}>&#x2714;</span>
                SubProject: {appContext.getFromTask('subprojectID')}
              </> :
              <>
                {appContext.getFromTask('LORIScompliant') ?
                  <>
                    <>
                      {error = true}
                      <span className={styles.error}>&#x274C;</span>
                      Subproject is not specified.
                    </>
                  </> :
                  <span>
                    Subproject is not specified.
                  </span>
                }
              </>
            }
          </div>
          <div>
            {appContext.getFromTask('session') ?
              <>
                {appContext.getFromTask('session').indexOf(' ') >= 0 ||
                appContext.getFromTask('session').indexOf('-') >= 0 ?
                  <>
                    {error = true}
                    <span className={styles.error}>&#x274C;</span>
                    Session is containing a dash/space.
                  </> :
                  <>
                    <span className={styles.checkmark}>&#x2714;</span>
                    Session: {appContext.getFromTask('session')}
                  </>
                }
              </> :
              <>
                {error = true}
                <span className={styles.error}>&#x274C;</span>
                Session is not specified.
              </>
            }
          </div>
          <div>
            {appContext.getFromTask('lineFreq') ?
              <>
                <span className={styles.checkmark}>&#x2714;</span>
                Powerline frequency: {appContext.getFromTask('lineFreq')}
              </> :
              <>
                <span className={styles.warning}>&#x26A0;</span>
                Powerline frequency is not specified.
              </>
            }
          </div>
          <div>
            {appContext.getFromTask('reference') ?
              <>
                <span className={styles.checkmark}>&#x2714;</span>
                Reference: {appContext.getFromTask('reference')}
              </> :
              <>
                {error = true}
                <span className={styles.error}>&#x274C;</span>
                Reference is not specified.
              </>
            }
          </div>
        </div>
        <div className='small-pad'>
          <b>Review your participant details:</b>
          <div>
            {appContext.getFromTask('participantCandID')?.error ?
              <>
                {error = true}
                <span className={styles.error}>&#x274C;</span>
                {appContext.getFromTask('participantCandID').error}
              </> :
              <>
                {appContext.getFromTask('participantCandID') &&
                  <>
                    <span className={styles.checkmark}>&#x2714;</span>
                    LORIS CandID: {appContext.getFromTask(
                        'participantCandID',
                    )}
                  </>
                }
              </>
            }
          </div>
          <div>
            {appContext.getFromTask('participantID') ?
              <>
                <span className={styles.checkmark}>&#x2714;</span>
                Participant ID: {appContext.getFromTask('participantID')}
              </> :
              <>
                {error = true}
                <>
                  <span className={styles.error}>&#x274C;</span>
                  Participant ID is not specified.
                </>
              </>
            }
          </div>
        </div>
        <div className='small-pad'>
          <b>Review your uploaded EEG Parameter metadata:</b>
          <div>
            {metadataReport.length > 0 ?
              <>
                {metadataReport}
              </> :
              <>
                <span className={styles.warning}>&#x26A0;</span>
                No EEG Parameter metadata file selected.
              </>
            }
          </div>
        </div>
        <div className='small-pad'>
          <b>Verify anonymization of EDF header data:</b>
          <div>
            {appContext.getFromTask('subjectID') ?
              <>
                Subject ID:&nbsp;
                {appContext.getFromTask('subjectID')}
              </> :
              <>
                <span className={styles.warning}>&#x26A0;</span>
                Subject ID is not modified.
              </>
            }
          </div>
          {appContext.getFromTask('recording_id') &&
            <div>
              Recording ID:&nbsp;
              {appContext.getFromTask('recording_id')}
            </div>
          }
          {appContext.getFromTask('edfData')?.['date'] &&
            <div>
              Recording Date:&nbsp;
              {new Intl.DateTimeFormat(
                  'en-US',
                  {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                  },
              ).format(appContext.getFromTask('edfData')['date'])}
            </div>
          }
        </div>

        {error ?
          <div className="alert alert-danger" role="alert">
            &#x274C; Please correct the above errors.
          </div> :
          <div className="alert alert-success" role="alert">
            &#x2714; Ready to proceed
          </div>
        }

        <hr/>

        <div className='small-pad'>
          <TextInput id='preparedBy'
            name='preparedBy'
            required={true}
            label='Prepared by'
            value={preparedBy}
            placeholder='Enter your name'
            onUserInput={(_, value) => setPreparedBy(value)}
          />
          {!preparedBy &&
            <div>
              <span className={styles.error}>&#x274C;</span>
              Please enter your name for verification tracking purposes.
            </div>
          }
        </div>
        <div className='small-pad convert-bids-row'>
          <input type='button'
            className='start_task primary-btn'
            onClick={beginBidsCreation}
            value='Convert to BIDS'
            disabled={error || !preparedBy}
          />
          {successMessage}
        </div>
      </div>
      <Modal
        title={modalText.title[modalText.mode]}
        show={modalVisible}
        close={hideModal}
        width='500px'
      >
        {modalText.message[modalText.mode]}
      </Modal>
    </>
  ) : null;
};
Converter.propTypes = {
  visible: PropTypes.bool,
};

export default Converter;
