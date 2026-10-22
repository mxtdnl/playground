# pdf2email

**Status:** active

Browser tool that extracts names and email addresses from PDFs and exports an `.xlsx` with one row per PDF.

## Run

Open `index.html` in a browser (needs internet: pdf.js and SheetJS load from cdnjs). Drop PDFs in, then click "Download .xlsx".

## Test

No automated tests. Manually: load a PDF with known names/emails and check the table and the downloaded `pdf2email.xlsx`.

## Notes

- Output columns: File, Pages, Names, Emails, Email 1..n.
- Names are heuristic: "Name:"-style labels, capitalised words before an email, or the email's local part.
- Scanned PDFs without a text layer return nothing (no OCR).
- Everything runs client-side; no files are uploaded.
