
const path = require('path');

/**
 * Rotate log file
 */
const archiveLog = (file) => {
    const today  = new Date();
    let date = new Date().toISOString().replace(/T/, '-').replaceAll(/:/g, '_').replace(/\..+/, '');

    file = file.toString();
    const info = path.parse(file);

    try {
        fs.renameSync(file, path.join(info.dir, info.name + '-' + date + info.ext));
    } catch (e) {
        console.warn('Could not rotate log', e);
    }
};

exports.archiveLog = archiveLog;