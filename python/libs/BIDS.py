import os
from bids_validator import BIDSValidator


class Validate:
    file_paths = []
    result = []

    def __init__(self, data):
        print('- Validate: init started.')
        sep = os.path.sep
        start_path = data['bids_directory'] + sep + data['output_time']  # current directory
        file_paths = []
        result = []
        validator = BIDSValidator()
        for path, dirs, files in os.walk(start_path):
            for filename in files:
                temp = os.path.join(path, filename)
                file_paths.append(temp[len(start_path):len(temp)])
                result.append(validator.is_bids(temp[len(start_path):len(temp)]))
                # print(validator.is_bids(temp[len(start_path):len(temp)]))

        self.set_file_paths(file_paths)
        self.set_result(result)

    @classmethod
    def set_file_paths(cls, value):
        cls.file_paths = value

    @classmethod
    def set_result(cls, value):
        cls.result = value
