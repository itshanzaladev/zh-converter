/**
 * Small additions compiled or run alongside the student's program so that
 * whatever it reads from stdin is printed at the moment it's read, the way a
 * terminal shows what was typed. Without them the output would read
 * "Enter a number: Square = 49" instead of "Enter a number: 7 / Square = 49".
 *
 * Each one hands the program its input a line at a time, echoing the line
 * through the program's own stdout so it lands in the right place.
 */

/** C: replaces `stdin` with a stream that echoes each line (scanf, gets, getchar, fgets). */
export const C_ECHO = String.raw`#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include <stdio.h>
#include <string.h>
#include <sys/types.h>

static FILE *zh_real;
static char zh_line[1 << 16];
static size_t zh_len, zh_pos;

static ssize_t zh_read(void *cookie, char *buf, size_t size) {
  (void)cookie;
  if (zh_pos >= zh_len) {
    if (!fgets(zh_line, sizeof zh_line, zh_real)) return 0;
    zh_len = strlen(zh_line);
    zh_pos = 0;
    fputs(zh_line, stdout);
    if (zh_line[zh_len - 1] != '\n') fputc('\n', stdout);
  }
  size_t n = zh_len - zh_pos < size ? zh_len - zh_pos : size;
  memcpy(buf, zh_line + zh_pos, n);
  zh_pos += n;
  return (ssize_t)n;
}

__attribute__((constructor)) static void zh_echo_stdin(void) {
  cookie_io_functions_t io = { zh_read, NULL, NULL, NULL };
  FILE *echo = fopencookie(NULL, "r", io);
  if (echo) {
    zh_real = stdin;
    stdin = echo;
  }
}
`;

/** C++: the C version, plus cin reading from that same stream. */
export const CPP_ECHO =
  C_ECHO +
  String.raw`
#include <iostream>

struct ZhCinBuf : std::streambuf {
  int_type underflow() override {
    int c = std::getc(stdin);
    if (c == EOF) return traits_type::eof();
    std::ungetc(c, stdin);
    return c;
  }
  int_type uflow() override {
    int c = std::getc(stdin);
    return c == EOF ? traits_type::eof() : c;
  }
  int_type pbackfail(int_type c) override {
    return c == traits_type::eof() ? c : std::ungetc(c, stdin);
  }
};
static ZhCinBuf zh_cin_buf;
static struct ZhCinInit {
  ZhCinInit() { std::cin.rdbuf(&zh_cin_buf); }
} zh_cin_init;
`;

/** Java and Kotlin share this InputStream (Java syntax); Kotlin builds its own below. */
const JAVA_STREAM = String.raw`new java.io.InputStream() {
      private byte[] line = new byte[0];
      private int pos = 0;
      private boolean fill() throws java.io.IOException {
        if (pos < line.length) return true;
        java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
        int c;
        while ((c = real.read()) != -1) { bytes.write(c); if (c == '\n') break; }
        if (bytes.size() == 0) return false;
        line = bytes.toByteArray();
        pos = 0;
        System.out.write(line, 0, line.length);
        if (line[line.length - 1] != '\n') System.out.println();
        System.out.flush();
        return true;
      }
      @Override public int read() throws java.io.IOException { return fill() ? line[pos++] & 0xff : -1; }
      @Override public int read(byte[] b, int off, int len) throws java.io.IOException {
        if (len == 0) return 0;
        if (!fill()) return -1;
        int n = Math.min(len, line.length - pos);
        System.arraycopy(line, pos, b, off, n);
        pos += n;
        return n;
      }
      @Override public int available() { return line.length - pos; }
    }`;

/** Java: Judge0 runs `java Main`, so Main sets up the echo and starts the student's class. */
export function javaMain(studentClass: string) {
  return String.raw`public class Main {
  public static void main(String[] args) throws Exception {
    final java.io.InputStream real = System.in;
    System.setIn(${JAVA_STREAM});
    ${studentClass}.main(args);
  }
}
`;
}

/** Kotlin: appended after the student's code; their `main` is renamed to zhStudentMain. */
export function kotlinMain(passArgs: boolean) {
  return String.raw`

fun main(args: Array<String>) {
    val real = System.` + "`in`" + String.raw`
    System.setIn(object : java.io.InputStream() {
        private var line = ByteArray(0)
        private var pos = 0
        private fun fill(): Boolean {
            if (pos < line.size) return true
            val bytes = java.io.ByteArrayOutputStream()
            while (true) {
                val c = real.read()
                if (c == -1) break
                bytes.write(c)
                if (c == '\n'.code) break
            }
            if (bytes.size() == 0) return false
            line = bytes.toByteArray()
            pos = 0
            System.out.write(line, 0, line.size)
            if (line[line.size - 1] != '\n'.code.toByte()) System.out.println()
            System.out.flush()
            return true
        }
        override fun read(): Int = if (fill()) line[pos++].toInt() and 0xff else -1
        override fun read(b: ByteArray, off: Int, len: Int): Int {
            if (len == 0) return 0
            if (!fill()) return -1
            val n = minOf(len, line.size - pos)
            System.arraycopy(line, pos, b, off, n)
            pos += n
            return n
        }
        override fun available(): Int = line.size - pos
    })
    zhStudentMain(${passArgs ? "args" : ""})
}
`;
}

/** C#: compiled with -main:ZhEntry. Sets up the echo, then finds and runs the student's Main. */
export const CSHARP_ECHO = String.raw`using System;
using System.IO;
using System.Linq;
using System.Reflection;

class ZhReader : TextReader {
  readonly TextReader real;
  string line;
  int pos;
  public ZhReader(TextReader real) { this.real = real; }
  bool Fill() {
    if (line != null && pos < line.Length) return true;
    var next = real.ReadLine();
    if (next == null) return false;
    Console.Out.WriteLine(next);
    line = next + "\n";
    pos = 0;
    return true;
  }
  public override int Peek() { return Fill() ? line[pos] : -1; }
  public override int Read() { return Fill() ? line[pos++] : -1; }
  public override string ReadLine() {
    if (!Fill()) return null;
    var rest = line.Substring(pos).TrimEnd('\n');
    pos = line.Length;
    return rest;
  }
}

static class ZhEntry {
  static int Main(string[] args) {
    Console.SetIn(new ZhReader(Console.In));
    var main = Assembly.GetExecutingAssembly().GetTypes()
      .Where(t => t.Name != "ZhEntry")
      .Select(t => t.GetMethod("Main", BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic))
      .First(m => m != null);
    try {
      var result = main.Invoke(null, main.GetParameters().Length == 0 ? null : new object[] { args });
      if (result is System.Threading.Tasks.Task task) task.GetAwaiter().GetResult();
      return result is int code ? code : 0;
    } catch (TargetInvocationException e) {
      System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(e.InnerException).Throw();
      throw;
    }
  }
}
`;

/** Ruby: one line in front of the program, so `gets` echoes. */
export const RUBY_ECHO =
  'module Kernel; alias_method :__zh_gets, :gets; def gets(*a); l = __zh_gets(*a); $stdout.print(l.end_with?("\\n") ? l : "#{l}\\n") if l; l; end; end';

/**
 * Replaces matches only in code, never inside strings or comments, so a
 * rename can't change what the program prints.
 */
export function replaceInCode(source: string, pattern: RegExp, replacement: string, maxCount = Infinity) {
  const segment = /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\/\/[^\n]*|\/\*[\s\S]*?\*\/)/;
  let count = 0;
  return source
    .split(segment)
    .map((part, i) => {
      // split() with one capture group puts strings and comments at odd indexes.
      if (i % 2 === 1 || count >= maxCount) return part;
      return part.replace(pattern, (match) => (count++ < maxCount ? replacement : match));
    })
    .join("");
}
