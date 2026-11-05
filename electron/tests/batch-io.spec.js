const fs = require('fs');
const os = require('os');
const path = require('path');
const {test, expect} = require('./fixtures');

test('batch files round-trip and sources are statted', async ({
  electronApp, mainWindow,
}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eeg2bids-batch-io-'));
  const target = path.join(dir, 'batch.json');
  const source = path.join(dir, 'rest.edf');
  fs.writeFileSync(source, 'abcde');
  const document = {schemaVersion: 1, recordings: [{id: 'rec-1'}]};
  try {
    await electronApp.evaluate(({dialog}, filePath) => {
      dialog.showSaveDialog = async () => ({canceled: false, filePath});
      dialog.showOpenDialog = async () =>
        ({canceled: false, filePaths: [filePath]});
    }, target);

    expect(await mainWindow.evaluate((data) => window.eeg2bids.saveBatchFile(
        {suggestedName: 'batch.json', data}), document)).toBe(target);
    expect(await mainWindow.evaluate(() => window.eeg2bids.openBatchFile()))
        .toEqual({filePath: target, data: document});

    const gone = path.join(dir, 'gone.edf');
    const signatures = await mainWindow.evaluate((paths) =>
      window.eeg2bids.statPaths(paths), [source, gone]);
    expect(signatures[source].size).toBe(5);
    expect(signatures[gone]).toBeNull();
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
