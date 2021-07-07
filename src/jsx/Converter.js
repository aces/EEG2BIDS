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
        event_files: appContext.getFromTask('eventFiles').length > 0 ?
          appContext.getFromTask('eventFiles')[0]['path'] : '',
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
  const formatError = (msg) => {
    error = true;
    return (
      <>
        <span className='error'>&#x274C;</span> {msg}
      </>
    );
  };

  const formatWarning = (msg) => {
    return (
      <>
        <span className='warning'>&#x26A0;</span> {msg}
      </>
    );
  };

  const formatPass = (msg) => {
    return (
      <>
        <span className='checkmark'>&#x2714;</span>
        {msg}
      </>
    );
  };

  const validateData = () => {
    const result = [];

    // edfData
    let edfDataStatus = '';
    if (appContext.getFromTask('edfData')?.['error']) {
      edfDataStatus = formatError(appContext.getFromTask('edfData')['error']);
    } else if (
      appContext.getFromTask('edfData') &&
      appContext.getFromTask('edfData')?.['files']?.length > 0
    ) {
      edfDataStatus = formatPass('EDF data file(s): ' +
        appContext.getFromTask('edfData')['files'].map(
            (edfFile) => edfFile['name'],
        ).join(', '),
      );
    } else {
      edfDataStatus = formatError('No EDF file selected.');
    }
    result.push(<div key='edfDataStatus'>{edfDataStatus}</div>);

    // Data modality
    let modalityStatus = '';
    if (appContext.getFromTask('modality')) {
      modalityStatus = formatPass(
          `Modality: ${appContext.getFromTask('modality')}`,
      );
    } else {
      modalityStatus = formatError('No modality selected.');
    }
    result.push(<div key='modalityStatus'>{modalityStatus}</div>);

    // events
    let eventsStatus = '';
    if (!appContext.getFromTask('eventFiles') ||
      Object.keys(appContext.getFromTask('eventFiles'))?.length < 1
    ) {
      eventsStatus = formatWarning('No events.tsv selected.');
    } else {
      let match = true;

      // If we have more than 1 edf files,
      // check that the events files are appropriatly named
      if (appContext.getFromTask('edfData')?.['files']?.length > 1) {
        appContext.getFromTask('eventFiles').map((eventFile) => {
          if (!appContext.getFromTask('edfData')['files'].find(
              (edfFile) => {
                const edfFileName = edfFile['name'].toLowerCase()
                    .replace(/_i?eeg\.edf/i, '').replace('.edf', '');
                const eventFileName = eventFile['name'].toLowerCase()
                    .replace('_events.tsv', '').replace('.tsv', '');
                return edfFileName === eventFileName;
              },
          )) {
            match = false;
            eventsStatus = formatError(
                `Event file ${eventFile['name']}
                is not matching any edf file names.`,
            );
          }
        });
      }

      if (match) {
        eventsStatus = formatPass('Event file(s): ' +
          appContext.getFromTask('eventFiles').map(
              (eventFile) => eventFile['name'],
          ).join(', '),
        );
      }
    }
    result.push(<div key='eventsStatus'>{eventsStatus}</div>);

    // annotations TSV
    let annotationsTSVStatus = '';
    if (!appContext.getFromTask('annotationsTSV') ||
      Object.keys(appContext.getFromTask('annotationsTSV'))?.length < 1
    ) {
      annotationsTSVStatus = formatWarning('No annotations.tsv selected.');
    } else {
      let match = true;

      // If we have more than 1 edf files,
      // check that the events files are appropriatly named
      if (appContext.getFromTask('edfData')?.['files']?.length > 1) {
        appContext.getFromTask('annotationsTSV').map((annotationsTSVFile) => {
          if (!appContext.getFromTask('edfData')['files'].find(
              (edfFile) => {
                const edfFileName = edfFile['name'].toLowerCase()
                    .replace(/_i?eeg\.edf/i, '').replace('.edf', '');
                const annotationsTSVFileName = annotationsTSVFile['name']
                    .toLowerCase()
                    .replace('_annotations.tsv', '').replace('.tsv', '');
                return edfFileName === annotationsTSVFileName;
              },
          )) {
            match = false;
            annotationsTSVStatus = formatError(
                `Annotation file ${annotationsTSVFile['name']}
                is not matching any edf file names.`,
            );
          }
        });
      }

      if (match) {
        annotationsTSVStatus = formatPass('Annotations TSV file(s): ' +
          appContext.getFromTask('annotationsTSV').map(
              (annotationsTSVFile) => annotationsTSVFile['name'],
          ).join(', '),
        );
      }
    }
    result.push(<div key='annotationsTSVStatus'>{annotationsTSVStatus}</div>);

    // annotations JSON
    let annotationsJSONStatus = '';
    if (appContext.getFromTask('annotationsTSV') &&
      Object.keys(appContext.getFromTask('annotationsTSV'))?.length > 0
    ) {
      if (!appContext.getFromTask('annotationsJSON') ||
        Object.keys(appContext.getFromTask('annotationsJSON'))?.length < 1
      ) {
        annotationsJSONStatus = formatWarning('No annotations.json selected.');
      } else {
        let match = true;

        // If we have more than 1 edf files,
        // check that the events files are appropriatly named
        if (appContext.getFromTask('edfData')?.['files']?.length > 1) {
          appContext.getFromTask('annotationsJSON')
              .map((annotationsJSONFile) => {
                if (!appContext.getFromTask('edfData')['files'].find(
                    (edfFile) => {
                      const edfFileName = edfFile['name'].toLowerCase()
                          .replace(/_i?eeg\.edf/i, '').replace('.edf', '');
                      const annotationsJSONFileName =
                          annotationsJSONFile['name'].toLowerCase()
                              .replace('_annotations.json', '')
                              .replace('.json', '');
                      return edfFileName === annotationsJSONFileName;
                    },
                )) {
                  match = false;
                  annotationsJSONStatus = formatError(
                      `Annotation file ${annotationsJSONFile['name']}
                      is not matching any edf file names.`,
                  );
                }
              });
        }

        if (match) {
          annotationsJSONStatus = formatPass('Annotations JSON file(s): ' +
            appContext.getFromTask('annotationsJSON').map(
                (annotationsJSONFile) => annotationsJSONFile['name'],
            ).join(', '),
          );
        }
      }
      result.push(
          <div key='annotationsJSONStatus'>{annotationsJSONStatus}</div>,
      );
    }

    // bidsDirectory
    let bidsDirectoryStatus = '';
    if (appContext.getFromTask('bidsDirectory')) {
      bidsDirectoryStatus = formatPass('BIDS output directory: ' +
        appContext.getFromTask('bidsDirectory'),
      );
    } else {
      bidsDirectoryStatus = formatError('No BIDS output directory selected.');
    }
    result.push(<div key='bidsDirectoryStatus'>{bidsDirectoryStatus}</div>);

    // LORIS compliant
    let LORIScompliantStatus = '';
    if (appContext.getFromTask('LORIScompliant')) {
      LORIScompliantStatus = formatPass(
          `Data loaded in LORIS: ${appContext.getFromTask('LORIScompliant')}`,
      );
    } else {
      LORIScompliantStatus = formatError(
          'Select if the data will be loaded into LORIS.',
      );
    }
    result.push(<div key='LORIScompliantStatus'>{LORIScompliantStatus}</div>);

    return result;
  };

  const validateRecordingParameters = () => {
    const result = [];

    if (!appContext.getFromTask('bidsMetadata')) {
      return formatWarning('No EEG Parameter metadata file selected.');
    }

    if ('error' in appContext.getFromTask('bidsMetadata')) {
      return formatWarning(appContext.getFromTask('bidsMetadata')['error']);
    }

    const metadata = appContext.getFromTask('bidsMetadata')?.metadata;
    const invalidKeys = appContext.getFromTask('bidsMetadata')?.invalid_keys;

    if (!metadata || !invalidKeys || metadata.length < 1) {
      return formatWarning(
          'An error occured while processing ' +
          'the recording parameters file selected.',
      );
    }

    Object.keys(metadata).map((key) => {
      if (invalidKeys.indexOf(key) > -1) {
        result.push(
            <div key={key}>
              {formatWarning(`${key}: ${metadata[key]}`)}
            </div>,
        );
      } else {
        result.push(
            <div key={key}>
              {key}: {typeof metadata[key] == 'object' ?
                JSON.stringify(metadata[key]) :
                metadata[key]
              }
            </div>,
        );
      }
    });

    result.push(
        <p key="message">
          <span className='warning'>&#x26A0;</span>
          Invalid keys for the selected modality will be ignored.
        </p>,
    );

    return result;
  };

  const validateRecordingDetails = () => {
    const result = [];

    // taskName
    let taskNameStatus = '';
    if (appContext.getFromTask('taskName')) {
      taskNameStatus = formatPass(
          `Task name: ${appContext.getFromTask('taskName')}`,
      );
    } else {
      taskNameStatus = formatError('Task name is not specified.');
    }
    result.push(<div key='taskNameStatus'>{taskNameStatus}</div>);

    if (appContext.getFromTask('LORIScompliant')) {
      // siteID
      let siteIDStatus = '';
      if (appContext.getFromTask('siteID')) {
        siteIDStatus = formatPass(
            `Site: ${appContext.getFromTask('siteID')}`,
        );
      } else {
        siteIDStatus = formatError('Site is not specified.');
      }
      result.push(<div key='siteIDStatus'>{siteIDStatus}</div>);

      // projectID
      let projectIDStatus = '';
      if (appContext.getFromTask('projectID')) {
        projectIDStatus = formatPass(
            `Project: ${appContext.getFromTask('projectID')}`,
        );
      } else {
        projectIDStatus = formatError('Project is not specified.');
      }
      result.push(<div key='projectIDStatus'>{projectIDStatus}</div>);

      // subprojectID
      let subprojectIDStatus = '';
      if (appContext.getFromTask('subprojectID')) {
        subprojectIDStatus = formatPass(
            `Subproject: ${appContext.getFromTask('subprojectID')}`,
        );
      } else {
        projectIDStatus = formatError('Subproject is not specified.');
      }
      result.push(<div key='subprojectIDStatus'>{subprojectIDStatus}</div>);
    }

    // session
    let sessionStatus = '';
    if (appContext.getFromTask('session')) {
      if (
        appContext.getFromTask('session').indexOf(' ') >= 0 ||
        appContext.getFromTask('session').indexOf('-') >= 0
      ) {
        sessionStatus = formatError('Session is containing a dash/space.');
      } else {
        sessionStatus = formatPass(
            `Session: ${appContext.getFromTask('session')}`,
        );
      }
    } else {
      sessionStatus = formatError('Session is not specified.');
    }
    result.push(<div key='sessionStatus'>{sessionStatus}</div>);

    // lineFreq
    let lineFreqStatus = '';
    if (appContext.getFromTask('lineFreq')) {
      lineFreqStatus = formatPass(
          `Powerline frequency: ${appContext.getFromTask('lineFreq')}`,
      );
    } else {
      lineFreqStatus = formatWarning('Powerline frequency is not specified.');
    }
    result.push(<div key='lineFreqStatus'>{lineFreqStatus}</div>);

    // reference
    let referenceStatus = '';
    if (appContext.getFromTask('reference')) {
      referenceStatus = formatPass(
          `Reference: ${appContext.getFromTask('reference')}`,
      );
    } else {
      referenceStatus = formatError('Reference is not specified.');
    }
    result.push(<div key='referenceStatus'>{referenceStatus}</div>);

    return result;
  };

  const validateParticipantDetails = () => {
    const result = [];

    // participantCandID
    let participantCandIDStatus = '';
    if (appContext.getFromTask('participantCandID')?.error) {
      participantCandIDStatus = formatError(
          appContext.getFromTask('participantCandID').error,
      );
    } else if (appContext.getFromTask('participantCandID')) {
      participantCandIDStatus = formatPass(
          `LORIS CandID: ${appContext.getFromTask('participantCandID')}`,
      );
    }
    result.push(
        <div key='participantCandIDStatus'>
          {participantCandIDStatus}
        </div>,
    );

    // participantID
    let participantIDStatus = '';
    if (appContext.getFromTask('participantID')) {
      participantIDStatus = formatPass(
          `Participant ID: ${appContext.getFromTask('participantID')}`,
      );
    } else {
      participantIDStatus = formatError(
          'Participant ID is not specified.',
      );
    }
    result.push(
        <div key='participantID'>{participantIDStatus}</div>,
    );

    return result;
  };

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
          <b>Review your data and metadata:</b>
          {validateData()}
        </div>
        <div className='small-pad'>
          <b>Review your recording details:</b>
          {validateRecordingDetails()}
        </div>
        <div className='small-pad'>
          <b>Review your participant details:</b>
          {validateParticipantDetails()}
        </div>
        <div className='small-pad'>
          <b>Review your uploaded EEG Parameter metadata:</b>
          <div>{validateRecordingParameters()}</div>
        </div>
        <div className='small-pad'>
          <b>Verify anonymization of EDF header data:</b>
          {appContext.getFromTask('subjectID') ?
            <div>
              Subject ID: {appContext.getFromTask('subjectID')}
            </div> :
            <div>
              {formatWarning('Subject ID is not modified.')}
            </div>
          }
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
