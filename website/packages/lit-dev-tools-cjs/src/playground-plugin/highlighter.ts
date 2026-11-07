/**
 * @license
 * Copyright The Lit Project
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {pathToFileURL} from 'url';

/**
 * Syntax highlighting for static code snippets, using Shiki
 * (https://shiki.style).
 *
 * The output keeps the markup the site already styles and scripts against:
 *
 *   <figure class="cm-editor">
 *     <div class="cm-line"><span class="tok-keyword">import</span> ...</div>
 *     ...
 *   </figure>
 *
 * Token colors come from the `tok-*` rules in
 * packages/lit-dev-content/site/css/codemirror.css, which read the same
 * `--playground-code-*` variables as the interactive playground editor. To get
 * classes instead of inline colors, the Shiki theme below assigns each token
 * class a unique placeholder color, which is then mapped back to the class.
 */

/**
 * TextMate scopes for each token class. More specific scopes win over less
 * specific ones, following normal TextMate theme rules. The choices follow how
 * the playground editor (CodeMirror 6 with `classHighlighter`) classifies the
 * same code, so static snippets and editors look alike.
 *
 * An empty class name means "no color", for scopes that would otherwise match
 * a broader rule.
 */
const TOKEN_CLASSES: Array<[className: string, scopes: string[]]> = [
  [
    '',
    [
      // `${` and `}` in Lit templates. The es-tag-html grammar scopes them as
      // a bare `entity.name.tag`; real tags carry a language suffix below.
      'entity.name.tag',
      'keyword.operator.type.annotation',
      'storage.type.function.arrow',
      'keyword.operator.spread',
    ],
  ],
  ['tok-comment', ['comment', 'punctuation.definition.comment']],
  [
    'tok-keyword',
    [
      'keyword',
      'storage.type',
      'storage.modifier',
      'keyword.operator.new',
      'keyword.operator.expression',
      'variable.language',
    ],
  ],
  [
    'tok-operator',
    [
      'keyword.operator',
      'punctuation.accessor',
      // The `=` between an HTML attribute and its value.
      'punctuation.separator.key-value.html',
    ],
  ],
  ['tok-string', ['string', 'support.type.property-name.json']],
  [
    'tok-string2',
    [
      'string.template',
      'string.regexp',
      'punctuation.definition.template-expression',
      'punctuation.section.embedded',
    ],
  ],
  ['tok-number', ['constant.numeric', 'keyword.other.unit']],
  ['tok-bool', ['constant.language.boolean']],
  [
    'tok-atom',
    [
      'constant.language',
      'variable.language.super',
      'support.constant',
      'constant.other.color',
      'support.constant.property-value',
    ],
  ],
  ['tok-definition', ['entity.name.function.decorator']],
  [
    'tok-variableName',
    [
      'variable.other.readwrite',
      'variable.other.constant',
      'variable.other.object',
      'variable.parameter',
      'entity.name.function',
      'entity.other.inherited-class',
      'support.function',
    ],
  ],
  [
    'tok-propertyName',
    [
      'variable.other.property',
      'variable.object.property',
      'meta.object-literal.key',
      'support.type.property-name',
      'meta.definition.method entity.name.function',
      'meta.method.declaration storage.type',
      'entity.other.attribute-name',
    ],
  ],
  [
    'tok-typeName',
    [
      'entity.name.type',
      'entity.name.class',
      'support.class',
      'support.type',
      'new.expr entity.name.function',
      // HTML tag names, including inside Lit templates.
      'entity.name.tag.html',
      // CSS `.class` and `:pseudo` selectors.
      'entity.other.attribute-name.class.css',
      'entity.other.attribute-name.pseudo-class.css',
    ],
  ],
  ['tok-meta', ['meta.decorator punctuation.decorator']],
  [
    'tok-tagName',
    [
      'entity.name.tag.css',
      'entity.name.tag.js',
      'entity.name.tag.jsx',
      'entity.name.tag.tsx',
      'entity.name.tag.xml',
      'entity.name.tag.localname.xml',
    ],
  ],
];

/** Placeholder foreground for text without a token class. */
const DEFAULT_COLOR = '#000000';

/** Placeholder color for each class: #000001, #000002, ... */
const placeholderColor = (index: number) =>
  `#${(index + 1).toString(16).padStart(6, '0')}`;

const classByColor = new Map(
  TOKEN_CLASSES.map(([className], i) => [placeholderColor(i), className])
);

const THEME = {
  name: 'litdev-token-classes',
  type: 'light',
  colors: {
    'editor.foreground': DEFAULT_COLOR,
    'editor.background': '#ffffff',
  },
  tokenColors: [
    {settings: {foreground: DEFAULT_COLOR}},
    ...TOKEN_CLASSES.map(([, scope], i) => ({
      scope,
      settings: {foreground: placeholderColor(i)},
    })),
  ],
};

/**
 * Shiki grammars to load. `ts-tags` ("TypeScript with Tags", alias `lit`) is
 * TypeScript plus the es-tag-* injection grammars. Those inject into every
 * JS/TS grammar, so loading it highlights the contents of Lit's html`...` and
 * css`...` tagged templates in plain `js`, `ts`, `jsx` and `tsx` snippets too.
 */
const LANGUAGES = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'ts-tags',
  'html',
  'css',
  'json',
  'shellscript',
  'xml',
  'markdown',
];

/** Fence and shortcode language names, mapped to Shiki language IDs. */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  sh: 'shellscript',
  bash: 'shellscript',
  shell: 'shellscript',
  md: 'markdown',
};

// The minimal slice of the Shiki API used here. Shiki's own type definitions
// need a newer TypeScript than this repo uses.
interface ShikiToken {
  content: string;
  color?: string;
}
interface ShikiHighlighter {
  codeToTokens(
    code: string,
    options: {lang: string; theme: string}
  ): {tokens: ShikiToken[][]};
  getLoadedLanguages(): string[];
  dispose(): void;
}

/**
 * Import an ES module from this CommonJS package. TypeScript would otherwise
 * compile `import()` to `require()`, which cannot load ES modules on Node 18.
 * The specifier is resolved from this package first, so that the root
 * node_modules (which has an older Shiki for TypeDoc) is never picked up.
 */
const importFromHere = (specifier: string): Promise<any> =>
  new Function('url', 'return import(url)')(
    pathToFileURL(require.resolve(specifier)).href
  );

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export class Highlighter {
  private constructor(private readonly shiki: ShikiHighlighter) {}

  static async create(): Promise<Highlighter> {
    const {createHighlighter} = await importFromHere('shiki');
    const shiki = (await createHighlighter({
      themes: [THEME],
      langs: LANGUAGES,
    })) as ShikiHighlighter;
    return new Highlighter(shiki);
  }

  dispose() {
    this.shiki.dispose();
  }

  /**
   * Highlight `code` and return a `<figure class="cm-editor">` with one
   * `<div class="cm-line">` per line. Unknown languages are rendered as plain
   * text in the same markup.
   */
  render(lang: string | undefined, code: string): {html: string} {
    const requested = LANGUAGE_ALIASES[lang ?? ''] ?? lang ?? '';
    const shikiLang = this.shiki.getLoadedLanguages().includes(requested)
      ? requested
      : 'text';
    const {tokens} = this.shiki.codeToTokens(code, {
      lang: shikiLang,
      theme: THEME.name,
    });

    // A trailing newline produces a final empty line; don't render it.
    if (
      tokens.length > 1 &&
      tokens[tokens.length - 1].every(({content}) => content === '')
    ) {
      tokens.pop();
    }

    const lines = tokens.map((lineTokens) => {
      let html = '';
      let openClass: string | undefined;
      let previous = '';
      for (const [i, {content, color}] of lineTokens.entries()) {
        let className =
          (color && classByColor.get(color.toLowerCase())) || undefined;
        // The es-tag-* grammars scope the tag of a tagged template (the `html`
        // in html`...`) as a block comment, because they also accept the
        // /* html */ form. Show a lone identifier right before a backtick as
        // a name instead.
        if (
          className === 'tok-comment' &&
          /^\s*[A-Za-z_$][\w$]*\s*$/.test(content) &&
          lineTokens[i + 1]?.content.startsWith('`')
        ) {
          className = 'tok-variableName';
        }
        // A name after `.` is a property, as in the playground editor. TextMate
        // grammars scope method calls like `this.render()` as functions.
        if (className === 'tok-variableName' && previous.endsWith('.')) {
          className = 'tok-propertyName';
        }
        if (content.trim() !== '') {
          previous = content.trim();
        }
        if (className !== openClass) {
          if (openClass !== undefined) html += '</span>';
          if (className !== undefined) html += `<span class="${className}">`;
          openClass = className;
        }
        html += escapeHtml(content);
      }
      if (openClass !== undefined) html += '</span>';
      return `<div class="cm-line">${html === '' ? '<br>' : html}</div>`;
    });

    return {html: `<figure class="cm-editor">${lines.join('')}</figure>`};
  }
}
