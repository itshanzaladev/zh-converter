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
- HTML/CSS output is rendered and screenshotted in the browser
- Programs are run on [Judge0](https://judge0.com) and the output is drawn as a terminal window: C, C++, Java, Python, C#, JavaScript, TypeScript, Kotlin, Dart, Go, Rust, Ruby, PHP, Swift, R, SQL (SQLite), Bash, MATLAB/Octave, VB.NET and Haskell
- A program that reads input gets sample input worked out from its code (a name gets "Ali", marks get 85), which the student can change
- Input shows where it was typed: C, C++, Java, C#, Kotlin, Python, Ruby and R programs echo it as they read it; for the rest it's placed after each prompt
- A PHP page that prints HTML is screenshotted like a web page
- Word (.docx) and PDF export, generated entirely in the browser, with the cover centred like a standard university title page

Flutter apps can't be run; students add a screenshot from their emulator.

## Code runner

Programs are sent from `/api/run` to a Judge0 server. Configure it with environment variables (see `.env.example`):

| Variable         | Default                 | Notes                                                    |
| ---------------- | ----------------------- | -------------------------------------------------------- |
| `JUDGE0_URL`     | `https://ce.judge0.com` | The public instance is for testing and is rate limited.  |
| `JUDGE0_API_KEY` | (none)                  | Sent as `X-RapidAPI-Key` for RapidAPI, else `X-Auth-Token`. |

For production, use a paid Judge0 plan or a self-hosted Judge0 server.

## Deploying

Vercel. Set the Judge0 variables in the project settings.
