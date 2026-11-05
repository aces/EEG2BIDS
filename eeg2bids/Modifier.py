import os
import csv
import json
import re


def apply(data, written_runs):
    """Apply dataset metadata and event edits after recording files exist."""
    bids_root = os.path.join(data['bids_directory'], data['output_time'])
    eeg_path = os.path.join(bids_root, 'sub-' + data['participantID'],
                            'ses-' + data['session'], data['modality'])

    _modify_dataset_description_json(data, bids_root)
    _modify_participants_tsv(data, bids_root)
    _modify_participants_json(bids_root)
    _clean_dataset_files(bids_root, eeg_path)
    _copy_event_files(written_runs, eeg_path)
    _modify_eeg_json(data, eeg_path)


def _clean_dataset_files(bids_root, eeg_path):
    # for multiple run recording, clean the duplicate _channels.tsv
    channels_files = [f for f in os.listdir(eeg_path) if f.endswith('_channels.tsv')]
    for name in channels_files[1:]:
        os.remove(os.path.join(eeg_path, name))

    # remove the run suffix in the file names
    os.rename(os.path.join(eeg_path, channels_files[0]),
              os.path.join(eeg_path, re.sub(r"_run-[0-9]+", '', channels_files[0])))

    # remove the mne citations README
    try:
        os.remove(os.path.join(bids_root, 'README'))
    except FileNotFoundError:
        print("No README file found")


def _modify_dataset_description_json(data, bids_root):
    file_path = os.path.join(bids_root, 'dataset_description.json')
    try:
        with open(file_path, "r") as fp:
            file_data = json.load(fp)
        file_data['PreparedBy'] = data['preparedBy']
        file_data['Eeg2bidsVersion'] = os.environ.get('EEG2BIDS_VERSION', 'unknown')
        file_data['Name'] = data['participantID'] + '_' + data['session']

        with open(file_path, "w") as fp:
            json.dump(file_data, fp, indent=4)

    except OSError:
        print("Could not read or write dataset_description.json file")


def _modify_participants_tsv(data, bids_root):
    file_path = os.path.join(bids_root, 'participants.tsv')

    # Read participant_id by name: mne-bids' column layout varies by version (#145).
    with open(file_path, mode='r', newline='') as tsv_file:
        reader = csv.DictReader(tsv_file, delimiter='\t')
        participant_ids = [row['participant_id'] for row in reader]

    d = data
    output = [
        [pid, d['age'], d['sex'], d['hand'], d['site_id'], d['sub_project_id'], d['project_id']]
        for pid in participant_ids
    ]

    with open(file_path, mode='w', newline='') as tsv_file:
        headers = ['participant_id', 'age', 'sex', 'hand', 'site', 'subproject', 'project']
        writer = csv.writer(tsv_file, delimiter='\t')
        writer.writerow(headers)
        writer.writerows(output)


def _modify_participants_json(bids_root):
    file_path = os.path.join(bids_root, 'participants.json')

    with open(file_path, mode='r+', encoding='utf-8') as json_file:
        json_data = json.load(json_file)
        json_data.update({
            'site': {'Description': "Site of the testing"},
            'subproject': {'Description': "Subproject of the participant"},
            'project': {'Description': "Project of the participant"},
        })
        json_file.seek(0)
        json.dump(json_data, json_file, indent=4)


def _copy_event_files(written_runs, eeg_path):
    for written_run in written_runs:
        if not written_run['eventFile']:
            continue

        bids_basename = written_run['recordingBIDSBasename']
        events_path = os.path.join(eeg_path, bids_basename + '_events.tsv')
        events_json_path = os.path.join(eeg_path, bids_basename + '_events.json')

        sources = [written_run['eventFile']]
        if os.path.isfile(events_path):
            sources.append(events_path)

        columns = []
        rows = []
        for source in sources:
            with open(source, mode='r', newline='') as tsv_file:
                reader = csv.DictReader(tsv_file, delimiter='\t')
                columns.extend(reader.fieldnames or [])

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

        columns = list(dict.fromkeys(
            ['onset', 'duration', 'trial_type', 'value', 'sample'] + columns))
        rows.sort(key=lambda row: float(row['onset']))

        with open(events_path, mode='w', newline='') as tsv_file:
            writer = csv.DictWriter(
                tsv_file, fieldnames=columns, delimiter='\t')
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
            metadata.setdefault(column, {
                'Description': f"Event information from the '{column}' column."
            })

        with open(events_json_path, mode='w') as json_file:
            json.dump(metadata, json_file, indent=4)


def _modify_eeg_json(data, eeg_path):
    reference_field = 'iEEGReference' if data['modality'] == 'ieeg' else 'EEGReference'
    meta = data.get('bidsMetadata') or {}

    for eeg_json in [f for f in os.listdir(eeg_path) if f.endswith('eeg.json')]:
        file_path = os.path.join(eeg_path, eeg_json)
        try:
            with open(file_path, "r") as fp:
                file_data = json.load(fp)
            file_data["RecordingType"] = data['recording_type']
            file_data[reference_field] = " ".join(data['reference'].split())

            if 'metadata' in meta and 'ignored_keys' in meta:
                file_data.update({k: v for k, v in meta['metadata'].items()
                                  if k not in meta['ignored_keys']})

            with open(file_path, "w") as fp:
                json.dump(file_data, fp, indent=4)

        except OSError as e:
            print(e)
            print("Could not read or write eeg.json file")
