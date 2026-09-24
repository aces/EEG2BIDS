"""Parse recording parameter files independently of the Socket.IO transport."""

import json

from eeg2bids.converter import metadata as metadata_fields


def read_parameter_file(file_path, modality):
    """Return BIDS metadata and form prepopulation from a parameter file."""
    with open(file_path) as file:
        parameters = json.load(file)

    if not isinstance(parameters, dict) or set(parameters) != {
            'bids', 'prepopulation'}:
        raise ValueError(
            'Parameter file must contain exactly "bids" and '
            '"prepopulation" objects.'
        )

    metadata = parameters['bids']
    prepopulation = parameters['prepopulation']
    if not isinstance(metadata, dict) or not isinstance(prepopulation, dict):
        raise ValueError(
            'Parameter file "bids" and "prepopulation" values must be objects.'
        )

    empty_values = [
        key for key, value in metadata.items()
        if isinstance(value, str) and not value.strip()
    ]
    unsupported = set(metadata) - set(metadata_fields[modality])

    return {
        'metadata': metadata,
        'prepopulation': prepopulation,
        'ignored_keys': empty_values + sorted(unsupported - set(empty_values)),
        'source_file': str(file_path),
    }
