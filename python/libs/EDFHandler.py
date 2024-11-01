from copy import deepcopy
from math import floor
from struct import pack, unpack
import os
import re
import warnings
import numpy as np
import tarfile
import logging

from python.libs.BaseHandler import BaseHandler, ReadError, WriteError, channel_map
from mne.io import read_raw_edf
from mne_bids.write import write_raw_bids
from mne_bids.path import BIDSPath
from mne.channels import make_dig_montage

def padtrim(buf, num):
    """
    Pads or trims the input string to fit the specified length.
    """
    num -= len(buf)
    if num >= 0:
        return str(buf) + ' ' * num
    else:
        return buf[0:num]

class EDFWriter:
    """
    Class for writing EDF files.
    """
    def __init__(self, fname=None):
        self.fname = None
        self.meas_info = None
        self.chan_info = None
        self.calibrate = None
        self.offset = None
        self.n_records = 0
        if fname:
            self.open(fname)

    def open(self, fname):
        with open(fname, 'wb') as fid:
            assert fid.tell() == 0
        self.fname = fname

    def close(self):
        """
        Update the number of records in the EDF header and finalize the file.
        """
        meas_info = self.meas_info
        chan_info = self.chan_info
        tempname = self.fname + '.bak'
        os.rename(self.fname, tempname)
        with open(tempname, 'rb') as fid1:
            assert fid1.tell() == 0
            with open(self.fname, 'wb') as fid2:
                assert fid2.tell() == 0
                fid2.write(fid1.read(236))
                fid1.read(8)  # Skip these 8 bytes
                fid2.write(padtrim(str(self.n_records), 8).encode('utf-8'))
                fid2.write(fid1.read(meas_info['data_offset'] - 236 - 8))
                blocksize = np.sum(chan_info['n_samps']) * meas_info['data_size']
                for block in range(self.n_records):
                    fid2.write(fid1.read(blocksize))
        os.remove(tempname)
        # Reset all attributes
        self.fname = None
        self.meas_info = None
        self.chan_info = None
        self.calibrate = None
        self.offset = None
        self.n_records = 0

    def writeHeader(self, header):
        """
        Write the EDF header to the file.
        """
        meas_info = header[0]
        chan_info = header[1]
        meas_size = 256
        chan_size = 256 * meas_info['nchan']
        with open(self.fname, 'wb') as fid:
            assert fid.tell() == 0

            # Fill in missing or incomplete information
            meas_info.setdefault('subject_id', '')
            meas_info.setdefault('recording_id', '')
            meas_info.setdefault('subtype', 'edf')
            nchan = meas_info['nchan']
            chan_info.setdefault('ch_names', [str(i) for i in range(nchan)])
            chan_info.setdefault('transducers', ['' for _ in range(nchan)])
            chan_info.setdefault('units', ['' for _ in range(nchan)])

            if meas_info['subtype'] in ('24BIT', 'bdf'):
                meas_info['data_size'] = 3  # 24-bit integers
            else:
                meas_info['data_size'] = 2  # 16-bit integers

            fid.write(padtrim('0', 8).encode('utf-8'))
            fid.write(padtrim(meas_info['subject_id'], 80).encode('utf-8'))
            fid.write(padtrim(meas_info['recording_id'], 80).encode('utf-8'))
            fid.write(
                padtrim(f"{meas_info['day']:02d}.{meas_info['month']:02d}.{meas_info['year']:02d}", 8).encode('utf-8')
            )
            fid.write(
                padtrim(f"{meas_info['hour']:02d}.{meas_info['minute']:02d}.{meas_info['second']:02d}", 8).encode('utf-8')
            )
            fid.write(padtrim(str(meas_size + chan_size), 8).encode('utf-8'))
            fid.write((' ' * 44).encode('utf-8'))
            fid.write(padtrim(str(-1), 8).encode('utf-8'))  # Placeholder for n_records
            fid.write(padtrim(str(meas_info['record_length']), 8).encode('utf-8'))
            fid.write(padtrim(str(meas_info['nchan']), 4).encode('utf-8'))

            # Ensure that these are all numpy arrays rather than lists
            for key in ['physical_min', 'transducers', 'physical_max', 'digital_max', 'ch_names', 'n_samps', 'units', 'digital_min']:
                chan_info[key] = np.asarray(chan_info[key])

            for i in range(meas_info['nchan']):
                fid.write(padtrim(chan_info['ch_names'][i], 16).encode('utf-8'))
            for i in range(meas_info['nchan']):
                fid.write(padtrim(chan_info['transducers'][i], 80).encode('utf-8'))
            for i in range(meas_info['nchan']):
                fid.write(padtrim(chan_info['units'][i], 8).encode('utf-8'))
            for i in range(meas_info['nchan']):
                fid.write(padtrim(str(chan_info['physical_min'][i]), 8).encode('utf-8'))
            for i in range(meas_info['nchan']):
                fid.write(padtrim(str(chan_info['physical_max'][i]), 8).encode('utf-8'))
            for i in range(meas_info['nchan']):
                fid.write(padtrim(str(chan_info['digital_min'][i]), 8).encode('utf-8'))
            for i in range(meas_info['nchan']):
                fid.write(padtrim(str(chan_info['digital_max'][i]), 8).encode('utf-8'))
            for i in range(meas_info['nchan']):
                fid.write((' ' * 80).encode('utf-8'))  # Prefiltering
            for i in range(meas_info['nchan']):
                fid.write(padtrim(str(chan_info['n_samps'][i]), 8).encode('utf-8'))
            for i in range(meas_info['nchan']):
                fid.write((' ' * 32).encode('utf-8'))  # Reserved

            meas_info['data_offset'] = fid.tell()

    def writeBlock(self, data):
            """
            Write a block of data to the EDF file.
            """
            meas_info = self.meas_info
            chan_info = self.chan_info
            with open(self.fname, 'ab') as fid:
                assert fid.tell() > 0
                for i in range(meas_info['nchan']):
                    raw = deepcopy(data[i])

                    assert len(raw) == chan_info['n_samps'][i], "Sample count mismatch."

                    if min(raw) < chan_info['physical_min'][i]:
                        warnings.warn(f"Value below physical_min: {min(raw)} in channel {chan_info['ch_names'][i]}")
                    if max(raw) > chan_info['physical_max'][i]:
                        warnings.warn(f"Value above physical_max: {max(raw)} in channel {chan_info['ch_names'][i]}")

                    raw = (raw - self.offset[i]) / self.calibrate[i]
                    raw = np.asarray(raw, dtype=np.int16)
                    buf = [pack('h', x) for x in raw]
                    for val in buf:
                        fid.write(val)
                self.n_records += 1

class EDFReader:
    """
    Class for reading EDF files.
    """
    def __init__(self, fname=None):
        self.fname = None
        self.meas_info = None
        self.chan_info = None
        self.calibrate = None
        self.offset = None
        if fname:
            self.open(fname)

    def open(self, fname):
        with open(fname, 'rb') as fid:
            assert fid.tell() == 0
        self.fname = fname
        self.readHeader()
        return self.meas_info, self.chan_info

    def close(self):
        self.fname = None
        self.meas_info = None
        self.chan_info = None
        self.calibrate = None
        self.offset = None

    def readHeader(self):
        """
        Read the EDF header from the file.
        """
        meas_info = {}
        chan_info = {}
        with open(self.fname, 'rb') as fid:
            assert fid.tell() == 0

            meas_info['magic'] = fid.read(8).strip().decode()
            meas_info['subject_id'] = fid.read(80).strip().decode()  # Subject ID
            meas_info['recording_id'] = fid.read(80).strip().decode()  # Recording ID

            day, month, year = [int(x) for x in re.findall('(\d+)', fid.read(8).decode())]
            hour, minute, second = [int(x) for x in re.findall('(\d+)', fid.read(8).decode())]
            meas_info['day'] = day
            meas_info['month'] = month
            meas_info['year'] = year
            meas_info['hour'] = hour
            meas_info['minute'] = minute
            meas_info['second'] = second

            meas_info['data_offset'] = header_nbytes = int(fid.read(8).decode())

            subtype = fid.read(44).strip().decode()[:5]
            if len(subtype) > 0:
                meas_info['subtype'] = subtype
            else:
                meas_info['subtype'] = os.path.splitext(self.fname)[1][1:].lower()

            if meas_info['subtype'] in ('24BIT', 'bdf'):
                meas_info['data_size'] = 3  # 24-bit integers
            else:
                meas_info['data_size'] = 2  # 16-bit integers

            meas_info['n_records'] = n_records = int(fid.read(8).decode())

            # Record length in seconds
            record_length = float(fid.read(8).decode())
            if record_length == 0:
                meas_info['record_length'] = record_length = 1.0
                warnings.warn('Incorrect record length in header. Defaulting to 1 second.')
            else:
                meas_info['record_length'] = record_length
            meas_info['nchan'] = nchan = int(fid.read(4).decode())

            channels = list(range(nchan))
            chan_info['ch_names'] = [fid.read(16).strip().decode() for _ in channels]
            chan_info['transducers'] = [fid.read(80).strip().decode() for _ in channels]
            chan_info['units'] = [fid.read(8).strip().decode() for _ in channels]
            chan_info['physical_min'] = physical_min = np.array([float(fid.read(8).decode()) for _ in channels])
            chan_info['physical_max'] = physical_max = np.array([float(fid.read(8).decode()) for _ in channels])
            chan_info['digital_min'] = digital_min = np.array([float(fid.read(8).decode()) for _ in channels])
            chan_info['digital_max'] = digital_max = np.array([float(fid.read(8).decode()) for _ in channels])

            prefiltering = [fid.read(80).strip().decode() for _ in channels][:-1]
            highpass = np.ravel([re.findall('HP:\s+(\w+)', filt) for filt in prefiltering])
            lowpass = np.ravel([re.findall('LP:\s+(\w+)', filt) for filt in prefiltering])
            high_pass_default = 0.0
            if highpass.size == 0:
                meas_info['highpass'] = high_pass_default
            elif all(highpass):
                if highpass[0] == 'NaN':
                    meas_info['highpass'] = high_pass_default
                elif highpass[0] == 'DC':
                    meas_info['highpass'] = 0.0
                else:
                    meas_info['highpass'] = float(highpass[0])
            else:
                meas_info['highpass'] = float(np.max(highpass))
                warnings.warn('Channels have different highpass filters. Highest filter setting will be stored.')

            if lowpass.size == 0:
                meas_info['lowpass'] = None
            elif all(lowpass):
                if lowpass[0] == 'NaN':
                    meas_info['lowpass'] = None
                else:
                    meas_info['lowpass'] = float(lowpass[0])
            else:
                meas_info['lowpass'] = float(np.min(lowpass))
                warnings.warn('Channels have different lowpass filters. Lowest filter setting will be stored.')

            # Number of samples per record
            chan_info['n_samps'] = n_samps = np.array([int(fid.read(8).decode()) for _ in channels])

            fid.read(32 * meas_info['nchan']).decode()  # Reserved
            assert fid.tell() == header_nbytes, "Header size mismatch."

            if meas_info['n_records'] == -1:
                # If n_records is not updated, estimate it
                tot_samps = (os.path.getsize(self.fname) - meas_info['data_offset']) / meas_info['data_size']
                meas_info['n_records'] = tot_samps / sum(n_samps)

    def readBlock(self, block):
            """
            Read a specific block (record) from the EDF file.
            """
            assert block >= 0, "Block number must be non-negative."
            meas_info = self.meas_info
            chan_info = self.chan_info
            data = []
            with open(self.fname, 'rb') as fid:
                assert fid.tell() == 0, "File pointer is not at the beginning."
                blocksize = np.sum(chan_info['n_samps']) * meas_info['data_size']
                fid.seek(meas_info['data_offset'] + block * blocksize)
                for i in range(meas_info['nchan']):
                    buf = fid.read(chan_info['n_samps'][i] * meas_info['data_size'])
                    raw = np.asarray(unpack('<{}h'.format(chan_info['n_samps'][i]), buf), dtype=np.float32)
                    raw = (raw * self.calibrate[i]) + self.offset[i]
                    data.append(raw)
            return data

    def readSamples(self, channel, begsample, endsample):
            """
            Read samples for a specific channel between begsample and endsample.
            """
            meas_info = self.meas_info
            chan_info = self.chan_info
            n_samps = chan_info['n_samps'][channel]
            begblock = int(floor(begsample / n_samps))
            endblock = int(floor(endsample / n_samps))
            data = self.readBlock(begblock)[channel]
            for block in range(begblock + 1, endblock + 1):
                data = np.append(data, self.readBlock(block)[channel])
            begsample -= begblock * n_samps
            endsample -= begblock * n_samps
            return data[begsample:(endsample + 1)]

        # Helper functions to mimic python-edf behavior
    def getSignalTextLabels(self):
            return [str(x) for x in self.chan_info['ch_names']]

    def getNSignals(self):
            return self.meas_info['nchan']

    def getSignalFreqs(self):
            return self.chan_info['n_samps'] / self.meas_info['record_length']

    def getNSamples(self):
            return self.chan_info['n_samps'] * self.meas_info['n_records']

    def readSignal(self, chanindx):
            begsample = 0
            endsample = self.chan_info['n_samps'][chanindx] * self.meas_info['n_records'] - 1
            return self.readSamples(chanindx, begsample, endsample)

class EDFHandler(BaseHandler):
    """
    Handler class for EDF EEG data.
    """
    def read_file(self, file):
        try:
            raw = read_raw_edf(input_fname=file, preload=False, verbose=False)
            self.set_m_info(raw.info)
            logging.info(f"Read EDF file: {file}")
            return raw
        except Exception as ex:
            logging.error(f"Error reading EDF file {file}: {ex}")
            raise ReadError(ex)

    def convert_to_bids(self):
        logging.info('- EDFHandler: convert_to_bids started.')
        data = self.data
        dest_path = os.path.join(data['bids_directory'], data['outputFilename'])
        if os.path.exists(dest_path):
            shutil.rmtree(dest_path)
            logging.info(f"Removed existing BIDS directory: {dest_path}")

        for i, eegRun in enumerate(data['eegRuns']):
            raw = self.read_file(eegRun['eegFile'])
            eegRun['eegBIDSBasename'] = self.to_bids(
                raw=raw,
                fileFormat='edf',
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
                write_raw_bids(raw, bids_basename, allow_preload=False, overwrite=False, verbose=False)
                with open(bids_basename, 'r+b') as f:
                        f.seek(8)  # id_info field starts 8 bytes in
                        f.write(bytes("X X X X".ljust(80), 'ascii'))
                logging.info(f"Wrote BIDS file: {bids_basename.fpath}")
                # Removed potentially corrupting byte manipulation
                return bids_basename.basename
            except Exception as ex:
                logging.error(f"Error writing BIDS file {bids_basename.fpath}: {ex}")
                raise WriteError(ex)
        else:
            logging.error(f"File not found or is not a file: {file}")

    def get_file_info(self, files):
        """
        Retrieve information about multiple EDF files.
        """
        file_info_list = []
        for file in files:
            try:
                if self.validate(file['path']):
                    raw = read_raw_edf(input_fname=file['path'], preload=False, verbose=False)
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
