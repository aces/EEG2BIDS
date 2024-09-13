# test_set2bids.py
import unittest
from unittest.mock import patch, MagicMock
from set2bids import create_handler, SocketServer
from eeg import EDFHandler, SETHandler

# test_set2bids.py
import unittest
from unittest.mock import patch, MagicMock
import os
import shutil
from set2bids import create_handler, SocketServer
from eeg import EDFHandler, SETHandler

class TestCreateHandlerFunction(unittest.TestCase):
    def test_create_handler_edf(self):
        data = {'key': 'value'}
        handler = create_handler('edf', data)
        self.assertIsInstance(handler, EDFHandler)
        self.assertEqual(handler.data, data)
    
    def test_create_handler_set(self):
        data = {'key': 'value'}
        handler = create_handler('set', data)
        self.assertIsInstance(handler, SETHandler)
        self.assertEqual(handler.data, data)
    
    def test_create_handler_invalid(self):
        data = {'key': 'value'}
        with self.assertRaises(ValueError):
            create_handler('unknown_format', data)

class TestSocketServerWithActualFiles(unittest.TestCase):
    def setUp(self):
        self.set_file = '/'  # Update this path
        self.bids_directory = '/tmp/test_bids_output'
        self.participant_id = 'sub-01'
        self.session = 'ses-01'
        self.task = 'test_task'
        self.run = 1
        self.power_line_freq = '60'

        # Ensure that the .set file exists
        if not os.path.isfile(self.set_file):
            raise FileNotFoundError(f"SET file not found: {self.set_file}")

        self.server = SocketServer()
        self.sid = 'test_sid'
        self.server.sio = MagicMock()
        self.server.loris_api = MagicMock()
        self.server.tar_handler = MagicMock()

    def tearDown(self):
        # Clean up the BIDS output directory after tests
        bids_output_path = os.path.join(self.bids_directory)
        if os.path.exists(bids_output_path):
            shutil.rmtree(bids_output_path)

    def test_get_eeg_data_with_actual_file(self):
        data = {
            'files': [{'name': os.path.basename(self.set_file), 'path': self.set_file}]
        }
        # Since get_eeg_data uses create_handler and handler.get_file_info,
        # we'll let it process the actual file.
        # Ensure that create_handler can handle the file extension correctly.
        self.server.get_eeg_data(self.sid, data)
        # Check that eeg_data event was emitted
        self.server.sio.emit.assert_called_with('eeg_data', unittest.mock.ANY)
        # Optionally, check the content of the emitted data
        emitted_data = self.server.sio.emit.call_args[0][1]
        print("eeg_data emitted:", emitted_data)

    def test_eeg_to_bids_with_actual_files(self):
        data = {
            'eegData': {
                'files': [{'name': os.path.basename(self.set_file), 'path': self.set_file}]
            },
            'bids_directory': self.bids_directory,
            'session': self.session,
            'participantID': self.participant_id,
            'powerLineFreq': self.power_line_freq,
            'eegRuns': [{'eegFile': self.set_file, 'task': self.task, 'run': self.run}],
            'outputFilename': 'output',
            'output_time': 'output_time',
            'read_only': False
        }

        # We'll not mock eventlet.tpool.execute to allow actual processing
        # Since eeg_to_bids uses tpool.execute, which requires eventlet's cooperative concurrency,
        # we'll modify eeg_to_bids to call eeg_to_bids_thread directly for testing purposes

        # Patch tpool.execute to call the function directly
        with patch('eventlet.tpool.execute', side_effect=lambda func, *args, **kwargs: func(*args, **kwargs)):
            self.server.eeg_to_bids(self.sid, data)
            # Check that bids event was emitted
            self.server.sio.emit.assert_called_with('bids', unittest.mock.ANY)
            # Optionally, check the content of the emitted data
            emitted_data = self.server.sio.emit.call_args[0][1]
            print("bids emitted:", emitted_data)
            # Verify that the BIDS directory was created
            bids_output_path = os.path.join(self.bids_directory, 'output')
            self.assertTrue(os.path.exists(bids_output_path), "BIDS output directory was not created.")
            print("Successfully converted EEG data to BIDS format via SocketServer.")

if __name__ == '__main__':
    unittest.main()

