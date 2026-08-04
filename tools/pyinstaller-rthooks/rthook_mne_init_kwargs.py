"""PyInstaller runtime hook: restore MNE's ``raw._init_kwargs`` under freeze.

Problem (freeze-only; dev and the pytest suite are unaffected):
MNE records the arguments a ``read_raw_*`` call was made with by walking the
call stack in ``mne.io.base._get_argvalues`` and capturing the reader frame's
locals — but ONLY if that frame's ``co_filename`` matches the glob
``*/mne/io/*``. In a PyInstaller bundle, frozen modules carry bundle-relative
code filenames like ``mne/io/edf/edf.py`` (no leading path separator), which
fail that glob, so ``_get_argvalues`` returns ``None`` and every file-backed
Raw ends up with ``raw._init_kwargs = None``.

MNE-BIDS's non-preload copy path (the default for a lazily-read source such as
EDF: ``reader[ext](**raw._init_kwargs)`` in ``write_raw_bids``) then fails with
``TypeError: ... argument after ** must be a mapping, not NoneType``. This is
EEG2BIDS's primary "preserve the source EDF byte-for-byte" conversion, so the
frozen backend cannot convert EDF without this fix. See #170 and
docs/linux-packaging-design.md.

Fix: replace ``mne.io.base._get_argvalues`` with MNE's own implementation, with
the filename test loosened to match ``mne/io/`` anywhere in a normalized path
(covers both the absolute dev path and the bundle-relative frozen path, and
still returns ``None`` for non-io callers like ``<decorator-gen-N>`` exactly as
upstream does). The captured values are still the real reader arguments taken
from the live frame, so frozen behavior matches development.
"""
import fnmatch
import inspect


def _get_argvalues():
    """Return the read_raw_* arguments (except self), tolerant of frozen paths.

    Mirrors mne.io.base._get_argvalues; only the co_filename gate is relaxed.
    @return {dict|None} the reader's arguments, or None for non-io callers.
    """
    frame = inspect.currentframe()
    try:
        for _ in range(3):
            frame = frame.f_back
        fname = frame.f_code.co_filename.replace("\\", "/")
        # Upstream requires "*/mne/io/*"; the leading separator is absent from
        # PyInstaller's bundle-relative filenames, so match "mne/io/" anywhere.
        if not fnmatch.fnmatch(fname, "*mne/io/*"):
            return None
        args, _, _, values = inspect.getargvalues(frame)
    finally:
        del frame
    params = {arg: values[arg] for arg in args}
    params.pop("self", None)
    return params


try:
    import mne.io.base as _mne_io_base

    _mne_io_base._get_argvalues = _get_argvalues
except Exception:  # pragma: no cover - never block startup over this patch
    # If MNE's internals move, fall back to unpatched behavior rather than
    # crash the backend at launch; conversion will surface the original error.
    pass
