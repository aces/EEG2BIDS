const {execFile, spawn} = require('child_process');

/**
 * EEG2BIDS Wizard Service
 */
module.exports = class EEG2BIDSService {
  /**
   * constructor
   */
  constructor() {
    const os = require('os');
    this.platform = os.platform(); // darwin or win32.
    this.process = null; // the service process.
  }

  /**
   * startup the service process
   */
  async startup() {
    const pathToService = require('path').join(
        __dirname,
        '..',
      this.platform === 'win32' ?
        'dist/eeg2bids-service-windows.exe' :
        'dist/eeg2bids-service.app/Contents/MacOS/eeg2bids-service',
    );
    this.process = this.platform === 'win32' ?
      execFile(pathToService) :
      spawn(pathToService);
  }

  /**
   * shutdown the service process
   */
  shutdown() {
    if (this.process) {
      console.info('[SHUTDOWN of eeg2bidsService]');
      // this.process.kill();
      this.process = null;
    }
  }
};
