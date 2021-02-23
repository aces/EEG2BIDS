const {spawn} = require('child_process'); // {fork}

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
  startup() {
    const pathToService = require('path').join(
        __dirname,
        '..',
        this.platform === 'win32' ?
          'dist/pycat-service-windows.exe' :
          'dist/pycat-service'
    );
    this.process = spawn(pathToService);
  }
  /**
   * shutdown the service process
   */
  shutdown() {
    if (this.process) {
      console.info('[SHUTDOWN of pycatService]');
      this.process.kill();
      this.process = null;
    }
  }
};
