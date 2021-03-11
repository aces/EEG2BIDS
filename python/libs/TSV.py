import os
import csv
import shutil


class Writer:
    def __init__(self, data):
        participant_id = ''
        age = ''
        sex = ''
        hand = ''
        print('- Writer: init started.')
        # print(data)
        sep = os.path.sep
        file_path = data['bids_directory'] + sep + data['output_time'] + sep + 'participants.tsv'
        with open(file_path, newline='') as f:
            f.readline()
            reader = csv.reader(f, delimiter='\t')
            rows = list(reader)

        output = []
        for line in rows:
            try:
                participant_id, age, sex, hand = line
            except ValueError:
                try:
                    participant_id, age, sex, hand, site_id = line
                except ValueError:
                    print('error: ValueError')
            output.append([participant_id, age, sex, hand, data['site_id']])

        with open(file_path, 'w', newline='') as f:
            headers = ['participant_id', 'age', 'sex', 'hand', 'SiteID']
            writer = csv.writer(f, delimiter='\t')
            writer.writerow(headers)
            writer.writerows(output)


class Copy:
    def __init__(self, data):
        print(data)
        directory_path = 'sub-' + data['subject_id']\
            .replace('_', '').replace('-', '').replace(' ', '')
        print(directory_path)
        new_events_tsv = os.path.join(data['bids_directory'], data['output_time'], directory_path, 'ieeg', 'events.tsv')
        print('new_events_tsv is ')
        print(new_events_tsv)
        shutil.copy2(data['events_tsv'], new_events_tsv)  # complete target filename given
