# Backend tests

The canonical setup, commands, suite-selection guidance, and troubleshooting
are in the project [testing guide](../docs/testing.md). Run the complete backend
suite with:

```sh
uv run pytest
```

## Backend-specific notes

The dataset-level checks in `test_bids_validator.py` run the official BIDS
Validator through Deno, pinned to `jsr:@bids/validator@3.0.0` in `conftest.py`.
Validation is required: these tests fail rather than skip when Deno or the
validator cannot run.

Committed source fixtures live in `fixtures/`. See the
[fixture README](fixtures/README.md) for their contents, provenance, and
regeneration details. Generated BIDS output is written to pytest temporary
directories and is never committed.
