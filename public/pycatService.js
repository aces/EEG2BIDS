const {execFile} = require('child_process');
// console.log('LOOK HERE:');
// console.log(process.sandboxed);
// console.log(process.type);
const {shell} = require('electron');
// const {app} = require('electron');
// app.dock.setBadge('hello');

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
    // const cp = require('child_process');
    // const isRoot = (process.getuid && process.getuid() === 0);
    // if (!isRoot) {
    //   const cmd = `open -j -a ${pathToService} &> /dev/null`;
    //   // const cmd = `${pathToService}`;
    //   const prompt = `/usr/bin/osascript -e 'do shell ` +
    //     `script "bash -c \\"${cmd}\\"" ` +
    //     `with prompt "pyCat needs your permissions."` +
    //     ` with administrator privileges'`;
    //   console.log(prompt);
    //   this.process = cp.exec(prompt);
    // }
    // this.process = exec(pathToService);
    // const open = require('open');
    // this.process = shell.openPath(pathToService);
    console.log('~~~~~~~~~~~~~~TEST:');
    this.process = execFile(pathToService);
    console.log('~~~~~~~~~~~~~~END');
    // await shell.openExternal(pathToService);
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
