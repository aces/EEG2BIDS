import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import '../css/Converter.css';

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

  /**
   * beginBidsCreation - create BIDS format.
   *   Sent by socket to python: ieeg_to_bids.
   */
  const beginBidsCreation = () => {
    socketContext.emit('ieeg_to_bids', {
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
      visit_label: appContext.getFromTask('visit_label') ?? '',
      subject_id: appContext.getFromTask('subject_id') ?? '',
    });
  };

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    if (outputTime) {
      setSuccessMessage(<>
        <a className={'task-finished'}>Task finished! 🙂</a>
      </>);
    }
  }, [outputTime]);

  /**
   * onMessage - received message from python.
   * @param {object} message - response
   */
  const onMessage = (message) => {
    if (message['output_time']) {
      setOutputTime(message['output_time']);
      appContext.setTask('output_time', message['output_time']);
    }
  };

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return props.visible ? (
    <>
      <span className={'header'}>
        iEEG to BIDS format
      </span>
      <div className={'info'}>
        <div className={'small-pad'}>
          <b>10. Please review your configurations:</b>
          <ul>
            <li>
              {appContext.getFromTask('edfFile') ?
                (<>
                  The file.edf:&nbsp;
                  {appContext.getFromTask('edfFile').name}
                  <a className={'checkmark'}> &#x2714;</a>
                </>) :
                (<>
                  The file.edf hasn't been set in configuration.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please correct.
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
                  The events.tsv hasn't been set in configuration.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please correct.
                    </span>
                  </a>
                </>)
              }
            </li>
            <li>
              {appContext.getFromTask('bidsDirectory') ?
                (<>
                  BIDS output directory:&nbsp;
                  {appContext.getFromTask('bidsDirectory')}
                  <a className={'checkmark'}> &#x2714;</a>
                </>) :
                (<>
                  The BIDS output directory hasn't been set in configuration.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please correct.
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
                  The line_freq hasn't been set in configuration.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please correct.
                    </span>
                  </a>
                </>)
              }
            </li>
          </ul>
        </div>
        <div className={'small-pad'}>
          <b>11. Please review your LORIS metadata:</b>
          <ul>
            <li>
              {appContext.getFromTask('siteID') ?
                (<>
                  The SiteID:&nbsp;
                  {appContext.getFromTask('siteID')}
                  <a className={'checkmark tooltip'}> &#x2714;</a>
                </>) :
                (<>
                  The SiteID hasn't been set in configuration.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please correct.
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
                  The ProjectID hasn't been set in configuration.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please correct.
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
                  The SubProjectID hasn't been set in configuration.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please correct.
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
                  The Visit Label hasn't been set in configuration.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please correct.
                    </span>
                  </a>
                </>)
              }
            </li>
          </ul>
        </div>
        <div className={'small-pad'}>
          <b>12. Please review your iEEG header data:</b>
          <ul>
            <li>
              {appContext.getFromTask('subject_id') ?
                (<>
                  The subject_id:&nbsp;
                  {appContext.getFromTask('subject_id')}
                  <a className={'warning tooltip'}> &#x26A0;&#xFE0F;
                    <span className={'tooltiptext'}>
                      Verify the anonymization.
                    </span>
                  </a>
                </>) :
                (<>
                  The file.edf hasn't been set in configuration.
                  <a className={'tooltip'}> &#x274C;
                    <span className={'tooltiptext'}>
                      Please correct.
                    </span>
                  </a>
                </>)
              }
            </li>
            {appContext.getFromTask('recording_id') ?
              (<li>
                The recording_id:&nbsp;
                {appContext.getFromTask('recording_id')}
                <a className={'warning tooltip'}> &#x26A0;&#xFE0F;
                  <span className={'tooltiptext'}>
                    Verify the anonymization.
                  </span>
                </a>
              </li>) :
              (<>
              </>)
            }
            {appContext.getFromTask('day') ?
              (<li>
                The day:&nbsp;
                {appContext.getFromTask('day')}
                <a className={'warning tooltip'}> &#x26A0;&#xFE0F;
                  <span className={'tooltiptext'}>
                    Verify the anonymization.
                  </span>
                </a>
              </li>) :
              (<>
              </>)
            }
            {appContext.getFromTask('month') ?
              (<li>
                The month:&nbsp;
                {appContext.getFromTask('month')}
                <a className={'warning tooltip'}> &#x26A0;&#xFE0F;
                  <span className={'tooltiptext'}>
                    Verify the anonymization.
                  </span>
                </a>
              </li>) :
              (<>
              </>)
            }
            {appContext.getFromTask('year') ?
              (<li>
                The year:&nbsp;
                {appContext.getFromTask('year')}
                <a className={'warning tooltip'}> &#x26A0;&#xFE0F;
                  <span className={'tooltiptext'}>
                    Verify the anonymization.
                  </span>
                </a>
              </li>) :
              (<>
              </>)
            }
            {appContext.getFromTask('hour') ?
              (<li>
                The hour:&nbsp;
                {appContext.getFromTask('hour')}
                <a className={'warning tooltip'}> &#x26A0;&#xFE0F;
                  <span className={'tooltiptext'}>
                    Verify the anonymization.
                  </span>
                </a>
              </li>) :
              (<>
              </>)
            }
            {appContext.getFromTask('minute') ?
              (<li>
                The minute:&nbsp;
                {appContext.getFromTask('minute')}
                <a className={'warning tooltip'}> &#x26A0;&#xFE0F;
                  <span className={'tooltiptext'}>
                    Verify the anonymization.
                  </span>
                </a>
              </li>) :
              (<>
              </>)
            }
            {appContext.getFromTask('second') ?
              (<li>
                The second:&nbsp;
                {appContext.getFromTask('second')}
                <a className={'warning tooltip'}> &#x26A0;&#xFE0F;
                  <span className={'tooltiptext'}>
                    Verify the anonymization.
                  </span>
                </a>
              </li>) :
              (<>
              </>)
            }
          </ul>
        </div>
        <div className={'small-pad convert-bids-row'}>
          <b style={{cursor: 'default'}}>
            13. Convert your specifications to BIDS format:&nbsp;
          </b>
          <input type={'button'}
            className={'start_task'}
            onClick={beginBidsCreation}
            value={'Start Task'}
          />
          {successMessage}
        </div>
      </div>
      <Event event='response' handler={onMessage} />
    </>
  ) : null;
};
Converter.propTypes = {
  visible: PropTypes.bool,
};

export default Converter;
