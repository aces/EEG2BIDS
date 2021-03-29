import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import '../css/Converter.css';

// Display Loading, Success, Error
import Modal from './elements/modal';

// Socket.io
import {Event, SocketContext} from './socket.io';

/**
 * Converter - the EDF to BIDS component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Converter = (props) => {
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
      loading: ' Task in Progress',
      success: ' Success - Complete',
      error: ' ❌  Error Detected',
    },
    message: {
      loading: <span style={{padding: '40px'}}>
        <a className={'bids-loading'}>
            BIDS creation in progress... <span>.</span><span>.</span><span>.</span>
        </a>
      </span>,
      success: <span style={{padding: '40px'}}>
        <a className={'bids-success'}>
          Success creating BIDS! <a className={'checkmark'}> &#x2714;</a>
        </a></span>,
      error: '',
    },
  });

  /**
   * beginBidsCreation - create BIDS format.
   *   Sent by socket to python: edf_to_bids.
   */
  const beginBidsCreation = () => {
    setModalText((prevState) => {
      return {...prevState, ['mode']: 'loading'};
    });
    setModalVisible(true);
    socketContext.emit('edf_to_bids', {
      file_path: appContext.getFromTask('edfFile') ?
        appContext.getFromTask('edfFile').path : '',
      bids_directory: appContext.getFromTask('bidsDirectory') ?? '',
      read_only: false,
      events_tsv: appContext.getFromTask('eventsTSV') ?
        appContext.getFromTask('eventsTSV').path : '',
      line_freq: appContext.getFromTask('lineFreq') ?? '',
      site_id: appContext.getFromTask('siteID') ?? '',
      project_id: appContext.getFromTask('projectID') ?? '',
      sub_project_id: appContext.getFromTask('subProjectID') ?? '',
      visit_label: appContext.getFromTask('visitLabel') ?? '',
      subject_id: appContext.getFromTask('subject_id') ?? '',
    });
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
        <a className={'task-finished'}>Last created at: {time}</a>
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

  /**
   * onMessage - received message from python.
   * @param {object} message - response
   */
  const onMessage = (message) => {
    console.info(message);
    if (message['output_time']) {
      setOutputTime(message['output_time']);
      appContext.setTask('output_time', message['output_time']);
      setModalText((prevState) => {
        return {...prevState, ['mode']: 'success'};
      });
    } else {
      setModalText((prevState) => {
        prevState.message['error'] = <span key={'bids-errors'}
          className={'bids-errors'}>
          {message['error']}</span>;
        return {...prevState, ['mode']: 'error'};
      });
    }
  };

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return props.visible ? (
    <>
      <span className={'header'}>
        EDF to BIDS format
      </span>
      <div className={'info'}>
        <div className={'small-pad'}>
          <b>Review your Configuration selections:</b>
          <ul>
            <li>
              {appContext.getFromTask('edfFile') ?
                (<>
                  EDF data file:&nbsp;
                  {appContext.getFromTask('edfFile').name}
                  <a className={'checkmark'}> &#x2714;</a>
                </>) :
                (<>
                  No EDF file selected.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please select a valid file under the Configuration tab.
                    </span>
                  </a>
                </>)
              }
            </li>
            <li>
              {appContext.getFromTask('eventsTSV') ?
                (<>
                  Including:&nbsp;
                  {appContext.getFromTask('eventsTSV').name}
                  <a className={'checkmark'}> &#x2714;</a>
                </>) :
                (<>
                  No events.tsv hasn't selected.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please select a file under the Configuration tab.
                    </span>
                  </a>
                </>)
              }
            </li>
            <li>
              {appContext.getFromTask('bidsDirectory') ?
                (<>
                  BIDS output folder:&nbsp;
                  {appContext.getFromTask('bidsDirectory')}
                  <a className={'checkmark'}> &#x2714;</a>
                </>) :
                (<>
                  No BIDS output folder selected.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please select a folder in the Configuration tab.
                    </span>
                  </a>
                </>)
              }
            </li>
            <li>
              {appContext.getFromTask('lineFreq') ?
                (<>
                  line_freq:&nbsp;
                  {appContext.getFromTask('lineFreq')}
                  <a className={'checkmark'}> &#x2714;</a>
                </>) :
                (<>
                  No Line Frequency set.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please enter a value in the Configuration tab.
                    </span>
                  </a>
                </>)
              }
            </li>
          </ul>
        </div>
        <div className={'small-pad'}>
          <b>Review your LORIS metadata:</b>
          <ul>
            <li>
              {appContext.getFromTask('siteID') ?
                (<>
                  The SiteID:&nbsp;
                  {appContext.getFromTask('siteID')}
                  <a className={'checkmark tooltip'}> &#x2714;</a>
                </>) :
                (<>
                  No SiteID set.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please enter a value in the Configuration tab.
                    </span>
                  </a>
                </>)
              }
            </li>
            <li>
              {appContext.getFromTask('projectID') ?
                (<>
                  The ProjectID:&nbsp;
                  {appContext.getFromTask('projectID')}
                  <a className={'checkmark tooltip'}> &#x2714;</a>
                </>) :
                (<>
                  No ProjectID set.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please enter a value in the Configuration tab.
                    </span>
                  </a>
                </>)
              }
            </li>
            <li>
              {appContext.getFromTask('subProjectID') ?
                (<>
                  The SubProjectID:&nbsp;
                  {appContext.getFromTask('subProjectID')}
                  <a className={'checkmark tooltip'}> &#x2714;</a>
                </>) :
                (<>
                  No SubProjectID set.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please enter a value in the Configuration tab.
                    </span>
                  </a>
                </>)
              }
            </li>
            <li>
              {appContext.getFromTask('visitLabel') ?
                (<>
                  The Visit Label:&nbsp;
                  {appContext.getFromTask('visitLabel')}
                  <a className={'checkmark tooltip'}> &#x2714;</a>
                </>) :
                (<>
                  No Visit Label set.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please enter a value in the Configuration tab.
                    </span>
                  </a>
                </>)
              }
            </li>
          </ul>
        </div>
        <div className={'small-pad'}>
          <b>Review the EDF header data and verify anonymization &#x26A0;&#xFE0F;</b>
          <ul>
            <li>
              {appContext.getFromTask('subject_id') ?
                (<>
                  The subject_id:&nbsp;
                  {appContext.getFromTask('subject_id')}
                </>) :
                (<>
                  No subject_id set.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please enter a value in the previous tab.
                    </span>
                  </a>
                </>)
              }
            </li>
            {appContext.getFromTask('recording_id') ?
              (<li>
                The recording_id:&nbsp;
                {appContext.getFromTask('recording_id')}
              </li>) :
              (<>
              </>)
            }
            {appContext.getFromTask('day') ?
              (<li>
                The day:&nbsp;
                {appContext.getFromTask('day')}
              </li>) :
              (<>
              </>)
            }
            {appContext.getFromTask('month') ?
              (<li>
                The month:&nbsp;
                {appContext.getFromTask('month')}
              </li>) :
              (<>
              </>)
            }
            {appContext.getFromTask('year') ?
              (<li>
                The year:&nbsp;
                {appContext.getFromTask('year')}
              </li>) :
              (<>
              </>)
            }
            {appContext.getFromTask('hour') ?
              (<li>
                The hour:&nbsp;
                {appContext.getFromTask('hour')}
              </li>) :
              (<>
              </>)
            }
            {appContext.getFromTask('minute') ?
              (<li>
                The minute:&nbsp;
                {appContext.getFromTask('minute')}
              </li>) :
              (<>
              </>)
            }
            {appContext.getFromTask('second') ?
              (<li>
                The second:&nbsp;
                {appContext.getFromTask('second')}
              </li>) :
              (<>
              </>)
            }
          </ul>
        </div>
        <div className={'small-pad convert-bids-row'}>
          <b style={{cursor: 'default'}}>
            Click to Start conversion to BIDS:&nbsp;
          </b>
          <input type={'button'}
            className={'start_task'}
            onClick={beginBidsCreation}
            value={'Make it BIDS!'}
          />
          {successMessage}
        </div>
      </div>
      <Modal
        title={modalText.title[modalText.mode]}
        show={modalVisible}
        close={hideModal}
        width={'500px'}
      >
        {modalText.message[modalText.mode]}
      </Modal>
      <Event event='response' handler={onMessage} />
    </>
  ) : null;
};
Converter.propTypes = {
  visible: PropTypes.bool,
};

export default Converter;
