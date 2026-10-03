// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { isEditableTarget, shouldOpenHelp } from '../helpKey';

const keyEvent = (target: EventTarget | null, init: Partial<KeyboardEventInit> = {}): KeyboardEvent => {
  const e = new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true, ...init });
  Object.defineProperty(e, 'target', { value: target });
  return e;
};

afterEach(() => { document.body.innerHTML = ''; });

describe('"?" opens the shortcuts overlay', () => {
  it('opens from the page body', () => {
    expect(shouldOpenHelp(keyEvent(document.body), document.body)).toBe(true);
  });

  it('ignores typing in inputs, textareas, selects and contenteditable', () => {
    document.body.innerHTML = '<input id="i"><textarea id="t"></textarea><select id="s"></select><div id="c" contenteditable="true"><b id="b">x</b></div>';
    for (const id of ['i', 't', 's', 'c', 'b']) {
      const el = document.getElementById(id) as HTMLElement;
      expect(shouldOpenHelp(keyEvent(el), document.body), id).toBe(false);
    }
  });

  it('ignores rich-text and textbox widgets', () => {
    document.body.innerHTML = '<div class="ProseMirror"><p id="p">x</p></div><div role="textbox" id="r"></div>';
    expect(isEditableTarget(document.getElementById('p'))).toBe(true);
    expect(isEditableTarget(document.getElementById('r'))).toBe(true);
  });

  it('ignores a focused field even when the event target is the body', () => {
    document.body.innerHTML = '<input id="i">';
    expect(shouldOpenHelp(keyEvent(document.body), document.getElementById('i'))).toBe(false);
  });

  it('ignores other keys, modifiers, repeats and handled events', () => {
    expect(shouldOpenHelp(keyEvent(document.body, { key: '/' }), null)).toBe(false);
    expect(shouldOpenHelp(keyEvent(document.body, { ctrlKey: true }), null)).toBe(false);
    expect(shouldOpenHelp(keyEvent(document.body, { metaKey: true }), null)).toBe(false);
    expect(shouldOpenHelp(keyEvent(document.body, { altKey: true }), null)).toBe(false);
    expect(shouldOpenHelp(keyEvent(document.body, { repeat: true }), null)).toBe(false);
    const handled = keyEvent(document.body, { cancelable: true });
    handled.preventDefault();
    expect(shouldOpenHelp(handled, null)).toBe(false);
  });
});
