import os
from bids_validator import BIDSValidator


class Validate:
    file_paths = []
    result = []

    def __init__(self, bids_directory):
        print('- Validate: init started.')
        file_paths = []
        result = []
        validator = BIDSValidator()
        for path, dirs, files in os.walk(bids_directory):
            for filename in files:
                if filename == '.bidsignore':
                    continue

                if filename.endswith('_annotations.tsv'):
                    continue

                if filename.endswith('_annotations.json'):
                    continue
                temp = os.path.join(path, filename)
                file_paths.append(temp[len(bids_directory):len(temp)])
                result.append(validator.is_bids(temp[len(bids_directory):len(temp)]))
                # print(validator.is_bids(temp[len(bids_directory):len(temp)]))

        self.set_file_paths(file_paths)
        self.set_result(result)

    @classmethod
    def set_file_paths(cls, value):
        cls.file_paths = value

    @classmethod
    def set_result(cls, value):
        cls.result = value
