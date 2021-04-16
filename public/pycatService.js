const {execFile} = require('child_process');

/**
 * PycatService
 */
module.exports = class PycatService {
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
        'dist/pycat-service-windows.exe' :
        'dist/pycat-service.app/Contents/MacOS/pycat-service',
    );
    this.process = execFile(pathToService);
  }

  /**
   * shutdown the service process
   */
  shutdown() {
    if (this.process) {
      console.info('[SHUTDOWN of pycatService]');
      // this.process.kill();
      this.process = null;
    }
  }
};
