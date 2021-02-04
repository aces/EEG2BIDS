import csv


class Writer:
    def __init__(self, data):
        participant_id = ''
        age = ''
        sex = ''
        hand = ''
        print('- Writer: init started.')
        # print(data)
        file_path = data['bids_directory'] + '/participants.tsv'
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
