import React, {useContext} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import '../css/Converter.css';

// Socket.io
import {Event, SocketContext} from './socket.io';

/**
 * Converter - the iEEG to BIDS component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Converter = (props) => {
  // React Context
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);

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
    });
  };

  /**
   * onMessage - received message from python.
   * @param {object} message - response
   */
  const onMessage = (message) => {
    console.info(message);
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
          <b>6. Please review your configurations:</b>
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
                  <a> &#x274C;</a>
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
                  <a> &#x274C;</a>
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
                  <a> &#x274C;</a>
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
                  <a> &#x274C;</a>
                </>)
              }
            </li>
          </ul>
        </div>
        <div className={'small-pad'}>
          <b>7. Please review your LORIS metadata:</b>
          <ul>
            <li>
              {appContext.getFromTask('siteID') ?
                (<>
                  The SiteID:&nbsp;
                  {appContext.getFromTask('siteID')}
                  <a className={'checkmark'}> &#x2714;</a>
                </>) :
                (<>
                  The SiteID hasn't been set in configuration.
                  <a> &#x274C;</a>
                </>)
              }
            </li>
          </ul>
        </div>
        <div className={'small-pad'}>
          <b>8. Please review your iEEG header data:</b>
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
                  <a> &#x274C;</a>
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
        <div className={'small-pad'}>
          <b style={{cursor: 'default'}}>
            9. Convert your specifications to BIDS format:&nbsp;
          </b>
          <button onClick={beginBidsCreation}>
            Start Task
          </button>
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
