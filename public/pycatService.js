const {spawn} = require('child_process'); // {fork}

/**
 * PycatService
 */
module.exports = class PycatService {
  /**
   * constructor
   * @param {string} mode - production or development.
   */
  constructor(mode) {
    const os = require('os');
    this.platform = os.platform(); // darwin or win32.
    this.process = null; // the service process.
    this.mode = mode;
  }
  /**
   * startup the service process
   */
  startup() {
    if (this.mode === 'development') return;
    const pathToService = require('path').join(
        __dirname,
        '..',
        this.platform === 'win32' ?
          'dist/pycat-service-windows.exe' :
          'dist/pycat-service'
    );
    console.log(pathToService);
    this.process = spawn(pathToService, {
      silent: true,
    });
    this.process.stdout.on('data', (data) => {
      console.log('stdout data:');
      console.log(`stdout: ${data}`);
    });
    this.process.stderr.on('data', (data) => {
      console.log('stderr data:');
    });
    this.process.on('close', (code) => {
      console.log('close:');
      console.log(`child process exited with code ${code}`);
    });
  }
  /**
   * shutdown the service process
   */
  shutdown() {
    if (this.mode === 'development') return;
    if (this.process) {
      console.log('SHUTDOWN of pycatService');
      this.process.kill();
      this.process = null;
    }
  }
};
