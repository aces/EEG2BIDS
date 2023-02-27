const {spawn, exec} = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const {archiveLog} = require('./logs');
const pythonLog = require('electron-log');
pythonLog.transports.file.fileName = 'python.log';
pythonLog.transports.file.archiveLog = archiveLog;

/**
 * EEG2BIDS Wizard Service
 */
module.exports = class EEG2BIDSService {
  /**
   * constructor
   */
  constructor() {
    this.platform = os.platform(); // darwin or win32.
    this.process = null; // the service process.
  }

  /**
   * startup the service process
   */
  async startup() {
    let pathToService;

    if (process.env.DEV) {
      pathToService = require('path').join(
          __dirname,
          '..',
          this.platform === 'win32' ?
            'start-server.ps1' :
            'start-server.sh',
      );
      this.platform === 'win32' ?
        this.process = spawn('powershell.exe', [pathToService]) :
        this.process = spawn('bash', [pathToService])
    } else {
      pathToService = require('path').join(
        __dirname,
        '..',
      this.platform === 'win32' ?
        'dist/eeg2bids-service-windows.exe' :
        'dist/eeg2bids-service.app/Contents/MacOS/eeg2bids-service',
      );
      this.process = spawn(pathToService, []);
    }

    this.process.stdout.on('data', function (data) {
      pythonLog.info('stdout: ' + data.toString());
    });

    this.process.stderr.on('data', function (data) {
      pythonLog.error('sterr: ' + data.toString());
    });

    this.process.on('exit', function (code) {
      pythonLog.info('Python process exited');
    });
  }

  /**
   * shutdown the service process
   */
  shutdown(callback) {
    if (this.process) {
      pythonLog.info('[SHUTDOWN of eeg2bidsService]');

      if(os.platform() === 'win32'){
        exec('taskkill /pid ' + this.process.pid + ' /T /F', (error, stdout, stderr) => {
          if (error) {
            pythonLog.error(`exec error: ${error}`);
          }
          pythonLog.log(stdout);
          if (stderr) {
            pythonLog.error(stderr);
          }
          callback();
        });
      } else if(os.platform() !== 'darwin'){
        this.process.kill();
      }

      this.process = null;
    }
  }
};
