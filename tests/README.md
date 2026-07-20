# Backend tests

Run the whole backend suite with:

```
uv sync --frozen
uv run pytest
```

## BIDS Validator requirement

The dataset-level validation tests (`test_bids_validator.py`) run the current
official **BIDS Validator** — the Deno CLI, pinned to `jsr:@bids/validator@3.0.0`
in `conftest.py`. This is a **required** part of the suite: when `deno` is not
available those tests fail (they do not skip), so missing validation is visible.

Install Deno once (the validator module itself is fetched on first use, then
cached):

```
curl -fsSL https://deno.land/install.sh | sh
```

The tests find `deno` on `PATH` or in the default install location
(`~/.deno/bin` / `$DENO_INSTALL/bin`).

## Fixtures

Committed input fixtures live in `fixtures/` and are produced by the
reproducible generator `tools/make_dev_data.py` — see `fixtures/README.md` for
provenance. Generated BIDS output is written to pytest `tmp_path` and never
committed.
