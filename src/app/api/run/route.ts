import { LANGUAGE_ID, runProgram, RunnerError } from "@/lib/judge0";
import type { ConsoleLanguage, Program, SourceFile } from "@/lib/programs";

// Compiling and running can take a while on a busy runner.
export const maxDuration = 60;

const LANGUAGES = Object.keys(LANGUAGE_ID) as ConsoleLanguage[];
const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 1024 * 1024;
const MAX_STDIN_BYTES = 64 * 1024;

function isSource(value: unknown): value is SourceFile {
  const file = value as SourceFile;
  return !!file && typeof file.name === "string" && typeof file.content === "string" && file.name.length <= 200;
}

export async function POST(request: Request) {
  let body: { program?: Program; stdin?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request wasn't valid JSON." }, { status: 400 });
  }

  const { program, stdin = "" } = body;
  if (
    !program ||
    !LANGUAGES.includes(program.language) ||
    !isSource(program.entry) ||
    !Array.isArray(program.files) ||
    program.files.length > MAX_FILES ||
    !program.files.every(isSource) ||
    typeof stdin !== "string"
  ) {
    return Response.json({ error: "That program couldn't be read." }, { status: 400 });
  }
  const size = [program.entry, ...program.files].reduce((sum, f) => sum + f.content.length, 0);
  if (size > MAX_TOTAL_BYTES || stdin.length > MAX_STDIN_BYTES) {
    return Response.json({ error: "These files are too large to run." }, { status: 413 });
  }

  try {
    const result = await runProgram(
      { language: program.language, entry: program.entry, files: program.files },
      stdin,
    );
    return Response.json(result);
  } catch (error) {
    if (error instanceof RunnerError) return Response.json({ error: error.message }, { status: 502 });
    console.error(error);
    return Response.json({ error: "Something went wrong while running the program." }, { status: 500 });
  }
}
