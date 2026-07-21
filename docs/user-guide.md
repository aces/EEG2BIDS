# User guide

> [!NOTE]
> EEG2BIDS is currently supported for Linux development use only. Production
> installers and packaged releases are not supported. See the
> [project status](../README.md#project-status) before relying on the workflow
> below.

EEG2BIDS converts one continuous EEG or stereo-iEEG recording into BIDS. Back
up the source data before conversion.

## Supported formats

Recordings are opened through MNE-Python's `mne.io.read_raw()`. EEG2BIDS does
not maintain its own list of readable extensions; MNE selects the reader and
resolves any companion files from the file you select.

- **Verified formats:** continuous EDF, and continuous EEGLAB SET — both
  embedded-data `.set` files and `.set`/`.fdt` pairs (select the `.set`; MNE
  finds the `.fdt`).
- **Other formats:** any continuous EEG/iEEG format MNE can read may work, but
  is not described as verified until representative conversion coverage exists.
- **Not supported:** epoched recordings and non-EEG/iEEG modalities. These are
  rejected with a message that preserves the underlying MNE cause.

Optional metadata such as recording date and subject information is read from
the recording when present and shown as `n/a` when absent; a missing value does
not block conversion.

### Output format

Choose an output format on the Configuration tab. **Auto** (the default)
preserves the source format when it is BIDS-compatible and converts to EDF
otherwise. You can also select EDF, BrainVision, or EEGLAB explicitly;
MNE-BIDS performs any conversion.

## Recordings and runs

The Configuration tab accepts one or more recording files for a single
recording. All selected files share the subject, session, task, modality, and
metadata entered in that conversion. When more than one file is selected,
EEG2BIDS assigns BIDS run numbers in selection order (`run-1`, `run-2`, and so
on). It does not derive run numbers from the source filenames.

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

## Events

Time-based markers embedded in a source recording are written to the BIDS
`*_events.tsv` file. This includes markers exposed through source-library APIs
such as `mne.Annotations`; they remain events in the generated BIDS dataset.

An optional external `*_events.tsv` can be associated with each recording. Its
basename must match the recording basename after the `_events.tsv` suffix is
removed. Unmatched event files are reported during configuration.

External rows are combined with embedded events and ordered by onset. EEG2BIDS
preserves additional event columns, padding fields absent from either source
with `n/a`. Metadata entries for additional columns are added to the
corresponding `*_events.json` sidecar. Review generated descriptions to ensure
they adequately explain the meaning of project-specific columns.

## Validation and packaging

The Validator tab can validate either the most recent conversion or any folder
selected by the user. It checks whether individual paths conform to BIDS naming
rules. This is a lightweight path check, not a complete dataset-level BIDS
validation report. The special `.bidsignore` file is skipped.

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
