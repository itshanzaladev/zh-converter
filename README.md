# ZH Converter

Upload your programming assignment files and get the finished assignment back as Word and PDF: a cover page, then for each question its statement, code and a screenshot of the output.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and go to **Start an assignment**.

## What works today

- Cover page details (university logo, name, registration no, section, subject, instructor, date), remembered in the browser
- Files named `q1.html`, `question2.css`, `task3.py`, … are grouped into questions automatically
- HTML/CSS/JS output is rendered and screenshotted in the browser
- Word (.docx) and PDF export, generated entirely in the browser

Running Python, C, C++ and Java is next.

## Deploying

Vercel, with no extra configuration.
