const {spawn, exec} = require('child_process');
const os = require('os');
const pythonLog = require('electron-log');
const path = require('path');
const fs = require('fs');

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
    pythonLog.transports.file.fileName = 'python.log';
    pythonLog.transports.file.archiveLog = (file) => {
      const today  = new Date();
      let date = new Date().toISOString().replace(/T/, '-').replaceAll(/:/g, '_').replace(/\..+/, '');

      file = file.toString();
      const info = path.parse(file);

      try {
        fs.renameSync(file, path.join(info.dir, info.name + '-' + date + info.ext));
      } catch (e) {
        console.warn('Could not rotate log', e);
      }
    }
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

    this.process = spawn(pathToService, []);

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
      console.info('[SHUTDOWN of eeg2bidsService]');

      if(os.platform() === 'win32'){
        exec('taskkill /pid ' + this.process.pid + ' /T /F', (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
          }
          console.log(stdout);
          console.error(stderr);
          callback();
        });
      } else if(os.platform() !== 'darwin'){
        this.process.kill();
      }

      this.process = null;
    }
  }
};
