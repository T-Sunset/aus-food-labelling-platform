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

## Limitations and follow-up

- This was a single Windows/Chromium experiment. Byte-for-byte determinism
  across operating systems, browsers, fonts, dependency upgrades and runtime
  versions has not been established.
- Extracted PDF text metrics verify the emitted font size, not human
  readability on a physical print. P1-5 still needs rendered proof/print-scale
  inspection and minimum-size guard tests, informed by R1-21.
- No font redistribution decision or font licence review was made.
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
