# ADR-004: Label PDF generation

- Status: Accepted with physical-legibility follow-up
- Date: 2026-11-06
- Requirements: PACK-001, PACK-004, PACK-005

## Context

The Phase 1 label output must use exact physical dimensions, preserve required
text size, embed fonts and produce deterministic PDFs. The S3 experiment
compares direct browser printing with two SVG-to-PDF routes using the same
label artwork.

## Experiment

Rendered one generated SVG label at 100 x 150 mm through Chromium print,
PDFKit with svg-to-pdfkit, and jsPDF with svg2pdf.js. The fixture contained
eight text items in regular and bold Arial. Its smallest text was 2.2 mm
(6.236 pt), chosen as an engineering fixture only; this is not a legal
minimum-size determination.

Inspected the generated PDFs with PDF.js 6.5.438 for page dimensions,
extractable text and text height, and checked PDF font-file references. Each
route generated three files per run; repeatability was checked by SHA-256
across repeated generations and separate process runs.

| Route                               | Page size            | Smallest text | Fonts embedded | Deterministic | File size |
| ----------------------------------- | -------------------- | ------------: | -------------- | ------------- | --------: |
| Chromium 156.0.8078.4 print         | 100.161 x 150.283 mm |      2.199 mm | Yes            | No            |  40,671 B |
| PDFKit 0.20.2 + svg-to-pdfkit 0.1.8 | 100 x 150 mm         |      2.200 mm | Yes            | Yes           |  35,796 B |
| jsPDF 4.2.1 + svg2pdf.js 2.9.0      | 100 x 150 mm         |      2.200 mm | Yes            | Yes           |  55,725 B |

All routes produced one-page PDFs with the same eight extractable text items.
Each embedded two font subsets. The Chromium print output was slightly larger
than the requested dimensions, and its bytes varied across runs despite equal
file sizes. Both vector conversion routes matched the requested MediaBox and
produced identical bytes in repeated runs on this environment.

## Decision

Use jsPDF with svg2pdf.js as the recommended Phase 1 browser-side SVG-to-PDF
route, subject to print-scale legibility testing. It matches the requested
physical page dimensions, embedded the test fonts, preserved the fixture font
size, and produced identical bytes across repeated runs. It runs in the
browser, keeping label export local, and its maintained SVG converter is
preferable to the smaller PDFKit output path, whose svg-to-pdfkit dependency
is no longer actively updated.

Treat the SVG as application-generated, curated markup. Use DOM text nodes or
an escaping renderer for user-provided label content; do not interpolate
untrusted input into raw SVG. Keep PDF generation behind the label-output
boundary so a future renderer change does not affect domain or engine code.

The tested Arial font files were read from the local Windows installation
and were not copied into the repository. Before implementation, select a font
whose licence permits embedding and distribution. The 2.2 mm fixture size is
only a renderer test; determine the actual type-size guard from verified
requirements and reviewer answer R1-21 before enforcing it.

## P1-5 turn 10 implementation note (2026-11-09)

`packages/label` now provides a pure SVG layout function with caller-supplied
physical dimensions, orientation, margins, ordered content blocks, required
block kinds, text sizes and per-block minimum-size evidence status. It emits
millimetre-sized SVG, escapes text and attributes, and returns explicit
review-required issues for missing content, duplicate blocks, below-minimum
text, unverified/missing minimum-size sources and layout overflow. It never
shrinks text. Since no universal minimum size or complete print-legibility
policy has been approved, the caller must supply a source-backed minimum for
each block; otherwise the output remains review-required. Horizontal overflow
uses an approximate font-width estimate only and requires rendered proof.

This is a layout primitive, not a regulatory evaluator or final label
determination. NIP formatting remains gated on reviewer-approved policy. At
turn 10 completion, font licensing, browser/PDF rendering, physical proofing,
final content assembly and PDF export remained follow-ups; turn 11 PDF export
is recorded below.

## P1-5 turn 11 implementation note (2026-11-09)

`packages/label` now exports the generated SVG as a PDF label page at its
millimetre dimensions and appends a separate A4 export-report page. The report
records the product version, rule release, canonical UTC export timestamp,
layout status, layout issues and the non-certification statement; none of this
report text is added to the label artwork. PDF creation time and file ID are
derived from the explicit timestamp and export inputs, so repeated exports of
the same layout and metadata produce identical bytes in Chromium.

The exporter accepts only the generated SVG element/attribute subset and
rejects malformed or dimension-mismatched layouts. It does not embed a font:
each report therefore marks font embedding and physical print legibility as
REVIEW REQUIRED. This is intentionally not a print-ready or compliance
determination. A licensed font selection, rendered/physical proof, and
reviewer-confirmed minimum-size policy (R1-21) remain P1-5 gates.

Manual PDF inspection found that the exporter converted authored millimetre
font sizes to points before passing the SVG to svg2pdf.js. Since the SVG's
millimetre dimensions and matching viewBox already establish the physical
scale, that conversion enlarged label text and caused overlap. The conversion
was removed; font sizes now remain in the SVG's millimetre-scale user units.
The browser regression test verifies the emitted font-size operator alongside
the exact physical page dimensions. Recheck a printed export at actual size;
this fix does not address line wrapping or establish physical legibility.

## P1-6 turn 12 integration note (2026-11-09)

The web app provides an explicitly illustrative SVG preview and PDF export
workflow using fictional demo records. It is labelled "DEMONSTRATION ONLY —
NOT A FOOD LABEL", contains no assembled regulatory declarations or evidence,
and is not a reviewer-approved golden fixture. Both jsPDF and svg2pdf.js are
loaded on demand and preloaded before the offline export path; a failed preload
is reported to the user and can be retried.

Playwright tests cover exporting the illustrative PDF while offline,
restoring an encrypted demo backup into a clean browser profile, blocking a
third-party script under the development CSP, and automated WCAG 2.1 A/AA
checks across workspace screens. These checks do not close R3-01 to R3-03 or
the R1-21 minimum-size and physical-print review gates. Turn 12 remains
incomplete until reviewer-verified golden fixtures and the remaining phase
gates are addressed.

## Limitations and follow-up

- This was a single Windows/Chromium experiment. Byte-for-byte determinism
  across operating systems, browsers, fonts, dependency upgrades and runtime
  versions has not been established.
- Extracted PDF text metrics verify the emitted font size, not human
  readability on a physical print. P1-5 still needs rendered proof/print-scale
  inspection and minimum-size guard tests, informed by R1-21.
- No font redistribution decision or font licence review was made.
- The PDF exporter currently relies on renderer font fallback and intentionally
  reports font embedding as unverified; do not treat an exported PDF as a
  print-ready label.
- Only the tested SVG feature subset was exercised; gradients, images,
  clipping, long-text overflow, pagination and unsupported SVG features need
  coverage before production.
- The PDF file size is for this small fixture only.

## Sources

- jsPDF documentation: https://github.com/MrRio/jsPDF
- svg2pdf.js documentation: https://github.com/yWorks/svg2pdf.js
- PDFKit documentation: https://pdfkit.org/docs/getting_started.html
- svg-to-pdfkit repository: https://github.com/alafr/SVG-to-PDFKit
- PDF.js API: https://mozilla.github.io/pdf.js/api/
