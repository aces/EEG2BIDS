# Testing guide

EEG2BIDS has two automated test suites. The Python suite protects backend,
conversion, and BIDS output behavior. The Playwright suite exercises the
Electron application boundary and its integration with the Python backend.
Both suites are required when a change can affect the application as a whole.

Automated coverage initially targets the supported Linux development
environment. See [Development](development.md) for the general development
setup and launch architecture.

## Install test dependencies

Use the repository lockfiles to install both stacks:

```sh
uv sync --frozen
npm ci
```

The Python suite also requires [Deno](https://deno.com/) because it runs the
official dataset-level BIDS Validator. Install Deno if it is not already
available:

```sh
curl -fsSL https://deno.land/install.sh | sh
```

The tests locate `deno` on `PATH`, in `~/.deno/bin`, or under
`$DENO_INSTALL/bin`. The validator module is fetched on first use and then
cached.

## Python backend suite

Run the complete backend suite from the repository root:

```sh
uv run pytest
```

The suite covers package imports, recording inspection, output-format policy,
EEG/iEEG conversion, supplied events, known regressions, Socket.IO startup,
and generated-dataset validation. Generated BIDS datasets are written only to
pytest temporary directories.

A successful run reports every collected test as passed. Dataset validation is
a required check: tests fail rather than skip when Deno or the BIDS Validator
cannot run.

For a focused local run, pass ordinary pytest paths or selectors, for example:

```sh
uv run pytest tests/test_conversion.py
uv run pytest tests/test_regressions.py -k events
```

Focused runs are useful while developing but do not replace the complete suite
before review.

## Electron integration suite

Run the complete Playwright Electron suite from the repository root:

```sh
npm run test:electron
```

This command first creates a production renderer build and then runs the tests
in `electron/tests/`. The suite runs serially because each test controls an
Electron application and its owned Python backend.

The launch fixture reserves an available backend port and creates an isolated
temporary Electron `userData` directory for every application instance. Tests
must not depend on development port 7301 or access normal application
credentials. Credential tests use deterministic test-only password storage and
do not claim that it provides secure storage.

Electron requires a graphical display. On a headless Linux machine, run the
same suite under Xvfb:

```sh
xvfb-run -a npm run test:electron
```

Playwright retains a trace for failed tests under its test-results output. Do
not commit generated renderer builds, traces, temporary user data, or test
results.

## Which suites to run

| Change | Required checks |
| --- | --- |
| Python backend, conversion, or dependencies | `uv run pytest` |
| Electron main/preload, renderer, or Node dependencies | `npm run test:electron` |
| Shared backend port, startup, IPC, Socket.IO, or application lifecycle | Both suites |
| Fixtures or fixture generator | Regenerate deliberately, then run both affected suites |
| Documentation only | Verify commands and links; run affected checks when examples or setup changed |

When uncertain, run both complete suites.

## Test fixtures

Backend source fixtures live in `tests/fixtures/`. They are small, synthetic,
de-identified, and committed so dependency upgrades cannot silently change the
inputs. Their detailed contents and provenance are documented in the
[fixture README](../tests/fixtures/README.md).

Regenerate the fixtures deliberately with:

```sh
uv sync --frozen
uv run python tools/make_dev_data.py
```

Before adding or replacing a fixture:

1. Prefer one small fixture per meaningful storage structure or regression,
   rather than one per readable extension.
2. Use only synthetic or verified de-identified data; never commit clinical or
   identifying data.
3. Keep signals short, deterministic, and as small as the behavior permits.
4. Record the fixture's purpose, generation method, and provenance in
   `tests/fixtures/README.md`.
5. Update the reproducible generator where practical.
6. Do not commit generated BIDS output trees; tests must use temporary
   directories.

Electron tests create their state through `electron/tests/fixtures.js`. New
Electron tests must continue to isolate user data, reserve their own backend
port, intercept native side effects, and clean up the exact processes they
own.

## Common failures

- **`deno` not found:** install Deno or add its binary directory to `PATH`.
- **Validator download failure on first run:** confirm network access and rerun;
  subsequent runs use Deno's cache.
- **Electron cannot open a display:** use an existing graphical session or run
  the suite with `xvfb-run -a`.
- **Electron Chromium sandbox startup failure:** follow the Linux sandbox setup
  in the project README; do not use `--no-sandbox` or disable the host-wide
  AppArmor restriction.
- **First Electron launch is slow:** allow uv to finish preparing the locked
  Python environment. Backend failures should still surface immediately rather
  than only as readiness timeouts.
- **A port appears occupied:** tests should reserve an available port. A failure
  involving fixed port 7301 indicates a test-isolation regression.

When reporting an automated test failure, include the failing command, test
name, tested commit, Linux environment, relevant tool versions, and sanitized
error output. Never attach credentials, tokens, identifying metadata, real
clinical recordings, or decrypted credential contents.

## Manual QA

Stable manual QA scenarios and the manual failure-reporting workflow are
intentionally deferred to [issue #179](https://github.com/aces/EEG2BIDS/issues/179).
That work does not block the automated testing baseline. Existing development
sanity checks remain in [Development](development.md) until #179 reviews and
consolidates them.
