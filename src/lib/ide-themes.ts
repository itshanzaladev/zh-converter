import type { TokenKind } from "./highlight";

export type IdeStyle = "vscode" | "devcpp" | "netbeans";

export type TokenStyle = { color: string; bold?: boolean; italic?: boolean };

/**
 * How code looks in each IDE. The Word and PDF exporters and the on-screen
 * preview all read this, so they match. Colours are hex without "#".
 */
export type IdeTheme = {
  name: string;
  note: string;
  background: string;
  gutter: { background: string; number: string; border: string | null };
  /** The file tab above the code. */
  tabBar: { background: string; tab: string; text: string; border: string | null; bold: boolean; accent: string | null };
  /** NetBeans' "Source | History" strip under the tab. */
  toolbar: { background: string; text: string } | null;
  /** NetBeans' faint line at column 80. */
  rightMargin: string | null;
  tokens: Record<TokenKind, TokenStyle>;
};

const VSCODE_TEXT = "D4D4D4";

export const IDE_THEMES: Record<IdeStyle, IdeTheme> = {
  vscode: {
    name: "VS Code",
    note: "Dark editor, the default theme",
    background: "1E1E1E",
    gutter: { background: "1E1E1E", number: "858585", border: null },
    tabBar: { background: "252526", tab: "1E1E1E", text: "FFFFFF", border: null, bold: false, accent: "007ACC" },
    toolbar: null,
    rightMargin: null,
    tokens: {
      plain: { color: VSCODE_TEXT },
      variable: { color: "9CDCFE" },
      keyword: { color: "569CD6" },
      control: { color: "C586C0" },
      type: { color: "4EC9B0" },
      string: { color: "CE9178" },
      comment: { color: "6A9955" },
      number: { color: "B5CEA8" },
      preproc: { color: "C586C0" },
      function: { color: "DCDCAA" },
      annotation: { color: "DCDCAA" },
      punct: { color: VSCODE_TEXT },
      tag: { color: "569CD6" },
      tagpunct: { color: "808080" },
      attr: { color: "9CDCFE" },
      selector: { color: "D7BA7D" },
      property: { color: "9CDCFE" },
      value: { color: "CE9178" },
    },
  },
  devcpp: {
    name: "Dev C++",
    note: "White editor, red symbols",
    background: "FFFFFF",
    gutter: { background: "FFFFFF", number: "000000", border: "C8C8C8" },
    tabBar: { background: "F0F0F0", tab: "FFFFFF", text: "000000", border: "A0A0A0", bold: false, accent: null },
    toolbar: null,
    rightMargin: null,
    tokens: {
      plain: { color: "000000" },
      variable: { color: "000000" },
      keyword: { color: "000000", bold: true },
      control: { color: "000000", bold: true },
      type: { color: "000000", bold: true },
      string: { color: "0000FF" },
      comment: { color: "0078D7", italic: true },
      number: { color: "800080" },
      preproc: { color: "008000" },
      function: { color: "000000" },
      annotation: { color: "008000" },
      punct: { color: "FF0000", bold: true },
      tag: { color: "000080", bold: true },
      tagpunct: { color: "FF0000", bold: true },
      attr: { color: "800080" },
      selector: { color: "000080", bold: true },
      property: { color: "000000", bold: true },
      value: { color: "0000FF" },
    },
  },
  netbeans: {
    name: "NetBeans",
    note: "Blue keywords, grey gutter",
    background: "FFFFFF",
    gutter: { background: "F0F0F0", number: "808080", border: "DCDCDC" },
    tabBar: { background: "DCE2EA", tab: "FFFFFF", text: "000000", border: "A8B4C4", bold: true, accent: null },
    toolbar: { background: "F4F4F4", text: "404040" },
    rightMargin: "FFD0D0",
    tokens: {
      plain: { color: "000000" },
      variable: { color: "000000" },
      keyword: { color: "0000E6" },
      control: { color: "0000E6" },
      type: { color: "0000E6" },
      string: { color: "CE7B00" },
      comment: { color: "969696" },
      number: { color: "000000" },
      preproc: { color: "009B00" },
      function: { color: "000000" },
      annotation: { color: "808000" },
      punct: { color: "000000" },
      tag: { color: "0000E6" },
      tagpunct: { color: "0000E6" },
      attr: { color: "009900" },
      selector: { color: "0000E6" },
      property: { color: "009900" },
      value: { color: "CE7B00" },
    },
  },
};

export const DEFAULT_IDE: IdeStyle = "vscode";

export function ideTheme(style: IdeStyle | undefined) {
  return IDE_THEMES[style ?? DEFAULT_IDE] ?? IDE_THEMES[DEFAULT_IDE];
}
