
import numpy as np

from mne.utils import (
    logger,
    verbose,
    warn,
    fill_doc,
    _check_fname
)
from mne.annotations import read_annotations
from mne.io.eeglab.eeglab import RawEEGLAB, _check_load_mat, _handle_montage_units, _get_info, _check_eeglab_fname, _check_boundary, _set_dig_montage_in_init, _check_latencies

# just fix the scaling for now, EEGLAB doesn't seem to provide this info
CAL = 1e-6

@fill_doc
class RawEEGLABOveride(RawEEGLAB):
    r"""Raw object from EEGLAB .set file.

    Parameters
    ----------
    input_fname : path-like
        Path to the ``.set`` file. If the data is stored in a separate ``.fdt``
        file, it is expected to be in the same folder as the ``.set`` file.
    eog : list | tuple | 'auto'
        Names or indices of channels that should be designated EOG channels.
        If 'auto', the channel names containing ``EOG`` or ``EYE`` are used.
        Defaults to empty tuple.
    %(preload)s
        Note that preload=False will be effective only if the data is stored
        in a separate binary file.
    %(uint16_codec)s
    %(montage_units)s
    %(verbose)s

    See Also
    --------
    mne.io.Raw : Documentation of attributes and methods.

    Notes
    -----
    .. versionadded:: 0.11.0
    """

    @verbose
    def __init__(
        self,
        input_fname,
        eog=(),
        preload=False,
        *,
        uint16_codec=None,
        montage_units="mm",
        verbose=None,
    ):  # noqa: D102
        input_fname = str(_check_fname(input_fname, "read", True, "input_fname"))
        eeg = _check_load_mat(input_fname, uint16_codec)
        last_samps = [eeg.pnts - 1]
        scale_units = _handle_montage_units(montage_units)
        info, eeg_montage, _ = _get_info(eeg, eog=eog, scale_units=scale_units)

        # read the data
        if isinstance(eeg.data, str):
            data_fname = _check_eeglab_fname(input_fname, eeg.data)
            logger.info("Reading %s" % data_fname)

            super(RawEEGLAB, self).__init__(
                info,
                preload,
                filenames=[data_fname],
                last_samps=last_samps,
                orig_format="double",
                verbose=verbose,
            )
        else:
            if preload is False or isinstance(preload, str):
                warn(
                    "Data will be preloaded. preload=False or a string "
                    "preload is not supported when the data is stored in "
                    "the .set file"
                )
            # can't be done in standard way with preload=True because of
            # different reading path (.set file)
            if eeg.nbchan == 1 and len(eeg.data.shape) == 1:
                n_chan, n_times = [1, eeg.data.shape[0]]
                data = np.empty((n_chan, n_times), dtype=float)
            elif eeg.trials != 1:
                n_chan = eeg.data.shape[0]
                n_times = eeg.data.shape[1]
                data = np.empty((n_chan, n_times, eeg.trials), dtype=float)
            else:
                n_chan, n_times = eeg.data.shape
                data = np.empty((n_chan, n_times), dtype=float)
            data[:n_chan] = eeg.data
            data *= CAL
            super(RawEEGLAB, self).__init__(
                info,
                data,
                filenames=[input_fname],
                last_samps=last_samps,
                orig_format="double",
                verbose=verbose,
            )

        # create event_ch from annotations
        annot = read_annotations(input_fname)
        self.set_annotations(annot)
        _check_boundary(annot, None)

        _set_dig_montage_in_init(self, eeg_montage)

        latencies = np.round(annot.onset * self.info["sfreq"])
        _check_latencies(latencies)