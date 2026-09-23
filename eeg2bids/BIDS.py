import os
from bids_validator import BIDSValidator


def validate(bids_directory):
    validator = BIDSValidator()
    file_paths = [
        os.path.join(path, name)[len(bids_directory):]
        for path, _, files in os.walk(bids_directory)
        for name in files if name != '.bidsignore'
    ]
    return {'file_paths': file_paths,
            'result': [validator.is_bids(p) for p in file_paths]}
