**Comparison target**

- Source visual truth: `/var/folders/77/xzvpb7ts46db_b8mp52xjv9h0000gn/T/TemporaryItems/NSIRD_screencaptureui_lQDMg6/Screenshot 2026-07-09 at 4.31.41 PM.png`
- Intended implementation: `/pools/marcins-2026-world-cup-pool/heatmap`, leading `Podium predictions` panel.
- Intended viewport/state: desktop, live-score sorted podium matrix.

**Findings**

- [P1] Browser-rendered implementation capture is unavailable.
  Location: in-app browser preview.
  Evidence: navigation reached the local route's loading state, then the in-app browser could not attach a persistent webview to capture the rendered page.
  Impact: the spreadsheet-style table cannot be visually compared against the supplied reference at the same viewport.
  Fix: rerun visual QA once the in-app browser can attach to a local preview.

**Open Questions**

- The source screenshot does not define an eliminated-team state. The implementation intentionally maps heat intensity to shared-pick frequency instead.

**Implementation Checklist**

1. Reopen the local heatmap route in the in-app browser.
2. Capture the new podium matrix at a desktop viewport and compare its title band, grid density, typography, and heat-cell contrast with the source screenshot.
3. Validate the horizontal overflow behavior at a narrow mobile viewport.

**Follow-up Polish**

- Consider a dedicated eliminated-pick treatment once knockout results are available.

final result: blocked
