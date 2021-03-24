import json
import os
import csv
import shutil


# Writer - writes to tsv file
class Writer:
    def __init__(self, data):
        print('- Writer: init started.')
        # print(data)
        sep = os.path.sep
        file_path = data['bids_directory'] + sep + data['output_time'] + sep + 'participants.tsv'
        with open(file_path, newline='') as f:
            f.readline()
            reader = csv.reader(f, delimiter='\t')
            rows = list(reader)
        # participants.tsv data collected:
        output = []
        for line in rows:
            try:
                participant_id, age, sex, hand = line
                output.append(
                    [
                        participant_id,
                        age,
                        sex,
                        hand,
                        data['site_id'],
                        data['project_id'],
                        data['sub_project_id']
                    ]
                )
            except ValueError:
                try:
                    participant_id, age, sex, hand, site, project, subproject = line
                    output.append(
                        [
                            participant_id,
                            age,
                            sex,
                            hand,
                            data['site_id'],
                            data['project_id'],
                            data['sub_project_id']
                        ]
                    )
                except ValueError:
                    print('error: ValueError')
        with open(file_path, 'w', newline='') as f:
            headers = ['participant_id', 'age', 'sex', 'hand', 'site', 'project', 'subproject']
            writer = csv.writer(f, delimiter='\t')
            writer.writerow(headers)
            writer.writerows(output)

        # modify the participants.json file
        #   and include siteID, projectID, subprojectID
        file_path = data['bids_directory'] + sep + data['output_time'] + sep + 'participants.json'
        with open(file_path, 'r+', encoding='utf-8') as json_file:
            json_data = json.load(json_file)
            user_data = {
                'site': {
                    'Description': data['site_id']
                },
                'project': {
                    'Description': data['project_id']
                },
                'subproject': {
                    'Description': data['sub_project_id']
                }
            }
            json_data.update(user_data)
            json_file.seek(0)
            json.dump(json_data, json_file, indent=4)


class Copy:
    def __init__(self, data):
        print(data)
        directory_path = 'sub-' + data['subject_id'].replace(
            '_', ''
        ).replace('-', '').replace(' ', '')
        # new_events_tsv = os.path.join(
        #     data['bids_directory'],
        #     data['output_time'],
        #     directory_path,
        #     'ses-' + data['visit_label'],
        #     'ieeg',
        #     'events.tsv'
        # )
        # shutil.copy2(data['events_tsv'], new_events_tsv)  # complete target filename given

        # events.tsv data collected:
        output = []

        # Open user supplied events.tsv and grab data.
        with open(data['events_tsv'], newline='') as f:
            f.readline()
            reader = csv.reader(f, delimiter='\t')
            rows = list(reader)
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
        start_path = os.path.join(
            data['bids_directory'],
            data['output_time'],
            directory_path,
            'ses-' + data['visit_label'],
            'ieeg'
        )
        path_events_tsv = ''
        # We search for the events.tsv file.
        for path, dirs, files in os.walk(start_path):
            for filename in files:
                temp = os.path.join(path, filename)
                if temp.endswith('events.tsv'):
                    path_events_tsv = temp

        # We now open BIDS events.tsv file.
        with open(path_events_tsv, newline='') as f:
            f.readline()
            reader = csv.reader(f, delimiter='\t')
            rows = list(reader)
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

        # output.sort(key=lambda x: float(x[0]))
        print('output happens to be')
        print(output)

        # overwrite BIDS events.tsv with collected data.
        with open(path_events_tsv, 'w', newline='') as f:
            headers = ['onset', 'duration', 'trial_type', 'value', 'sample']
            writer = csv.writer(f, delimiter='\t')
            writer.writerow(headers)
            writer.writerows(output)

