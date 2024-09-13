# test_EEG.py

import unittest
import os
import shutil
from datetime import datetime
import mne
from unittest.mock import patch, MagicMock
from eeg import (
    Time, BaseHandler, EDFHandler, SETHandler, ReadError, WriteError, metadata
)

class TestTimeClass(unittest.TestCase):
    def test_latest_output_format(self):
        time_instance = Time()
        expected_format = datetime.now().strftime("%Y-%m-%d-%Hh%Mm%Ss")
        self.assertEqual(time_instance.latest_output, expected_format)


class TestEDFHandlerClass(unittest.TestCase):
    def setUp(self):
        # update to test file path
        self.data = {
            'eegRuns': [{'eegFile': '/path/file.edf', 'task': 'test_task', 'run': 1}],
            'bids_directory': '/bids',
            'outputFilename': 'output',
            'participantID': 'sub-01',
            'session': 'ses-01',
            'output_time': 'output-2022-01-01-00h00m00s',
            'read_only': False,
            'powerLineFreq': '60'
        }
        self.handler = EDFHandler(self.data)

    @patch('eeg.read_raw_edf')
    def test_read_file_success(self, mock_read_raw_edf):
        mock_raw = MagicMock()
        mock_read_raw_edf.return_value = mock_raw
        raw = self.handler.read_file('/path/file.edf')
        self.assertEqual(raw, mock_raw)
        mock_read_raw_edf.assert_called_with(input_fname='/path/file.edf')

    @patch('eeg.read_raw_edf')
    def test_read_file_permission_error(self, mock_read_raw_edf):
        mock_read_raw_edf.side_effect = PermissionError("Permission denied")
        with self.assertRaises(ReadError):
            self.handler.read_file('/path/file.edf')

    # @patch.object(EDFHandler, 'to_bids')
    # @patch.object(EDFHandler, 'read_file')
    @patch('os.path.exists', return_value=True)
    @patch('shutil.rmtree')
    def test_convert_to_bids(self, mock_rmtree, mock_exists, mock_read_file, mock_to_bids):
        mock_read_file.return_value = MagicMock()
        self.handler.convert_to_bids()
        mock_read_file.assert_called_once_with('/path/file.edf')
        mock_to_bids.assert_called_once()

    @patch('os.makedirs')
    @patch('mne_bids.write_raw_bids')
    @patch('os.path.exists', return_value=True)
    def test_to_bids_success(self, mock_exists, mock_write_raw_bids, mock_makedirs):
        raw = MagicMock()
        raw.ch_names = ['Cz', 'Pz', 'Fz']
        raw.info = {'subject_info': {}}
        raw.info['line_freq'] = None
        raw._init_kwargs = {}
        self.handler.read_file = MagicMock(return_value=raw)
        eeg_run = {'eegFile': '/path/file.edf', 'task': 'test_task', 'run': 1}
        bids_basename = self.handler.to_bids(
            raw=raw,
            fileFormat='edf',
            eeg_run=eeg_run,
            ch_type='eeg',
            task='test_task',
            bids_directory='/bids',
            subject_id='sub-01',
            session='ses-01',
            run=1,
            output_time='output-2022-01-01-00h00m00s',
            read_only=False,
            line_freq='60',
            outputFilename='output'
        )
        mock_write_raw_bids.assert_called_once()
        self.assertIsNotNone(bids_basename)

class TestSETHandlerClass(unittest.TestCase):
    def setUp(self):
        self.data = {
            'eegRuns': [{'eegFile': '/path/file.set', 'task': 'test_task', 'run': 1}],
            'bids_directory': '/bids',
            'outputFilename': 'output',
            'participantID': 'sub-01',
            'session': 'ses-01',
            'output_time': 'output-2022-01-01-00h00m00s',
            'read_only': False,
            'powerLineFreq': '60'
        }
        self.handler = SETHandler(self.data)

    @patch('eeg.read_raw_eeglab')
    def test_read_file_success(self, mock_read_raw_eeglab):
        mock_raw = MagicMock()
        mock_read_raw_eeglab.return_value = mock_raw
        raw = self.handler.read_file('/path/file.set')
        self.assertEqual(raw, mock_raw)
        mock_read_raw_eeglab.assert_called_with(input_fname='/path/file.set', preload=False, verbose=True)

    @patch('eeg.read_raw_eeglab')
    def test_read_file_exception(self, mock_read_raw_eeglab):
        mock_read_raw_eeglab.side_effect = Exception("Read error")
        with self.assertRaises(ReadError):
            self.handler.read_file('/path/file.set')

    @patch.object(SETHandler, 'to_bids')
    @patch.object(SETHandler, 'read_file')
    @patch('os.path.exists', return_value=True)
    @patch('shutil.rmtree')
    def test_convert_to_bids(self, mock_rmtree, mock_exists, mock_read_file, mock_to_bids):
        mock_read_file.return_value = MagicMock()
        self.handler.convert_to_bids()
        mock_read_file.assert_called_once_with('/path/file.set')
        mock_to_bids.assert_called_once()

    @patch('os.makedirs')
    @patch('mne_bids.write_raw_bids')
    @patch('os.path.exists', return_value=True)
    def test_to_bids_success(self, mock_exists, mock_write_raw_bids, mock_makedirs):
        raw = MagicMock()
        raw.ch_names = ['Cz', 'Pz', 'Fz']
        raw.info = {'subject_info': {}}
        raw.info['line_freq'] = None
        raw._init_kwargs = {}
        self.handler.read_file = MagicMock(return_value=raw)
        eeg_run = {'eegFile': '/path/file.set', 'task': 'test_task', 'run': 1}
        bids_basename = self.handler.to_bids(
            raw=raw,
            fileFormat='set',
            eeg_run=eeg_run,
            ch_type='eeg',
            task='test_task',
            bids_directory='/bids',
            subject_id='sub-01',
            session='ses-01',
            run=1,
            output_time='output-2022-01-01-00h00m00s',
            read_only=False,
            line_freq='60',
            outputFilename='output'
        )
        mock_write_raw_bids.assert_called_once()
        self.assertIsNotNone(bids_basename)

class TestSETHandlerWithActualFiles(unittest.TestCase):
    def setUp(self):
        # Update these paths to point to the actual location of DCC090_V1_RS.set file
        self.set_file = '/home/nada/code/EEG2BIDS/SET2BIDS/EEG2BIDS/python/test_data/DCC090_V1_RS.set'  # Update this path
        self.bids_directory = '/tmp/test_bids_output'
        self.output_filename = 'output'
        self.participant_id = 'sub-01'
        self.session = 'ses-01'
        self.task = 'test_task'
        self.run = 1
        self.output_time = 'output_time'
        self.read_only = False
        self.power_line_freq = '60'

        # Ensure that the .set files exist
        if not os.path.isfile(self.set_file):
            raise FileNotFoundError(f"SET file not found: {self.set_file}")


    def tearDown(self):
        # Clean up the BIDS output directory after tests
        bids_output_path = os.path.join(self.bids_directory, self.output_filename)
        if os.path.exists(bids_output_path):
            shutil.rmtree(bids_output_path)

    def test_read_file(self):
        data = {}
        handler = SETHandler(data)
        try:
            raw = handler.read_file(self.set_file)
            self.assertIsInstance(raw, mne.io.eeglab.eeglab.RawEEGLAB)
            print("Successfully read the .set file.")
        except ReadError as e:
            self.fail(f"ReadError occurred: {e}")

    def test_convert_to_bids(self):
        data = {
            'eegRuns': [{'eegFile': self.set_file, 'task': self.task, 'run': self.run}],
            'bids_directory': self.bids_directory,
            'outputFilename': self.output_filename,
            'participantID': self.participant_id,
            'session': self.session,
            'output_time': self.output_time,
            'read_only': False,
            'powerLineFreq': self.power_line_freq
        }
        handler = SETHandler(data)
        try:
            handler.convert_to_bids()
            bids_output_path = os.path.join(self.bids_directory, self.output_filename)
            self.assertTrue(os.path.exists(bids_output_path), "BIDS output directory was not created.")
            print("Successfully converted to BIDS format.")
        except (ReadError, WriteError) as e:
            self.fail(f"An error occurred during conversion: {e}")

if __name__ == '__main__':
    unittest.main()
