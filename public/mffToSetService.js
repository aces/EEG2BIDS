const {execFile} = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * SET2BIDS Wizard Service
 */
module.exports = class MFFToSETService {
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
    async startup(mffDirectory, callback) {
        const pathToService = path.join(
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

        const mffDir = path.dirname(mffDirectory[0].path);
        const jsonFile = `${mffDir}/files.json`;
        const fileNames = [];
        for (const dir of mffDirectory) {
            if (mffDir !== path.dirname(dir.path)) {
              console.error('DIFFERENT DIRS: TODO HANDLE');
            }
            fileNames.push(path.basename(dir.path));
        }
        try {
            fs.writeFileSync(jsonFile,
                JSON.stringify(fileNames))
        } catch (e) {
            console.error(e);
        }
        
        this.process = execFile(pathToService, [mffDir, mffDir, jsonFile], (error, stdout, stderr) => {
            const setFiles = [];
            let conversionError = false;
            for (const dir of mffDirectory) {
                 if (fs.existsSync(dir.name + '.set')) {
                     setFiles.push({
                        path: dir.name + '.set',
                        name: dir.name,
                        task: dir.task,
                        run: dir.run,
                     });
                 } else {
                     conversionError = true;
                     break;
                 }
            }

            if (conversionError) {
                callback(
                    false,
                    {error: ['Could not convert MFF file.', error, stdout, stderr]},
                    [],
                    {},
                    ''
                );
            } else {
                let flags = {};
                fs.readFile(`${mffDir}/flagchecks.json`, 'utf8',
                    (err, jsonString) => {
                        console.info('read file', jsonString, err);
                        flags = JSON.parse(jsonString);
                         callback(
                            true,
                            'SET file created!',
                            setFiles,
                            flags,
                            mffDir
                        );
                    });

            }
        });
  }

  /**
   * shutdown the service process
   */
  shutdown() {
    if (this.process) {
      console.info('[SHUTDOWN of mffToSetService]');
      this.process = null;
    }
  }
};