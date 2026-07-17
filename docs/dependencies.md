# Dependency inventory and auditing

EEG2BIDS has two authoritative dependency graphs:

- JavaScript: `package.json` and `package-lock.json`
- Python: `pyproject.toml` and `uv.lock`

Do not restore `requirements.txt`. It was retired when the backend moved to uv.

## JavaScript

### Runtime dependencies

The packages under `dependencies` in `package.json` ship with or support the
Electron renderer:

- React and renderer support: `react`, `react-dom`, `prop-types`
- UI and routing: `react-datepicker`, `react-router-dom`, `react-switch`,
  `react-tooltip`, `@fortawesome/fontawesome-free`
- Data and backend communication: `papaparse`, `socket.io-client`

### Development dependencies

The packages under `devDependencies` are development/build tooling and are not
application runtime dependencies:

- Electron and Vite: `electron`, `vite`, `@vitejs/plugin-react`
- Workflow orchestration: `concurrently`, `wait-on`
- Linting: `eslint`, `eslint-config-google`, `eslint-plugin-react`,
  `lint-staged`

Audit the locked graph with:

```sh
npm ci
npm audit
```

`npm audit` should report zero known vulnerabilities. Major-version fixes must
be reviewed for API changes rather than applied with an unreviewed
`npm audit fix --force`.

## Python

### Runtime dependencies

The `[project].dependencies` in `pyproject.toml` are installed with the
backend:

- EEG/BIDS processing: `mne`, `mne-bids`, `numpy`, `pybv`, `bids-validator`
- Socket.IO service: `python-socketio`, `simple-websocket`, `werkzeug`
- LORIS HTTP integration: `requests`

Transitive versions are resolved and pinned in `uv.lock`. Inspect the locked
runtime graph with:

```sh
uv tree --frozen --no-dev
```

Audit exactly that graph by exporting it to a temporary requirements file for
`pip-audit`:

```sh
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
uv export --frozen --no-dev --no-emit-project \
  --format requirements-txt --output-file "$tmp"
uvx --python 3.11 pip-audit -r "$tmp"
```

The export is temporary and must not be committed.

### Optional dependency groups

- `dev`: `edfio`, used only to generate synthetic fixtures in
  `tools/make_dev_data.py`
- `packaging`: `pyinstaller`, reserved for future standalone packaging work
- build system: `hatchling`, used to build the Python package

These groups are not part of the normal application runtime. Audit them when
changing fixture generation or packaging, respectively.

## Automated updates and CI

`.github/dependabot.yml` checks npm and uv weekly. uv support is enabled as a
Dependabot beta ecosystem so updates modify the authoritative `uv.lock`
rather than recreating a legacy requirements file.

The CI work tracked by issue #147 should run, at minimum:

```sh
npm ci
npm audit
npm run lint
npm run build
uv lock --check
# Run the temporary-export pip-audit procedure shown above.
```

Security findings must be fixed, or dismissed only with a rationale recording
why the affected package is unreachable, development-only, obsolete, or a
false positive.
