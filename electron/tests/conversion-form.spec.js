const {test, expect} = require('./fixtures');
const fs = require('fs');
const os = require('os');
const path = require('path');

test('clear resets the review', async ({mainWindow}) => {
  const mode = mainWindow.locator('[data-testid="app-root"]');
  await expect(mode).toHaveAttribute('data-appmode', 'Welcome');

  await mainWindow.getByText('2) Configuration').click();
  await mainWindow.locator('#taskName').fill('rest');
  await mainWindow.getByText('3) Recording to BIDS').click();
  await expect(mainWindow.getByText('Task Name: rest')).toBeVisible();

  await mainWindow.getByText('2) Configuration').click();
  await mainWindow.getByRole('button', {
    name: 'Clear all fields below',
  }).click();
  await expect(mainWindow.locator('#taskName')).toHaveValue('');
  await expect(mainWindow.locator('#participantID')).toBeVisible();
  await mainWindow.getByText('3) Recording to BIDS').click();
  await expect(mainWindow.getByText(
      'Task Name is not specified')).toBeVisible();
});

test('parameter file prepopulation follows the selected file',
    async ({mainWindow}) => {
      const directory = fs.mkdtempSync(
          path.join(os.tmpdir(), 'eeg2bids-form-'));
      const parameterFile = path.join(directory, 'parameters.json');
      fs.writeFileSync(parameterFile, JSON.stringify({
        bids: {InstitutionName: 'Example lab'},
        prepopulation: {Project: 'Study A'},
      }));
      try {
        await expect(mainWindow.getByTestId('backend-status'))
            .toHaveAttribute('data-state', 'connected');
        await mainWindow.getByText('2) Configuration').click();
        await mainWindow.locator('#bidsMetadataFile')
            .setInputFiles(parameterFile);
        await expect(mainWindow.locator('#projectID_Manual'))
            .toHaveValue('Study A');

        await mainWindow.getByRole('button', {
          name: 'Clear all fields below',
        }).click();
        await expect(mainWindow.locator('#projectID_Manual'))
            .toHaveValue('n/a');
        await mainWindow.getByText('3) Recording to BIDS').click();
        await expect(mainWindow.getByText(
            'No EEG Parameter metadata file selected')).toBeVisible();
      } finally {
        fs.rmSync(directory, {recursive: true, force: true});
      }
    });
