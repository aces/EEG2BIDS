import os
import mne
from python.libs import EDF
from python.libs import TSV
from mne_bids import write_raw_bids, BIDSPath


class Converter:
    m_info = ''

    # data: {
    #  file_path: '', // where file located.
    #  bids_directory: '', // where to output.
    #  read_only: true/false // read without write or write.
    def __init__(self, data):
        # json_object = json.loads(data)  # file_path, bids_directory, read_only
        print('- Converter: init started.')
        self.to_bids(
            file=data['file_path'],
            bids_directory=data['bids_directory'],
            read_only=data['read_only'],
            line_freq=data['line_freq']
        )

    @staticmethod
    def validate(path):
        if os.path.isfile(path):
            return True
        else:
            print('File not found or is not file: %s', path)
            return False

    @classmethod
    def set_m_info(cls, value):
        cls.m_info = value

    def to_bids(self,
                file,
                bids_directory,
                task='test',
                ch_type='seeg',
                read_only=False,
                line_freq=60):
        if self.validate(file):
            reader = EDF.EDFReader(fname=file)
            m_info, c_info = reader.open(fname=file)
            self.set_m_info(m_info)
            print('m_info is ')
            print(m_info)
            print('c_info is ')
            print(c_info)
            if read_only:
                return True
            raw = mne.io.read_raw_edf(input_fname=file)
            print('VIEW 1:')
            print(raw)
            if read_only:
                return True
            raw.set_channel_types({ch: ch_type for ch in raw.ch_names})
            print('VIEW 2:')
            print(raw)
            bids_root = bids_directory
            # subject = m_info['subject_id'].replace('_', '').replace('-', '').replace(' ', '')
            subject = 'alizee'
            m_info['subject_id'] = 'alizee'
            print('LOOK:')
            print(subject)
            # subject = 'alizee'  # modified will output sub-alizee
            print('END~~~~~~~~~~~')
            bids_basename = BIDSPath(subject=subject, task=task, root=bids_root, acquisition="seeg")
            raw.info['line_freq'] = line_freq
            raw.info['subject_info'] = {
                # 'his_id': "test",
                # 'birthday': (1993, 1, 26),
                # 'sex': 1,
                # 'hand': 2,
            }
            raw._init_kwargs = {
                'input_fname': file,
                'eog': None,
                'misc': None,
                'stim_channel': 'auto',
                'exclude': (),
                'preload': False,
                'verbose': None
            }
            write_raw_bids(raw, bids_basename, anonymize=dict(daysback=33000), overwrite=False, verbose=False)
            print('finished')
        else:
            print('File not found or is not file: %s', file)


class Modifier:
    def __init__(self, data):
        print('- Modifier: init started.')
        # print(data)
        TSV.Writer(data)  # includes SiteID to participants.tsv
        TSV.Copy(data)  # copies events.tsv to ieeg directory.
