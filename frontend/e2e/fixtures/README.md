# Browser-test score fixtures

`simple-score.musicxml` is an original, minimal test composition in this repository. `simple-score.gp` is its Guitar Pro 7 binary equivalent, generated with the project's alphaTab dependency:

```bash
cd frontend
node e2e/fixtures/generate-gp-fixture.mjs
```

The generator checks that alphaTab can read the result before writing it. Both files contain only this project's synthetic test notes; no third-party song or score is redistributed.
