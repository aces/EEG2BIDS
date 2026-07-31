# Linux manual QA

This guide covers human checks that add value beyond the automated Python and
Electron suites. It initially targets Ubuntu 24.04 x86_64. Run the applicable
scenarios for application changes; run every release-gate scenario against a
release candidate before promoting it to a final release.

Automated CI must pass for the exact release-candidate commit before manual QA
starts. Manual QA does not replace CI.

## Test data and safety

Prefer the repository's deterministic synthetic data:

```sh
uv sync --frozen
uv run python tools/make_dev_data.py
```

It creates the gitignored `dev-data/` inputs described in
[Development](development.md#development-data). These inputs contain no real
clinical or identifying data.

A scenario may use a legacy project test-file set only when its owner has
approved it for testing and confirmed that it contains no clinical or
identifying data. Record the set's project, name, revision, and approved source
in the QA report, but do not commit restricted files or publish their contents.
Copy the data to a disposable working directory and delete that copy during
cleanup. Replace legacy inputs with reproducible synthetic fixtures when
practical.

Never include credentials, tokens, real clinical recordings, identifying
metadata, decrypted credential contents, or unsanitized logs and screenshots in
a QA report.

## Release-candidate policy

Release candidates use immutable tags such as `v3.0.0-rc.1`. Package metadata
already contains the intended final version (`3.0.0`); the RC suffix describes
the candidate tag, not the package version.

CI builds the `.deb`, checksum, and prerelease from the tagged commit. Testers
must test that exact artifact and record its SHA-256 checksum. Do not replace or
move an RC tag. A failure is fixed through the normal review process and gets a
new candidate tag. After all release scenarios pass, the final tag points to
the approved RC commit and release automation promotes the already-tested
artifact without rebuilding it.

## Environment record

Before testing, record:

- RC tag and full commit SHA;
- CI run URL;
- artifact filename and SHA-256 checksum;
- tester and date;
- distribution, release, architecture, desktop environment, and X11/Wayland
  session;
- for development scenarios: Node, npm, Python, and uv versions;
- for packaged scenarios: whether the VM was clean and which EEG2BIDS package,
  if any, was previously installed.

Verify the downloaded candidate before installation:

```sh
sha256sum --check SHA256SUMS
```

## Scenarios

### QA-LINUX-001: Development workflow and anonymized conversion

**Release gate:** yes.

**Purpose:** Exercise the complete visible development workflow, including the
human-reviewable output and anonymization controls that backend tests cannot
verify as a user experiences them.

**Prerequisites:** A clean checkout of the RC commit, development prerequisites,
and freshly generated `dev-data/`.

**Steps:**

1. Install from lockfiles with `uv sync --frozen` and `npm ci`, then launch with
   `npm run dev`.
2. Confirm the application opens and the backend indicator reaches
   **connected**.
3. Select `dev-data/eeg_sample.edf`, load `dev-data/eeg_metadata.json`, choose a
   disposable output directory, and review the displayed recording and channel
   details for plausibility.
4. Enable anonymization and convert the recording to BIDS.
5. In the application's post-conversion review, confirm it reports the EDF
   identity fields as `X X X X` and displays the shifted recording date.
6. Validate the resulting output through the Validator tab and inspect the
   visible result.
7. Open the output only as needed to confirm that no source identity or original
   acquisition date is exposed in the EDF header or generated BIDS metadata.

**Expected:** The UI remains responsive; conversion succeeds; anonymization is
visibly confirmed; the generated dataset validates; and no source identity or
original date is exposed.

**Cleanup:** Close the application, remove the disposable output, and remove
`dev-data/` if it is no longer needed. Continue with QA-LINUX-005 to verify
process cleanup.

### QA-LINUX-002: Packaged clean install and full workflow

**Release gate:** yes.

**Purpose:** Demonstrate that the candidate works without development tools and
that the packaged renderer, frozen backend, sandbox, desktop integration, and
keyring boundary work together.

**Prerequisites:** A fresh supported Ubuntu 24.04 x86_64 VM with a normal desktop
session and secret service, no prior EEG2BIDS install, and no Node, npm, uv, or
Python development environment. Transfer the approved `.deb`, `SHA256SUMS`, and
synthetic test data separately.

**Steps:**

1. Verify the artifact checksum, then install the `.deb` using the documented
   end-user installation path.
2. Launch EEG2BIDS from its desktop entry; do not launch it from a source tree.
3. Confirm the application opens, the backend reaches **connected**, and no
   development runtime is requested.
4. Repeat the representative anonymized conversion and validation from
   QA-LINUX-001 using a disposable output directory.
5. Close and relaunch the application and confirm it remains usable.
6. Record whether Chromium sandboxing is active using the release's documented
   diagnostic; use of `--no-sandbox` is a failure.

**Expected:** Installation and launch succeed without developer dependencies;
the frozen backend serves the full workflow; conversion, anonymization, and
validation succeed; and Chromium sandboxing remains enabled.

**Cleanup:** Close EEG2BIDS and remove test output. Leave the package installed
for QA-LINUX-005 and QA-LINUX-006.

### QA-LINUX-003: Invalid dataset feedback

**Release gate:** yes.

**Purpose:** Verify that validation failures are understandable and actionable
in the visible application rather than merely correct at the backend API.

**Prerequisites:** Either the development or packaged application is running and
connected; freshly generated `dev-data/bids_invalid/` is available.

**Steps:**

1. Open the Validator tab and select `dev-data/bids_invalid/`.
2. Start validation and inspect the displayed result.
3. Correct the test condition by selecting `dev-data/bids_valid/` and validate
   again.

**Expected:** The invalid non-BIDS path is reported as a failure without a hang
or false success. A subsequent validation succeeds without restarting the app.

**Cleanup:** Remove generated data if it is no longer needed.

### QA-LINUX-004: Backend interruption and recovery

**Release gate:** yes for development builds; apply to packaged builds when a
supported diagnostic can interrupt or restart only the owned backend.

**Purpose:** Assess user-visible unavailable, disconnected, and recovery states
that are timing- and desktop-dependent.

**Prerequisites:** The application is running and connected. For development,
launch with `npm run dev` in a terminal.

**Steps:**

1. Interrupt the application-owned backend without closing the renderer.
2. Confirm the indicator leaves **connected** and reaches the appropriate
   unavailable/disconnected state.
3. Attempt a backend operation and inspect the visible error.
4. Use **Restart backend** where available, or restore the development backend.
5. Wait for **connected**, then validate `dev-data/bids_valid/`.

**Expected:** The state change is visible; operations fail promptly rather than
hanging or claiming success; reconnection occurs without relaunching the app;
and a subsequent request succeeds.

**Cleanup:** Restore the normal backend state before closing the application.

### QA-LINUX-005: Shutdown process cleanup

**Release gate:** yes; run once for the development launch and once for the
installed candidate.

**Purpose:** Detect owned child processes that remain after an ordinary quit or
development Ctrl+C.

**Prerequisites:** A connected application launched by the path under test. Note
unrelated Electron, Vite, Python, and EEG2BIDS processes before starting.

**Steps:**

1. For development, stop `npm run dev` with Ctrl+C. For the package, quit through
   the application UI.
2. Wait ten seconds.
3. Compare the process list with the baseline, for example with
   `pgrep -af "eeg2bids|electron|vite"`.
4. Confirm that no process owned by the tested application remains. Do not kill
   unrelated processes merely to make the check pass.

**Expected:** The renderer, Electron main process, and application-owned backend
exit. Development Vite processes also exit. Pre-existing unrelated processes
are unchanged.

**Cleanup:** If an owned process remains, capture sanitized process details,
terminate it, and report the failure.

### QA-LINUX-006: Packaged uninstall cleanup

**Release gate:** yes.

**Purpose:** Verify clean end-user removal and package-managed security-policy
cleanup on a machine without development tooling.

**Prerequisites:** The candidate was installed and exercised through
QA-LINUX-002 and is not running.

**Steps:**

1. Uninstall the package using the documented end-user removal path.
2. Confirm the desktop entry and application installation files are removed.
3. Confirm package-managed AppArmor policy and sandbox installation changes are
   removed or restored as designed.
4. Confirm no EEG2BIDS process remains.
5. Record whether user settings or credentials remain according to the
   documented uninstall-data policy; do not expose their contents.

**Expected:** Uninstall completes without development tools, owned processes and
system integration are removed, and user-data behavior matches the documented
policy.

**Cleanup:** Delete the disposable VM or securely remove transferred test data
and candidate artifacts.

## Reporting results

Use one result per scenario and do not report an overall pass if any required
scenario was skipped:

```text
Scenario: QA-LINUX-002
Result: PASS | FAIL | BLOCKED
RC tag: v3.0.0-rc.1
Commit: <full SHA>
CI run: <URL>
Artifact: eeg2bids_3.0.0_amd64.deb
SHA-256: <digest>
Tester/date: <GitHub user>, YYYY-MM-DD
Environment: Ubuntu 24.04.x x86_64, <desktop>, <X11|Wayland>
Launch/install path: <exact command or desktop path>
Test data: synthetic dev-data generated at <commit>, or approved set reference
Expected: <concise expectation>
Observed: <concise result>
Evidence: <sanitized log/screenshot reference, if needed>
Cleanup: PASS | FAIL, <notes>
```

For a failure, include exact reproduction steps and the first visible point of
divergence. Sanitize terminal output and screenshots before attaching them.
Report a security or privacy exposure privately according to the repository's
security policy rather than placing sensitive evidence in a public issue.
