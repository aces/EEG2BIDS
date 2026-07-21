import os
import csv
import json
import re
import shutil
from eeg2bids.converter import metadata as metadata_fields

class Modifier:
    def __init__(self, data):
        self.data = data
        print(self.data)

        print('- Modifier: init started.')

        self.modify_dataset_description_json()
        self.modify_participants_tsv()
        self.modify_participants_json()
        self.clean_dataset_files()
        self.copy_event_files()
        self.copy_annotation_files()
        self.modify_eeg_json()


    def get_bids_root_path(self):
        return os.path.join(
            self.data['bids_directory'],
            self.data['output_time']
        )

    def get_eeg_path(self, relative=False):
        directory_path = 'sub-' + self.data['participantID']

        if relative:
            return os.path.join(
                directory_path,
                'ses-' + self.data['session'],
                self.data['modality']
            )

        return os.path.join(
            self.get_bids_root_path(),
            directory_path,
            'ses-' + self.data['session'],
            self.data['modality']
        )


    def clean_dataset_files(self):
        if len(self.data['recordingData']['files']) > 0:
            # for multiple run recording, clean the duplicate _channels.tsv
            channels_files = [f for f in os.listdir(self.get_eeg_path()) if f.endswith('_channels.tsv')]
            for i in range(1, len(channels_files)):
                filename = os.path.join(self.get_eeg_path(), channels_files[i])
                os.remove(filename)

            # remove the run suffix in the file names
            fileOrig = os.path.join(self.get_eeg_path(), channels_files[0])
            fileDest = os.path.join(
                self.get_eeg_path(),
                re.sub(r"_run-[0-9]+", '', channels_files[0])
            )
            os.rename(fileOrig, fileDest)

        # remove the mne citations README
        filename = os.path.join(self.get_bids_root_path(), 'README')
        try:
            os.remove(filename)
        except FileNotFoundError:
            print("No README file found")


    def modify_dataset_description_json(self):
        # EEG2BIDS Wizard version
        appVersion = 'unknown'
        
        try:
            with open(os.path.join(os.path.dirname(__file__), '../package.json'), "r") as fp:
                file_data = json.load(fp)
                appVersion = file_data['version']
        except IOError as e:
            print(e)
            print("Could not read package.json file")

        file_path = os.path.join(
            self.get_bids_root_path(),
            'dataset_description.json'
        )

        try:
            with open(file_path, "r") as fp:
                file_data = json.load(fp)
                file_data['PreparedBy'] = self.data['preparedBy']
                file_data['Eeg2bidsVersion'] = appVersion
                file_data['Name'] = self.data['participantID'] + '_' + self.data['session']

                with open(file_path, "w") as fp:
                    json.dump(file_data, fp, indent=4)

        except IOError:
            print("Could not read or write dataset_description.json file")


    def modify_participants_tsv(self):
        file_path = os.path.join(
            self.get_bids_root_path(),
            'participants.tsv'
        )

        # Read participant_id by column name rather than unpacking a fixed
        # number of positional columns. mne-bids emits participants.tsv with a
        # layout that varies by version (e.g. participant_id, age, sex, hand,
        # weight, height), so the previous positional unpack -- which required
        # exactly 4 or 7 columns -- raised ValueError on every row, silently
        # dropped them all, and left participants.tsv with only a header (#145).
        # The participant_id column is the one stable BIDS column; the remaining
        # values come from the LORIS-collected data regardless.
        with open(file_path, mode='r', newline='') as tsv_file:
            reader = csv.DictReader(tsv_file, delimiter='\t')
            participant_ids = [row['participant_id'] for row in reader]

        # participants.tsv data collected:
        output = []
        for participant_id in participant_ids:
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
                }
            }
            json_data.update(user_data)
            json_file.seek(0)
            json.dump(json_data, json_file, indent=4)
            json_file.close()


    def copy_annotation_files(self):
        file = os.path.join(
            self.get_bids_root_path(),
            '.bidsignore'
        )

        with open(file, mode='w', newline='') as bidsignore:
            bidsignore.write('*_annotations.json\n')
            bidsignore.write('*_annotations.tsv\n')
            bidsignore.close()

        for eegRun in self.data.get('eegRuns'):
            recording_file = eegRun['recordingBIDSBasename']
            filename = os.path.join(self.get_eeg_path(), recording_file + '_annotations')

            if eegRun['annotationsTSV']:
                shutil.copyfile(
                    eegRun['annotationsTSV'],
                    os.path.join(self.get_eeg_path(), filename + '.tsv')
                )

            if eegRun['annotationsJSON']:
                # Overrides the IntendedFor field
                print(eegRun['annotationsJSON'])

                try:
                    with open(eegRun['annotationsJSON'], "r") as fp:
                        file_data = json.load(fp)
                        recording_ext = eegRun.get('recordingBIDSExtension', '.edf')
                        file_data["IntendedFor"] = os.path.join(self.get_eeg_path(relative=True), recording_file + recording_ext)
                        # In windows env path will contain \\
                        file_data["IntendedFor"] = file_data["IntendedFor"].replace('\\', '/')

                        with open(eegRun['annotationsJSON'], "w") as fp:
                            json.dump(file_data, fp, indent=4)
                except IOError as e:
                    print(e)
                    print("Could not read or write " + eegRun['annotationsJSON'])

                shutil.copyfile(
                    eegRun['annotationsJSON'],
                    os.path.join(self.get_eeg_path(), filename + '.json')
                )


    def copy_event_files(self):
        for eegRun in self.data.get('eegRuns'):
            if not eegRun['eventFile']:
                continue

            recording_file = eegRun['recordingBIDSBasename']
            events_path = os.path.join(
                self.get_eeg_path(), recording_file + '_events.tsv')
            events_json_path = os.path.join(
                self.get_eeg_path(), recording_file + '_events.json')

            sources = [eegRun['eventFile']]
            if os.path.isfile(events_path):
                sources.append(events_path)

            columns = []
            rows = []
            for source in sources:
                with open(source, mode='r', newline='') as tsv_file:
                    reader = csv.DictReader(tsv_file, delimiter='\t')
                    source_columns = reader.fieldnames or []
                    for column in source_columns:
                        if column not in columns:
                            columns.append(column)

                    for row in reader:
                        # DictReader stores surplus values under the None key.
                        # Missing optional values are supported and padded
                        # after all source schemas have been combined.
                        if row.get(None):
                            print('Ignoring malformed events.tsv row.')
                            continue
                        if not row.get('onset') or not row.get('duration'):
                            print('Ignoring events.tsv row without onset/duration.')
                            continue
                        try:
                            float(row['onset'])
                            float(row['duration'])
                        except ValueError:
                            print('Ignoring events.tsv row with invalid timing.')
                            continue
                        rows.append(row)

            standard = [
                'onset', 'duration', 'trial_type', 'value', 'sample'
            ]
            columns = standard + [
                column for column in columns if column not in standard
            ]
            rows.sort(key=lambda row: float(row['onset']))

            with open(events_path, mode='w', newline='') as tsv_file:
                writer = csv.DictWriter(
                    tsv_file, fieldnames=columns, delimiter='\t',
                    extrasaction='ignore')
                writer.writeheader()
                for row in rows:
                    writer.writerow({
                        column: row.get(column) or 'n/a'
                        for column in columns
                    })

            try:
                with open(events_json_path, mode='r') as json_file:
                    metadata = json.load(json_file)
            except FileNotFoundError:
                metadata = {}

            for column in columns:
                if column not in metadata:
                    metadata[column] = {
                        'Description':
                            "Event information from the '{}' column."
                            .format(column)
                    }

            with open(events_json_path, mode='w') as json_file:
                json.dump(metadata, json_file, indent=4)


    def modify_eeg_json(self):
        eeg_jsons = [f for f in os.listdir(self.get_eeg_path()) if f.endswith('eeg.json')]

        for eeg_json in eeg_jsons:
            file_path = os.path.join(self.get_eeg_path(), eeg_json)

            try:
                with open(file_path, "r") as fp:
                    file_data = json.load(fp)
                    file_data["RecordingType"] = self.data['recording_type']

                    if (self.data["modality"] == 'ieeg'):
                        referenceField = 'iEEGReference'
                    else:
                        referenceField = 'EEGReference'

                    file_data[referenceField] = " ".join(self.data['reference'].split())

                    if 'metadata' in self.data['bidsMetadata'] and 'ignored_keys' in self.data['bidsMetadata']:
                        for key in self.data['bidsMetadata']['metadata']:
                            if key not in self.data['bidsMetadata']['ignored_keys']:
                                file_data[key] = self.data['bidsMetadata']['metadata'][key]

                    with open(file_path, "w") as fp:
                        json.dump(file_data, fp, indent=4)

            except IOError as e:
                print(e)
                print("Could not read or write eeg.json file")
