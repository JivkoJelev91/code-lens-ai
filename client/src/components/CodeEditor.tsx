import Editor, { type Monaco } from '@monaco-editor/react';
import styles from '@/components/CodeEditor.module.scss';

type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language?: string;
};

const defineTheme = (monaco: Monaco) => {
  monaco.editor.defineTheme('code-lens', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'delimiter', foreground: 'a9ffc4' },
      { token: 'ident', foreground: '00ff41' },
      { token: 'keyword', foreground: '00ff41' },
      { token: 'string', foreground: '7dffa5' },
      { token: 'number', foreground: '4ee06b' },
      { token: 'comment', foreground: '55a06b', fontStyle: 'italic' },
      { token: 'type', foreground: 'b4ffc9' },
      { token: 'function', foreground: 'cfffe0' },
      { token: 'variable', foreground: '00ff41' },
    ],
    colors: {
      'editor.background': '#00000000',
      'editor.foreground': '#00ff41',
      'editorCursor.foreground': '#00ff41',
      'editorLineNumber.foreground': '#00ff4159',
      'editorLineNumber.activeForeground': '#00ff41',
      'editor.selectionBackground': '#00ff4140',
      'editor.lineHighlightBackground': '#00ff4110',
      'scrollbarSlider.background': '#00ff4126',
      'scrollbarSlider.hoverBackground': '#00ff4166',
      'scrollbarSlider.activeBackground': '#00ff4199',
      'scrollbarSlider.shadow': '#00000000',
    },
  });
};

const CodeEditor = ({ value, onChange, language }: CodeEditorProps) => {
  const lang = language  ?language.toLowerCase() : 'javascript';

  return (
    <Editor
      className={styles.codeEditor}
      height="100%"
      language={lang}
      theme="code-lens"
      value={value}
      onChange={(next) => onChange(next ?? '')}
      beforeMount={defineTheme}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        padding: { top: 10 },
        scrollBeyondLastLine: false,
        lineNumbersMinChars: 3,
      }}
      loading={<span className={styles.codeEditorLoading}>loading editor…</span>}
    />
  );
};

export default CodeEditor;