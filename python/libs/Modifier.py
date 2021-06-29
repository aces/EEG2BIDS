import os
import csv
import json
import re
import shutil
from python.libs.iEEG import metadata as metadata_fields


class Modifier:
    def __init__(self, data):
        self.data = data
        print(self.data)

        print('- Modifier: init started.')

        self.modify_dataset_description_json()
        self.modify_participants_tsv()
        self.modify_participants_json()
        self.clean_dataset_files()
        self.copy_events_tsv()
        self.copy_annotations_files()
        self.modify_eeg_json()

    def get_bids_root_path(self):
        return os.path.join(
            self.data['bids_directory'],
            self.data['output_time']
        )

    def get_eeg_path(self):
        directory_path = 'sub-' + self.data['participantID'].replace('_', '').replace('-', '').replace(' ', '')

        return os.path.join(
            self.get_bids_root_path(),
            directory_path,
            'ses-' + self.data['session'],
            self.data['modality']
        )

    def clean_dataset_files(self):
        if len(self.data['edfData']['files']) > 0:
            # for split recording, clean the duplicates _eeg.json and _channels.tsv
            channels_files = [f for f in os.listdir(self.get_eeg_path()) if f.endswith('_channels.tsv')]
            for i in range(1, len(channels_files)):
                filename = os.path.join(self.get_eeg_path(), channels_files[i])
                os.remove(filename)

            sidecar_files = [f for f in os.listdir(self.get_eeg_path()) if f.endswith('eeg.json')]
            for i in range(1, len(sidecar_files)):
                filename = os.path.join(self.get_eeg_path(), sidecar_files[i])
                os.remove(filename)

            # remove the split suffix in the file names
            fileOrig = os.path.join(self.get_eeg_path(), channels_files[0])
            fileDest = os.path.join(
                self.get_eeg_path(),
                re.sub(r"_split-[0-9]+", '', channels_files[0])
            )
            os.rename(fileOrig, fileDest)

            fileOrig = os.path.join(self.get_eeg_path(), sidecar_files[0])
            fileDest = os.path.join(
                self.get_eeg_path(),
                re.sub(r"_split-[0-9]+", '', sidecar_files[0])
            )
            os.rename(fileOrig, fileDest)

    def modify_dataset_description_json(self):
        file_path = os.path.join(
            self.get_bids_root_path(),
            'dataset_description.json'
        )

        try:
            with open(file_path, "r") as fp:
                file_data = json.load(fp)
                file_data['PreparedBy'] = self.data['preparedBy']

                with open(file_path, "w") as fp:
                    json.dump(file_data, fp, indent=4)

        except IOError:
            print("Could not read or write dataset_description.json file")

    def modify_participants_tsv(self):
        file_path = os.path.join(
            self.get_bids_root_path(),
            'participants.tsv'
        )

        with open(file_path, mode='r') as tsv_file:
            tsv_file.readline()
            reader = csv.reader(tsv_file, delimiter='\t')
            rows = list(reader)
            tsv_file.close()

        # participants.tsv data collected:
        output = []
        for line in rows:
            try:
                participant_id, age, sex, hand = line
                output.append(
                    [
                        participant_id,
                        self.data['age'],
                        self.data['sex'],
                        self.data['hand'],
                        self.data['site_id'],
                        self.data['sub_project_id'],
                        self.data['project_id']
                    ]
                )
            except ValueError:
                try:
                    participant_id, age, sex, hand, site, project, subproject = line
                    output.append(
                        [
                            participant_id,
                            self.data['age'],
                            self.data['sex'],
                            self.data['hand'],
                            self.data['site_id'],
                            self.data['sub_project_id'],
                            self.data['project_id']
                        ]
                    )
                except ValueError:
                    print('error: ValueError')

        with open(file_path, mode='w', newline='') as tsv_file:
            headers = ['participant_id', 'age', 'sex', 'hand', 'site', 'subproject', 'project']
            writer = csv.writer(tsv_file, delimiter='\t')
            writer.writerow(headers)
            writer.writerows(output)
            tsv_file.close()

    def modify_participants_json(self):
        file_path = os.path.join(
            self.get_bids_root_path(),
            'participants.json'
        )

        with open(file_path, mode='r+', encoding='utf-8') as json_file:
            json_data = json.load(json_file)
            user_data = {
                'site': {
                    'Description': "Site of the testing"
                },
                'subproject': {
                    'Description': "Subproject of the participant"
                },
                'project': {
                    'Description': "Project of the participant"
                },
                'debug': {
                    'Version': self.data['appVersion']
                }
            }
            json_data.update(user_data)
            json_file.seek(0)
            json.dump(json_data, json_file, indent=4)
            json_file.close()

    def copy_annotations_files(self):
        if not self.data['annotations_tsv'] and not self.data['annotations_json']:
            return

        file = os.path.join(
            self.get_bids_root_path(),
            '.bidsignore'
        )

        with open(file, mode='w', newline='') as bidsignore:
            bidsignore.write('*_annotations.json\n')
            bidsignore.write('*_annotations.tsv\n')
            bidsignore.close()

        edf_file = [f for f in os.listdir(self.get_eeg_path()) if f.endswith('.edf')]
        filename = os.path.join(self.get_eeg_path(), re.sub(r"_i?eeg.edf", '_annotations', edf_file[0]))

        if self.data['annotations_tsv']:
            shutil.copyfile(
                self.data['annotations_tsv'],
                os.path.join(self.get_eeg_path(), filename + '.tsv')
            )

        if self.data['annotations_json']:
            shutil.copyfile(
                self.data['annotations_json'],
                os.path.join(self.get_eeg_path(), filename + '.json')
            )

    def copy_events_tsv(self):
        if not self.data['events_tsv']:
            return

        # events.tsv data collected:
        output = []

        # Open user supplied events.tsv and grab data.
        with open(self.data['events_tsv'], mode='r', newline='') as tsv_file:
            tsv_file.readline()
            reader = csv.reader(tsv_file, delimiter='\t')
            rows = list(reader)
            tsv_file.close()

        for line in rows:
            try:
                onset, duration, trial_type, value, sample = line
                output.append([onset, duration, trial_type, value, sample])
            except ValueError:
                try:
                    onset, duration, trial_type = line
                    output.append([onset, duration, trial_type, 'n/a', 'n/a'])
                except ValueError:
                    print('error: ValueError')

        # The BIDS events.tsv location:
        start_path = self.get_eeg_path()

        path_events_tsv = ''
        eeg_edf = ''
        # We search for the events.tsv file.
        for path, dirs, files in os.walk(start_path):
            for filename in files:
                temp = os.path.join(path, filename)
                if temp.endswith('events.tsv'):
                    path_events_tsv = temp
                if temp.endswith('eeg.edf'):
                    eeg_edf = os.path.basename(temp)

        # We now open BIDS events.tsv file if it exists
        if path_events_tsv:
            try:
                with open(path_events_tsv, mode='r', newline='') as tsv_file:
                    tsv_file.readline()
                    reader = csv.reader(tsv_file, delimiter='\t')
                    rows = list(reader)
                    tsv_file.close()

                for line in rows:
                    try:
                        onset, duration, trial_type, value, sample = line
                        output.append([onset, duration, trial_type, value, sample])
                    except ValueError:
                        try:
                            onset, duration, trial_type = line
                            output.append([onset, duration, trial_type, 'n/a', 'n/a'])
                        except ValueError:
                            print('error: ValueError')
            except:
                print('No events.tsv found in the BIDS folder.')
        else:
            path_events_tsv = start_path + '/' + re.sub(r"_i?eeg.edf", '_events.tsv', eeg_edf)

        # output is an array of arrays
        # sort by first element in array
        output.sort(key=lambda x: float(x[0]))

        # overwrite BIDS events.tsv with collected data.
        with open(path_events_tsv, mode='a+', newline='') as tsv_file:
            headers = ['onset', 'duration', 'trial_type', 'value', 'sample']
            writer = csv.writer(tsv_file, delimiter='\t')
            writer.writerow(headers)
            writer.writerows(output)
            tsv_file.close()

    def modify_eeg_json(self):
        eeg_json = [f for f in os.listdir(self.get_eeg_path()) if f.endswith('eeg.json')]
        if len(eeg_json) != 1:
            raise ValueError('Found more than one eeg.json file')

        file_path = os.path.join(self.get_eeg_path(), eeg_json[0])

        try:
            with open(file_path, "r") as fp:
                file_data = json.load(fp)
                file_data["SoftwareFilters"] = self.data['software_filters']
                file_data["RecordingType"] = self.data['recording_type']

                referenceField = metadata_fields[self.data["modality"]]['Reference']
                file_data[referenceField] = self.data['reference']

                if 'metadata' in self.data['bidsMetadata'] and 'invalid_keys' in self.data['bidsMetadata']:
                    for key in self.data['bidsMetadata']['metadata']:
                        if key not in self.data['bidsMetadata']['invalid_keys']:
                            fieldName = metadata_fields[self.data["modality"]][key]
                            file_data[fieldName] = self.data['bidsMetadata']['metadata'][key]

                with open(file_path, "w") as fp:
                    json.dump(file_data, fp, indent=4)

        except IOError as e:
            print(e)
            print("Could not read or write eeg.json file")
