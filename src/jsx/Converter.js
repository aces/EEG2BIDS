import React, {useContext, useState} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';

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
    console.log(appContext.getFromTask('edfFile').name);
    // socketContext.emit('ieeg_to_bids', {
    //   file_path: appContext.task['edfFile'].path,
    //   bids_directory: appContext.task['bidsDirectory'],
    //   read_only: false,
    // });
  };

  const fireModifyBidsTsv = () => {
    socketContext.emit('modify_bids_tsv', {
      bids_directory: appContext.task['bidsDirectory'],
      site_id: appContext.task['siteID'],
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
        iEEG to BIDS Converter
      </div>
      <div style={{backgroundColor: '#039b83', padding: '14px'}}>
        <div style={{padding: '10px'}}>
          <b>6. Please review your configurations:</b>&nbsp;
          <ul>
            <li>
              {appContext.getFromTask('edfFile') ?
            'file.edf: ' + appContext.getFromTask('edfFile').name :
            'The file.edf hasn\'t been set in configuration.'}
            </li>
            <li>
              {appContext.getFromTask('eventsTSV') ?
            'Including: ' + appContext.getFromTask('eventsTSV').name :
            'The events.tsv hasn\'t been set in configuration.'}
            </li>
            <li>
              {appContext.getFromTask('bidsDirectory') ?
            'BIDS output directory: ' +appContext.getFromTask('bidsDirectory') :
            'The BIDS output directory hasn\'t been set in configuration.'}
            </li>
            <li>
              {appContext.getFromTask('lineFreq') ?
            'line_freq: ' + appContext.getFromTask('lineFreq') :
            'The line_freq hasn\'t been set in configuration.'}
            </li>
          </ul>
        </div>
        <div style={{padding: '10px'}}>
          <b style={{cursor: 'default'}}>
            7. Convert your configurations to BIDS format:&nbsp;
          </b>
          <button onClick={fireBidsConverter}>
            Start Task
          </button>
        </div>
      </div>
      <div style={{marginTop: '20px',
        fontSize: '20px',
        textAlign: 'center',
        verticalAlign: 'middle',
        cursor: 'default',
      }}>
        Finalize participants.tsv for LORIS
      </div>
      <div style={{marginTop: '20px',
        backgroundColor: '#039b83',
        padding: '20px',
        cursor: 'default',
      }}>
      </div>
      <div style={{
        padding: '20px',
        backgroundColor: '#039b83',
      }}>
        <b style={{cursor: 'default'}}>
          6. Modify participants.tsv data:&nbsp;
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
