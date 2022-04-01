const {execFile} = require('child_process');

/**
 * EEG2BIDS Wizard Service
 */
module.exports = class MFFToSETService {
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
    async startup(mffDirectory, callback) {
        const pathToService = require('path').join(
            __dirname,
            '..',
          this.platform === 'win32' ?
            'python/tools/mff_to_set.exe' :
            '',
        );

        // Check environment: Don't launch EXE if user is
        //     -> not running windows and
        //     -> matlab v93 is not set as an environement variable
        if (this.platform !== 'win32' && !process.env.PATH.includes('v93')) {
            callback(
                false,
                'Environment not configured for processing MFF files.',
                {}
            );
            this.process = null;
            return;
        }

        const fs = require('fs');
        if (fs.existsSync(mffDirectory.name + '.set')) {
            callback(
                true,
                'SET file already exists!',
                {
                    path: mffDirectory.name + '.set',
                    name: mffDirectory.name,
                }
            );
            this.process = null;
            return;
        }
        
        this.process = execFile(pathToService, [mffDirectory.path], (error, stdout, stderr) => {
            if (fs.existsSync(mffDirectory.name + '.set')) {
                callback(
                    true,
                    'SET file created!',
                    {
                        path: mffDirectory.name + '.set',
                        name: mffDirectory.name,
                    }
                );
            } else {
                callback(
                    false,
                    'Could not convert MFF file.',
                    {}
                );
            }
        });
  }

  /**
   * shutdown the service process
   */
  shutdown() {
    if (this.process) {
      console.info('[SHUTDOWN of mffToSetService]');
      // this.process.kill();
      this.process = null;
    }
  }
};