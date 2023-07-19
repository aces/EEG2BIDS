import os
import csv
import json
import re
from python.libs.iEEG import metadata as metadata_fields

class Modifier:
    def __init__(self, data):
        self.data = data
        print(self.data)

        dirname = os.path.dirname(os.path.abspath(__file__))
        f = open(os.path.join(dirname, '..', '..', 'src','config.json'))
        self.config = json.load(f)

        print('- Modifier: init started.')

        self.modify_dataset_description_json()
        self.modify_participants_tsv()
        self.modify_participants_json()
        # This method is removing other tasks channels file
        # removing call to method
        # self.clean_dataset_files()
        self.copy_event_files()
        self.modify_eeg_json()


    def get_bids_root_path(self):
        return os.path.join(
            self.data['bids_directory'],
            self.data['outputFilename']
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
        if len(self.data['eegData']['files']) > 0:
            # for multiple run recording, clean the duplicate _channels.tsv
            # channels_files = [f for f in os.listdir(self.get_eeg_path()) if f.endswith('_channels.tsv')]
            # for i in range(1, len(channels_files)):
            #     filename = os.path.join(self.get_eeg_path(), channels_files[i])
            #     os.remove(filename)

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
            with open(os.path.join(os.path.dirname(__file__), '../../package.json'), "r") as fp:
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

        with open(file_path, mode='r') as tsv_file:
            reader = csv.reader(tsv_file, delimiter='\t')
            rows = list(reader)
            tsv_file.close()

        metadata_config = self.config['participantMetadata']
        enabled_metadata = list(filter(lambda k: k != 'additional' and metadata_config[k], metadata_config.keys()))
        add_metadata = list(map(lambda row: row['name'],
            filter(
                lambda row: row['display'],
                metadata_config['additional']
            )
        ))
        metadata = enabled_metadata + add_metadata

        rows[0] = [rows[0][0]] + metadata
        for i in range(1, len(rows)):
            rows[i] = [rows[i][0]]
            for k in metadata:
                rows[i].append(self.data[k])

        with open(file_path, mode='w', newline='') as tsv_file:
            writer = csv.writer(tsv_file, delimiter='\t')
            writer.writerows(rows)
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


    def copy_event_files(self):
        for eegRun in self.data.get('eegRuns'):
            eeg_file = eegRun['eegBIDSBasename']
            filename = os.path.join(self.get_eeg_path(), eeg_file + '_events')

            if eegRun['eventFile']:
                # events.tsv data collected:
                output = []

                # Open user supplied events.tsv and grab data.
                with open(eegRun['eventFile'], mode='r', newline='') as tsv_file:
                    reader = csv.reader(tsv_file, delimiter='\t')
                    tsvheader = next(reader)
                    eventsaddrows = list(reader)
                    tsv_file.close()

                path_event_files = ''
                # We search for the events.tsv file.
                for path, dirs, files in os.walk(self.get_eeg_path()):
                    for filename in files:
                        temp = os.path.join(path, filename)
                        if temp.endswith(eegRun['eegBIDSBasename'] + '_events.tsv'):
                            path_event_files = temp

                # We now open BIDS events.tsv file if it exists
                if path_event_files:
                    try:
                        with open(path_event_files, mode='r', newline='') as tsv_file:
                            reader = csv.reader(tsv_file, delimiter='\t')
                            header = next(reader)
                            eventsrows = list(reader)
                            tsv_file.close()

                        if header == tsvheader:
                            print('Overiding events.tsv file')
                            for line in eventsrows:
                                try:
                                    output.append(line)
                                except ValueError:
                                    print('error: ValueError')

                            for line in eventsaddrows:
                                try:
                                    output.append(line)
                                except ValueError:
                                    print('error: ValueError')

                    except:
                        print('No events.tsv found in the BIDS folder.')
                else:
                    path_event_files = self.get_eeg_path() + '/' + eegRun['eegBIDSBasename'] + '_events.tsv'

                if header == tsvheader:
                    # output is an array of arrays
                    # sort by first element in array
                    # output.sort(key=lambda x: float(x[0]))

                    # overwrite BIDS events.tsv with collected data.
                    with open(path_event_files, mode='a+', newline='') as tsv_file:
                        headers = tsvheader
                        writer = csv.writer(tsv_file, delimiter='\t')
                        writer.writerow(headers)
                        writer.writerows(output)
                        tsv_file.close()


    def modify_eeg_json(self):
        eeg_jsons = [f for f in os.listdir(self.get_eeg_path()) if f.endswith('eeg.json')]

        for eeg_json in eeg_jsons:
            file_path = os.path.join(self.get_eeg_path(), eeg_json)

            try:
                with open(file_path, "r") as fp:
                    file_data = json.load(fp)

                    if (self.data["modality"] == 'ieeg'):
                        referenceField = 'iEEGReference'
                    else:
                        referenceField = 'EGGReference'

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
