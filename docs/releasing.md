# Release candidates

EEG2BIDS releases use immutable release candidates so maintainers can manually
qualify the exact Linux and Windows files that may later become a final release.
macOS is tracked separately in issue #189. Windows installers are currently
unsigned and may trigger a SmartScreen warning.

## Create a candidate

1. Set `package.json` to the intended final version, without an RC suffix (for
   example, `3.0.0`), update `package-lock.json`, and merge that change to the
   commit to be released.
2. Create a new annotated RC tag on that commit. Never move or reuse an RC tag:

   ```bash
   git tag -a v3.0.0-rc.1 -m "EEG2BIDS 3.0.0 RC 1"
   git push origin v3.0.0-rc.1
   ```

3. The release-candidate workflow runs the exact-tag test suite and native
   Linux/Windows package jobs. If all jobs pass, it creates a GitHub prerelease
   containing the `.deb`, unsigned Windows installer, platform-specific SHA-256
   files, and `SOURCE.txt` provenance.

The tag must match `v<package-version>-rc.<positive-number>`. The workflow
refuses a tag whose final version differs from `package.json`, or one for which
a GitHub Release already exists.

## Qualify a candidate

Download artifacts from the GitHub prerelease, verify the platform-specific
checksums, and perform the scenarios in [manual-qa.md](manual-qa.md). Record the
RC tag, full commit SHA, workflow run, artifact names and checksums, supported
environment, tester, date, and results.

If QA fails, leave the prerelease and tag intact for traceability. Merge fixes
and create the next tag (`v3.0.0-rc.2`, for example). Never replace an asset or
force-push a candidate tag.

Final promotion is a separate, protected manual operation. It must copy the
qualified prerelease assets byte-for-byte rather than rebuilding them. Until
that workflow is added, do not treat the RC workflow as authorization to publish
a final production release.

## Troubleshooting

The Package workflow can be run manually without publishing a GitHub Release.
Its Linux and Windows artifacts are retained for 14 days. Candidate prerelease
assets remain attached to the GitHub prerelease for QA and traceability.
Build and smoke-test failures retain the same diagnostic artifacts described in
[linux-packaging-verification.md](linux-packaging-verification.md) and
[windows-packaging.md](windows-packaging.md).
