'use strict';

/* Text-only scan of shipped engine sources. It tokenizes just enough of a
   classic script to find string literals and drop comments; it never imports,
   evaluates or executes a game script. Shared by the bookmark-id lint and the
   content-id ratchet. */

const fs = require('fs');
const path = require('path');

const gameRoot = path.resolve(__dirname, '..', '..', '..');
const STRING_MARK = '§';
const regexAfterWords = new Set([
  'return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete',
  'void', 'throw', 'instanceof', 'yield'
]);
const regexAfterPunctuation = '(,=:[!&|?{};+-*%<>~^';

function isWordChar(ch) {
  return /[A-Za-z0-9_$]/.test(ch);
}

function decodeEscape(text, index) {
  const ch = text[index];
  const simple = { n:'\n', t:'\t', r:'\r', b:'\b', f:'\f', v:'\v', 0:'\0' };
  if (ch === 'x') {
    return { value:String.fromCharCode(parseInt(text.substr(index + 1, 2), 16)), length:3 };
  }
  if (ch === 'u' && text[index + 1] === '{') {
    const end = text.indexOf('}', index);
    return {
      value:String.fromCodePoint(parseInt(text.slice(index + 2, end), 16)),
      length:end - index + 1
    };
  }
  if (ch === 'u') {
    return { value:String.fromCharCode(parseInt(text.substr(index + 1, 4), 16)), length:5 };
  }
  if (Object.prototype.hasOwnProperty.call(simple, ch) &&
      !(ch === '0' && /[0-9]/.test(text[index + 1] || ''))) {
    return { value:simple[ch], length:1 };
  }
  if (ch === '\r' && text[index + 1] === '\n') return { value:'', length:2 };
  if (ch === '\n' || ch === '\r') return { value:'', length:1 };
  return { value:ch, length:1 };
}

/* Returns every string literal with its 1-based starting line, plus the
   source with comments removed and each literal replaced by STRING_MARK.
   Line breaks are preserved so masked line N is source line N. */
function scanSource(text) {
  const literals = [];
  let masked = '';
  let line = 1;
  let previous = '';
  let i = 0;
  const length = text.length;

  function regexAllowed() {
    if (!previous) return true;
    if (regexAfterWords.has(previous)) return true;
    if (previous.length === 1 && regexAfterPunctuation.indexOf(previous) >= 0) return true;
    return previous === '}';
  }

  while (i < length) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '\n') {
      masked += '\n';
      line++;
      i++;
      continue;
    }
    if (ch === '/' && next === '/') {
      while (i < length && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? length : end + 2;
      for (let j = i; j < stop; j++) {
        if (text[j] === '\n') {
          masked += '\n';
          line++;
        }
      }
      i = stop;
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') {
      const startLine = line;
      let value = '';
      let breaks = '';
      let j = i + 1;
      while (j < length) {
        const c = text[j];
        if (c === '\\') {
          if (text[j + 1] === '\n') {
            breaks += '\n';
            line++;
          }
          const escaped = decodeEscape(text, j + 1);
          value += escaped.value;
          j += 1 + escaped.length;
          continue;
        }
        if (c === ch) break;
        if (c === '\n') {
          if (ch !== '`') break;
          breaks += '\n';
          line++;
        }
        value += c;
        j++;
      }
      literals.push({ value:value, line:startLine });
      masked += STRING_MARK + breaks;
      previous = STRING_MARK;
      i = text[j] === ch ? j + 1 : j;
      continue;
    }
    if (ch === '/' && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      while (j < length && text[j] !== '\n') {
        const c = text[j];
        if (c === '\\') {
          j += 2;
          continue;
        }
        if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        else if (c === '/' && !inClass) break;
        j++;
      }
      j++;
      while (j < length && /[a-z]/.test(text[j])) j++;
      masked += '/R/';
      previous = 'regex';
      i = j;
      continue;
    }
    if (isWordChar(ch)) {
      let j = i;
      while (j < length && isWordChar(text[j])) j++;
      const word = text.slice(i, j);
      masked += word;
      previous = word;
      i = j;
      continue;
    }
    masked += ch;
    if (!/\s/.test(ch)) previous = ch;
    i++;
  }

  return { literals:literals, maskedLines:masked.split('\n') };
}

/* The engine sources a ratchet or lint reads: js/*.js only, sorted. */
function engineSources() {
  const directory = path.join(gameRoot, 'js');
  return fs.readdirSync(directory)
    .filter(function (name) { return name.endsWith('.js'); })
    .sort()
    .map(function (name) {
      const text = fs.readFileSync(path.join(directory, name), 'utf8');
      return {
        file:'js/' + name,
        text:text,
        lines:text.split(/\r?\n/),
        scan:scanSource(text.replace(/\r\n/g, '\n'))
      };
    });
}

module.exports = {
  STRING_MARK:STRING_MARK,
  engineSources:engineSources,
  gameRoot:gameRoot,
  scanSource:scanSource
};
