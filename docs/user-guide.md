# User guide

> [!NOTE]
> EEG2BIDS is currently supported for Linux development use only. Production
> installers and packaged releases are not supported. See the
> [project status](../README.md#project-status) before relying on the workflow
> below.

EEG2BIDS converts one EEG or stereo-iEEG recording from EDF into BIDS. Back up
the source data before conversion.

## Recordings and runs

The Configuration tab accepts one or more EDF files for a single recording.
All selected files share the subject, session, task, modality, and metadata
entered in that conversion. When more than one EDF file is selected, EEG2BIDS
assigns BIDS run numbers in selection order (`run-1`, `run-2`, and so on).
It does not derive run numbers from the source filenames.

Convert recordings with different subjects, sessions, tasks, modalities, or
metadata separately. The application does not merge separately generated BIDS
datasets, so review the output carefully before combining datasets by hand.

## Recording metadata

The Configuration tab accepts a recording-parameter JSON file. Repository
templates list the fields understood by the application:

- [EEG metadata template](../templates/eeg_parameters_TEMPLATE.json)
- [iEEG metadata template](../templates/ieeg_parameters_TEMPLATE.json)

Invalid, extra, and empty parameters are ignored by the current application.
Required values are also collected through the Configuration form.

## Events and annotations

An events TSV, annotations TSV, or annotations JSON can be associated with each
EDF file. A companion file is matched to an EDF when its basename matches the
EDF basename, with standard suffixes such as `_events.tsv` and
`_annotations.tsv` removed. Unmatched companion files are reported during
configuration.

Annotation files are copied into the output and listed in `.bidsignore`; the
built-in validator skips them. When an annotations JSON is supplied, EEG2BIDS
sets its `IntendedFor` field to the converted EDF. The current implementation
modifies the selected annotations JSON before copying it, so use a backed-up
copy of source metadata.

## Validation and packaging

The Validator tab can validate either the most recent conversion or any folder
selected by the user. It checks whether individual paths conform to BIDS naming
rules. This is a lightweight path check, not a complete dataset-level BIDS
validation report. Annotation files and `.bidsignore` are skipped.

The same tab can create a compressed archive of the selected folder.

## Optional LORIS integration

LORIS is not required for local conversion. When configured, a LORIS login can
retrieve project, subproject, site, visit, and participant information and can
check a DCCID/PSCID pair. See the README's
[credential-storage guidance](../README.md#credential-storage) before saving
credentials.

## Citation

EEG2BIDS uses [MNE-BIDS](https://mne.tools/mne-bids/). If you publish data
prepared with EEG2BIDS, follow the current MNE-BIDS citation guidance. This
repository does not yet specify a separate citation for EEG2BIDS itself.
