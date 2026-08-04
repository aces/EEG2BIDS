const fs = require('fs');
const os = require('os');
const path = require('path');
const {test, expect} = require('./fixtures');

// The batch workbench's save/open/stat bridge exercised against the real
// filesystem. Native file dialogs are stubbed at runtime (as in
// interactions.spec.js) so the write and read paths run for real without a
// dialog ever opening. The renderer's batchFile module owns the document
// shape; here we only prove the main process moves the bytes faithfully and
// reports source signatures.

test.describe('batch file save/open round trip', () => {
  test('saves a document and reads back an equal document', async ({
    electronApp, mainWindow,
  }) => {
    const target = path.join(
        os.tmpdir(), `eeg2bids-batch-${process.pid}.json`);
    // A minimal but representative serialized manifest (see batchFile.js).
    const document = {
      schemaVersion: 1,
      recordings: [
        {
          id: 'rec-1',
          source: {path: '/data/p001/rest.edf', filename: 'rest.edf',
            format: 'edf', companions: [], signature: {size: 10, mtimeMs: 1}},
          assignments: {participant: 'p001', session: '', task: 'rest',
            run: ''},
          excluded: false,
          ready: true,
        },
      ],
      demographics: {p001: {age: '31', sex: 'F', handedness: ''}},
      mappings: [],
    };

    try {
      await electronApp.evaluate(({dialog}, filePath) => {
        dialog.showSaveDialog = async () => (
          {canceled: false, filePath}
        );
        dialog.showOpenDialog = async () => (
          {canceled: false, filePaths: [filePath]}
        );
      }, target);

      const savedPath = await mainWindow.evaluate((data) =>
        window.eeg2bids.saveBatchFile(
            {suggestedName: 'batch.json', data}), document);
      expect(savedPath).toBe(target);
      // The file is real, on disk, and pretty-printed JSON.
      expect(fs.existsSync(target)).toBe(true);

      const opened = await mainWindow.evaluate(() =>
        window.eeg2bids.openBatchFile());
      expect(opened.filePath).toBe(target);
      expect(opened.data).toEqual(document);
    } finally {
      fs.rmSync(target, {force: true});
    }
  });

  test('open returns null when the dialog is cancelled', async ({
    electronApp, mainWindow,
  }) => {
    await electronApp.evaluate(({dialog}) => {
      dialog.showOpenDialog = async () => ({canceled: true, filePaths: []});
    });
    const opened = await mainWindow.evaluate(() =>
      window.eeg2bids.openBatchFile());
    expect(opened).toBeNull();
  });
});

test.describe('statPaths', () => {
  test('reports a signature for a real file and null for a missing one',
      async ({mainWindow}) => {
        const real = path.join(
            os.tmpdir(), `eeg2bids-stat-${process.pid}.edf`);
        fs.writeFileSync(real, 'abcde');
        const gone = path.join(os.tmpdir(), 'eeg2bids-does-not-exist.edf');

        try {
          const signatures = await mainWindow.evaluate((paths) =>
            window.eeg2bids.statPaths(paths), [real, gone]);

          expect(signatures[real].size).toBe(5);
          expect(typeof signatures[real].mtimeMs).toBe('number');
          expect(signatures[gone]).toBeNull();
        } finally {
          fs.rmSync(real, {force: true});
        }
      });
});
