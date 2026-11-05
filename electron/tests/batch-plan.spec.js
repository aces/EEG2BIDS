const fs = require('fs');
const os = require('os');
const path = require('path');
const {test, expect, REPO_ROOT} = require('./fixtures');

const EDF = path.join(REPO_ROOT, 'tests/fixtures/eeg_continuous.edf');

const place = (file) => {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.copyFileSync(EDF, file);
};

test('a handed-off and a reopened batch give the same plan', async ({
  electronApp, mainWindow,
}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eeg2bids-batch-plan-'));
  const raw = path.join(dir, 'raw');
  const out = path.join(dir, 'out');
  const batchFile = path.join(dir, 'batch.json');
  place(path.join(raw, 'sub-01/sub-01_task-rest_eeg.edf'));
  place(path.join(raw, 'sub-02/sub-02_task-rest_eeg.edf'));
  place(path.join(raw, 'misc/patientX.edf'));
  // sub-02 is already in the dataset, so it must be skipped, not overwritten.
  place(path.join(out, 'sub-02/ieeg/sub-02_task-rest_acq-seeg_ieeg.edf'));

  await electronApp.evaluate(({dialog}, {raw, out, batchFile}) => {
    const folders = [raw, out];
    dialog.showOpenDialog = async (window, options) => ({
      canceled: false,
      filePaths: [options.properties.includes('openDirectory') ?
        folders.shift() : batchFile],
    });
    dialog.showSaveDialog = async () =>
      ({canceled: false, filePath: batchFile});
  }, {raw, out, batchFile});

  const expectPlan = async () => {
    await mainWindow.getByText('3) Recording to BIDS').click();
    const plan = mainWindow.getByTestId('batch-plan');
    await expect(plan).toHaveAttribute('data-ready', '1');
    const statuses = await plan.locator('[data-status]')
        .evaluateAll((rows) => rows.map((row) => row.dataset.status));
    expect(statuses.sort()).toEqual(
        ['already-processed', 'new', 'unresolved']);
    await expect(plan).toContainText(
        'sub-01/ieeg/sub-01_task-rest_acq-seeg_ieeg.edf');
  };

  try {
    await mainWindow.getByText('4) Batch workbench').click();
    await mainWindow.locator('#batchScanFolder').click();
    await expect(mainWindow.getByTestId('batch-summary'))
        .toHaveAttribute('data-total', '3');
    await mainWindow.getByRole('button', {name: /Review/}).click();
    await mainWindow.getByRole('button', {name: 'Save batch file'}).click();
    await expect(mainWindow.getByRole('status')).toContainText('Saved');
    await mainWindow.getByRole('button', {
      name: 'Load into Configuration',
    }).click();

    const active = mainWindow.getByTestId('active-batch');
    await expect(active).toHaveAttribute('data-ready', '2');
    await expect(active).toContainText('from the Batch workbench');
    await mainWindow.locator('#bidsDirectory').click();
    await expectPlan();

    await mainWindow.getByText('2) Configuration').click();
    await mainWindow.locator('#clearBatch').click();
    await expect(active).toHaveCount(0);
    await mainWindow.locator('#openBatchFile').click();
    await expect(active).toContainText(`from ${batchFile}`);
    await expect(active).toHaveAttribute('data-ready', '2');
    await expectPlan();

    expect(fs.readdirSync(path.join(out, 'sub-02/ieeg'))).toEqual(
        ['sub-02_task-rest_acq-seeg_ieeg.edf']);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('a failed recording does not stop the batch and can be retried', async ({
  electronApp, mainWindow,
}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eeg2bids-batch-run-'));
  const raw = path.join(dir, 'raw');
  const out = path.join(dir, 'out');
  const sources = ['01', '02', '03'].map((sub) =>
    path.join(raw, `sub-${sub}/sub-${sub}_task-rest_eeg.edf`));
  sources.forEach(place);
  const written = (sub) => path.join(out,
      `sub-${sub}/ieeg/sub-${sub}_task-rest_acq-seeg_ieeg.edf`);

  await electronApp.evaluate(({dialog}, folders) => {
    dialog.showOpenDialog = async () =>
      ({canceled: false, filePaths: [folders.shift()]});
  }, [raw, out]);

  const results = async () => Object.fromEntries(await mainWindow
      .locator('[data-result]').evaluateAll((rows) => rows.map((row) =>
        [row.textContent.match(/sub-\d+/)[0], row.dataset.result])));

  try {
    await mainWindow.getByText('4) Batch workbench').click();
    await mainWindow.locator('#batchScanFolder').click();
    await mainWindow.getByRole('button', {name: /Review/}).click();
    await mainWindow.getByRole('button', {
      name: 'Load into Configuration',
    }).click();
    await mainWindow.locator('#bidsDirectory').click();
    await expect(mainWindow.getByTestId('backend-status'))
        .toHaveAttribute('data-state', 'connected');
    await mainWindow.getByText('3) Recording to BIDS').click();
    await mainWindow.locator('#batchPreparedBy').fill('Tester');

    // sub-02's source disappears after the batch was prepared.
    fs.renameSync(sources[1], `${sources[1]}.moved`);
    await mainWindow.locator('#convertBatch').click();
    await expect(mainWindow.locator('[data-result]')).toHaveCount(3);
    expect(await results()).toEqual(
        {'sub-01': 'converted', 'sub-02': 'failed', 'sub-03': 'converted'});
    await expect(mainWindow.getByTestId('batch-plan'))
        .toContainText('Recording file not found');
    const firstWrite = fs.statSync(written('01')).mtimeMs;

    fs.renameSync(`${sources[1]}.moved`, sources[1]);
    await expect(mainWindow.locator('#convertBatch'))
        .toHaveValue('Convert 1 recording');
    await mainWindow.locator('#convertBatch').click();
    await expect.poll(results).toEqual(
        {'sub-01': 'converted', 'sub-02': 'converted', 'sub-03': 'converted'});
    expect(fs.existsSync(written('02'))).toBe(true);
    expect(fs.statSync(written('01')).mtimeMs).toBe(firstWrite);
    await expect(mainWindow.getByTestId('batch-plan'))
        .toHaveAttribute('data-ready', '0');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
