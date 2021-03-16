import os
import csv
import shutil


# Writer - writes to tsv file
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
        # shutil.copy2(data['events_tsv'], new_events_tsv)  # complete target filename given
        # new
        start_path = os.path.join(data['bids_directory'], data['output_time'], directory_path, 'ieeg')
        print('START: ')
        path_events_tsv = ''
        # We search for the events.tsv file.
        for path, dirs, files in os.walk(start_path):
            for filename in files:
                temp = os.path.join(path, filename)
                print(temp)
                if temp.endswith('events.tsv'):
                    path_events_tsv = temp
        print('Found: ')
        print(path_events_tsv)
        # we now open tsv file.
        with open(path_events_tsv, newline='') as f:
            f.readline()
            reader = csv.reader(f, delimiter='\t')
            rows = list(reader)
        output = []
        onset = ''
        duration = ''
        trial_type = ''
        value = ''
        sample = ''
        for line in rows:
            print(line)
            try:
                onset, duration, trial_type, value, sample = line
            except ValueError:
                print('error: ValueError')
            output.append([onset, duration, trial_type, value, sample])

