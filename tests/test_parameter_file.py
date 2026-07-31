import json

import pytest

from eeg2bids.server import _read_parameter_file


def test_nested_parameter_file_separates_bids_and_prepopulation(tmp_path):
    path = tmp_path / 'recording_parameters.json'
    path.write_text(json.dumps({
        'bids': {
            'InstitutionName': 'Test site',
            'TaskDescription': '',
            'NotABidsField': 'ignored',
        },
        'prepopulation': {
            'Project': 'Example',
            'Visit': 'baseline',
            'LineFrequency': 60,
        },
    }))

    result = _read_parameter_file(path, 'eeg')

    assert result['metadata']['InstitutionName'] == 'Test site'
    assert result['prepopulation'] == {
        'Project': 'Example',
        'Visit': 'baseline',
        'LineFrequency': 60,
    }
    assert set(result['ignored_keys']) == {'TaskDescription', 'NotABidsField'}
    assert result['source_file'] == str(path)


@pytest.mark.parametrize('parameters', [
    {'InstitutionName': 'flat files are unsupported'},
    {'bids': {}, 'prepopulation': {}, 'extra': {}},
    {'bids': [], 'prepopulation': {}},
    {'bids': {}, 'prepopulation': []},
])
def test_parameter_file_requires_exact_nested_shape(tmp_path, parameters):
    path = tmp_path / 'recording_parameters.json'
    path.write_text(json.dumps(parameters))

    with pytest.raises(ValueError):
        _read_parameter_file(path, 'eeg')
