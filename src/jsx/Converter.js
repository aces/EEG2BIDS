import React, {useContext, useState} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import '../css/Converter.css';

// Socket.io
import {Event, SocketContext} from './socket.io';

/**
 * Converter - the iEEG to BIDS Converter component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Converter = (props) => {
  // React Context
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  const fireBidsConverter = () => {
    socketContext.emit('ieeg_to_bids', {
      file_path: appContext.getFromTask('edfFile').path,
      bids_directory: appContext.getFromTask('bidsDirectory'),
      read_only: false,
    });
  };

  const fireModifyBidsTsv = () => {
    socketContext.emit('modify_bids_tsv', {
      bids_directory: appContext.getFromTask('bidsDirectory'),
      site_id: appContext.getFromTask('siteID'),
    });
  };

  const onMessage = (message) => {
    console.log(message);
  };

  return props.visible ? (
    <>
      <div style={{
        fontSize: '20px',
        textAlign: 'center',
        verticalAlign: 'middle',
        cursor: 'default',
        padding: '20px',
      }}>
        iEEG to BIDS format
      </div>
      <div style={{backgroundColor: '#039b83', padding: '14px'}}>
        <div style={{padding: '10px'}}>
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
        <div style={{padding: '10px'}}>
          <b>7. Please review your LORIS meta data:</b>
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
        <div style={{padding: '10px'}}>
          <b style={{cursor: 'default'}}>
            8. Convert your configurations to BIDS format:&nbsp;
          </b>
          <button onClick={fireBidsConverter}>
            Start Task
          </button>
        </div>
      </div>
      <div style={{
        padding: '20px',
        backgroundColor: '#039b83',
      }}>
        <b style={{cursor: 'default'}}>
          9. Modify participants.tsv data:&nbsp;
        </b>
        <button onClick={fireModifyBidsTsv}>
          Start Task
        </button>
      </div>
      <Event event='response' handler={onMessage} />
    </>
  ) : null;
};
Converter.propTypes = {
  visible: PropTypes.bool,
};

export default Converter;
