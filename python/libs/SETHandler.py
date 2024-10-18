import os
import csv
import pymatreader
import numpy as np
import warnings
import logging

from python.libs.BaseHandler import BaseHandler, ReadError, WriteError, channel_map
from mne.io import read_raw_eeglab
from mne_bids.write import write_raw_bids
from mne_bids.path import BIDSPath
from mne.channels import make_dig_montage

class SETHandler(BaseHandler):
    """
    Handler class for SET EEG data.
    """
    def read_file(self, file):
        try:
            raw = read_raw_eeglab(input_fname=file, preload=False, verbose=False)
            raw = raw.anonymize()
            self.set_m_info(raw.info)
            logging.info(f"Read and anonymized SET file: {file}")
            return raw
        except Exception as ex:
            logging.error(f"Error reading SET file {file}: {ex}")
            raise ReadError(ex)

    def convert_to_bids(self):
        logging.info('- SETHandler: convert_to_bids started.')
        data = self.data
        dest_path = os.path.join(data['bids_directory'], data['outputFilename'])
        if os.path.exists(dest_path):
            shutil.rmtree(dest_path)
            logging.info(f"Removed existing BIDS directory: {dest_path}")

        for i, eegRun in enumerate(data['eegRuns']):
            raw = self.read_file(eegRun['eegFile'])
            eegRun['eegBIDSBasename'] = self.to_bids(
                raw=raw,
                fileFormat='set',
                eeg_run=eegRun,
                ch_type='eeg',
                task=eegRun.get('task', 'task'),
                bids_directory=data['bids_directory'],
                subject_id=data['participantID'],
                session=data['session'],
                run=(eegRun.get('run') if eegRun.get('run') != -1 else None),
                output_time=data['output_time'],
                read_only=data.get('read_only', False),
                line_freq=data.get('powerLineFreq', 'n/a'),
                outputFilename=data.get('outputFilename', 'bids_output')
            )

    def to_bids(self, **kwargs):
        raw = kwargs['raw']
        file = kwargs['eeg_run']['eegFile']
        ch_type = kwargs['ch_type']

        if self.validate(file):
            ch_types = {}
            for ch in raw.ch_names:
                ch_name = ch.lower()
                ch_types[ch] = next((ctype for key, ctype in channel_map.items() if key in ch_name), ch_type)

            raw.set_channel_types(ch_types)
            logging.info(f"Set channel types for file: {file}")

            m_info = raw.info
            m_info['subject_info'] = {'his_id': kwargs['subject_id']}
            subject = m_info['subject_info']['his_id'].replace('_', '').replace('-', '').replace(' ', '')

            if kwargs['line_freq'].isnumeric():
                line_freq = int(kwargs['line_freq'])
            else:
                line_freq = None
            raw.info['line_freq'] = line_freq

            # Populate landmarks before writing
            self._populate_back_landmarks(raw, file)

            root = os.path.join(kwargs['bids_directory'], kwargs['outputFilename'])
            os.makedirs(root, exist_ok=True)

            bids_basename = BIDSPath(
                subject=subject,
                task=kwargs['task'],
                root=root,
                acquisition=kwargs['ch_type'],
                run=kwargs['run'],
                datatype='eeg',
                session=kwargs['session']
            )

            try:
                write_raw_bids(raw, bids_basename, allow_preload=True, overwrite=False, format="EEGLAB", verbose=False)
                # Regenerate events file after writing
                self._regenerate_events_file(bids_basename, file)
                logging.info(f"Wrote BIDS file: {bids_basename.fpath}")
                return bids_basename.basename
            except Exception as ex:
                logging.error(f"Error writing BIDS file {bids_basename.fpath}: {ex}")
                raise WriteError(ex)
        else:
            logging.error(f"File not found or is not a file: {file}")

    def _populate_back_landmarks(self, raw, file):
        """
        Correctly set the nasion, lpa, and rpa landmarks in the montage.
        """
        try:
            eeg_mat = pymatreader.read_mat(file)
            urchanlocs_dict = eeg_mat.get('EEG', {}).get('urchanlocs', eeg_mat.get('urchanlocs'))

            nasion_index = urchanlocs_dict['description'].index('Nasion')
            lpa_index = urchanlocs_dict['description'].index('Left periauricular point')
            rpa_index = urchanlocs_dict['description'].index('Right periauricular point')

            nasion_coord = [
                urchanlocs_dict['X'][nasion_index],
                urchanlocs_dict['Y'][nasion_index],
                urchanlocs_dict['Z'][nasion_index]
            ]
            lpa_coord = [
                urchanlocs_dict['X'][lpa_index],
                urchanlocs_dict['Y'][lpa_index],
                urchanlocs_dict['Z'][lpa_index]
            ]
            rpa_coord = [
                urchanlocs_dict['X'][rpa_index],
                urchanlocs_dict['Y'][rpa_index],
                urchanlocs_dict['Z'][rpa_index]
            ]

            new_montage = make_dig_montage(
                ch_pos=raw.get_montage().get_positions()['ch_pos'],
                coord_frame='head',
                nasion=nasion_coord,
                lpa=lpa_coord,
                rpa=rpa_coord
            )
            raw.set_montage(new_montage)
            logging.info(f"Set montage landmarks for file: {file}")
            return nasion_coord, lpa_coord, rpa_coord
        except Exception as e:
            logging.error(f"Error populating back landmarks for file {file}: {e}")
            raise WriteError(e)

    def _regenerate_events_file(self, bids_basename, file):
        """
        Regenerate the events.tsv file based on the original data.
        """
        try:
            events_fpath = os.path.splitext(bids_basename.fpath)[0] + '_events.tsv'
            eeg_mat = pymatreader.read_mat(file)
            event_dict = eeg_mat.get('EEG', {}).get('event', eeg_mat.get('event'))

            for key in event_dict.keys():
                for idx in range(len(event_dict[key])):
                    if isinstance(event_dict[key][idx], np.ndarray) and event_dict[key][idx].size == 0:
                        event_dict[key][idx] = float("NaN")

            with open(events_fpath, 'w', newline='') as FILE:
                writer = csv.writer(FILE, delimiter='\t')
                tsv_columns = ["trial_type" if name == "type" else name for name in event_dict.keys()]
                writer.writerow(tsv_columns)
                writer.writerows(zip(*event_dict.values()))
            logging.info(f"Regenerated events file: {events_fpath}")
        except Exception as e:
            logging.error(f"Error regenerating events file for {file}: {e}")
            raise WriteError(e)

    def get_file_info(self, files):
        """
        Retrieve information about multiple SET files.
        """
        file_info_list = []
        for file in files:
            try:
                if self.validate(file['path']):
                    raw = read_raw_eeglab(input_fname=file['path'], preload=False, verbose=False)
                    m_info = raw.info
                    file_info = {
                        'file_name': os.path.basename(file['path']),
                        'number_of_channels': m_info['nchan'],
                        'sampling_frequency': m_info['sfreq'],
                        'duration': raw.times[-1],
                        'start_date': m_info['meas_date'],
                    }
                    file_info_list.append(file_info)
                    logging.info(f"Retrieved info for file: {file['path']}")
                else:
                    file_info_list.append({'error': f'File not found: {file["path"]}'})
            except Exception as e:
                file_info_list.append({'error': str(e)})
                logging.error(f"Error retrieving info for file {file['path']}: {e}")
        return file_info_list
