# User guide

> [!NOTE]
> Production packages are supported for Ubuntu amd64 and Windows 11 x64. See
> [installation](installation.md) and the
> [project status](../README.md#project-status) for the current support and
> distribution details.

EEG2BIDS converts continuous EEG or stereo-iEEG recordings into BIDS, either
one recording at a time or as a batch. Back up the source data before
conversion.

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

## Anonymization

Enable **Anonymize** to have MNE-BIDS anonymize metadata it recognizes before
writing any supported output format. EEG2BIDS uses one consistent date shift
for all runs in the conversion, removes MNE subject-identifying metadata, and
writes the shifted acquisition time to BIDS metadata. Because EDF can only
represent a two-digit year in one header date field, an anonymized EDF may show
1985 there; the complete shifted date is stored in `*_scans.tsv`.

EDF output receives an additional format-specific safeguard: both its
80-character patient-identification and recording-identification fields are
replaced with `X X X X`. When anonymization is disabled, those fields are
preserved.

MNE-BIDS can only anonymize metadata its source reader recognizes. Review
free-text events, annotations, custom vendor fields, external metadata files,
and participant/project values before sharing a dataset; the toggle does not
claim to detect identifiers in arbitrary user-authored text.

## Recordings and runs

The Configuration tab accepts one or more recording files for a single
recording. All selected files share the subject, session, task, modality, and
metadata entered in that conversion. When more than one file is selected,
EEG2BIDS assigns BIDS run numbers in selection order (`run-1`, `run-2`, and so
on). It does not derive run numbers from the source filenames.

Convert recordings with different subjects, sessions, tasks, modalities, or
metadata separately, or use a batch (below). The application does not merge
separately generated BIDS datasets, so review the output carefully before
combining datasets by hand.

## Batch conversion

Use the **Batch workbench** tab to convert many recordings into one BIDS
dataset.

1. Add recordings by selecting files or by choosing a folder. A folder is
   searched at any depth. Files already named with BIDS entities (`sub-01`,
   `ses-1`, `task-rest`, `run-1`) have those values filled in. EEG2BIDS never
   guesses anything else from a file or folder name. Use the token mapping to
   tell it how your own names encode participant, session, task, or run.
2. Fix anything unresolved. Each recording needs a participant and a task.
   Session and run are optional. Participant demographics are edited on the
   **Participants** tab, and renaming a participant updates all of their
   recordings.
3. On **Review & save**, save the batch file to come back to it later, or
   choose **Load into Configuration**. A saved batch file can also be opened
   from the Configuration tab.
4. On the Configuration tab, choose the BIDS output folder and the settings
   that apply to every recording: modality, output format, anonymization, and
   recording details. Participant, session, task, and run come from the batch.
5. **Recording to BIDS** lists every recording with its BIDS destination.
   Only recordings marked **Will convert** are written. A recording already in
   the output folder is skipped and never overwritten. A conflict, such as two
   recordings with the same destination, has to be fixed in the workbench.

A batch is written straight into the chosen output folder, not into a
timestamped `output-*` folder, so running more batches into the same folder
builds one dataset. Each recording converts on its own. If one fails, the rest
still convert, and converting again retries only the recordings that are not
yet in the dataset.

## Recording metadata

The Configuration tab accepts a recording-parameter JSON file. Repository
templates list the fields understood by the application:

- [EEG metadata template](../templates/eeg_parameters_TEMPLATE.json)
- [iEEG metadata template](../templates/ieeg_parameters_TEMPLATE.json)

Parameter files contain two top-level objects: `bids` holds BIDS sidecar
metadata, while `prepopulation` holds Project, Subproject, Visit, Site,
LineFrequency, Reference, and RecordingType values used to initialize the
Configuration form. Users can review and change imported values; re-reading
metadata for a modality change does not overwrite those edits. Flat parameter
files are not supported.

Invalid, extra, and empty BIDS parameters are ignored by the current
application. Required values are also collected through the Configuration
form.

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
