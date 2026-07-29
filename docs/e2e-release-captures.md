# E2E And Release Captures

This project now includes Playwright-based browser integration tests plus a capture suite for release collateral.

## What exists

- `npm run test:e2e`
  Runs the smoke suite against the local app.

- `npm run test:e2e:all`
  Runs both smoke tests and the release capture suite.

- `npm run capture:release`
  Runs the release capture project only.
  It exports stable screenshots for the main product surfaces.

- `npm run capture:release:headed`
  Same capture suite, but with a visible browser window.

## Output

- Screenshots: `artifacts/release-captures/`
- Flow videos: `artifacts/release-videos/`
- HTML report: `artifacts/playwright-report/`
- Smoke artifacts: `artifacts/e2e-smoke/`

## What gets covered

- Editor shell
- Local agent panel and deterministic tool turn
- PNG to Flat Model workbench
- Avatar Forge starter heroes and controls
- Standard humanoid clip library and Motion Ripper local-video flow
- Template library sections
- Object list and properties panel
- Rig assignment and rig panel flows
- Texture editor, AI modal, prompt editor, and config modal
- SVG workbench and SVG head lab
- LLM prompt generator
- Help page sections

## Notes

- The suite avoids live OpenAI, Ollama, and Stable Diffusion calls on purpose.
  The goal is deterministic captures and stable E2E coverage.

- On Windows, the Playwright config tries to use the locally installed Microsoft Edge automatically.
  You can override this with `PLAYWRIGHT_EXECUTABLE_PATH` if needed.

- Video is optional because long 1600x1000 recordings consume substantial disk
  space. Set `RETROVISOR_RELEASE_VIDEO=1` before running
  `npm run capture:release` when `.webm` source material is explicitly needed.

- Traces are also opt-in. Set `RETROVISOR_E2E_TRACE=1` when a failing flow
  needs a Playwright trace.
