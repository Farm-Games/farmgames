const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { replaceLinkInLine } = require('../shared/link-replace');

describe('replaceLinkInLine', () => {

  it('links plain text', () => {
    const result = replaceLinkInLine(
      'The Albany Rattlers won the game.',
      'Albany Rattlers', 'albany_rattlers', 'Albany Rattlers', false
    );
    assert.strictEqual(result, 'The [Albany Rattlers](albany_rattlers) won the game.');
  });

  it('replaces an existing link with a different target', () => {
    const result = replaceLinkInLine(
      'The [Albany Rattlers](wrong_page) won.',
      'Albany Rattlers', 'albany_rattlers', 'Albany Rattlers', false
    );
    assert.strictEqual(result, 'The [Albany Rattlers](albany_rattlers) won.');
  });

  it('does not nest links -- existing link is fully replaced', () => {
    const result = replaceLinkInLine(
      '[Albany Rattlers](albany_rattlers)',
      'Albany Rattlers', 'new_page', 'Albany Rattlers', false
    );
    assert.strictEqual(result, '[Albany Rattlers](new_page)');
    assert.ok(!result.includes('[['), 'should not contain nested brackets');
  });

  it('replaces with custom link text', () => {
    const result = replaceLinkInLine(
      'The Albany Rattlers won.',
      'Albany Rattlers', 'albany_rattlers', 'The Rattlers', false
    );
    assert.strictEqual(result, 'The [The Rattlers](albany_rattlers) won.');
  });

  it('replaces existing link with custom text', () => {
    const result = replaceLinkInLine(
      'The [Albany Rattlers](old_page) won.',
      'Albany Rattlers', 'albany_rattlers', 'The Rattlers', false
    );
    assert.strictEqual(result, 'The [The Rattlers](albany_rattlers) won.');
  });

  it('handles multiple occurrences on one line', () => {
    const result = replaceLinkInLine(
      'Albany Rattlers vs Albany Rattlers',
      'Albany Rattlers', 'albany_rattlers', 'Albany Rattlers', false
    );
    assert.strictEqual(result, '[Albany Rattlers](albany_rattlers) vs [Albany Rattlers](albany_rattlers)');
  });

  it('handles mix of plain text and existing link on one line', () => {
    const result = replaceLinkInLine(
      'Albany Rattlers beat [Albany Rattlers](old_page)',
      'Albany Rattlers', 'albany_rattlers', 'Albany Rattlers', false
    );
    assert.strictEqual(result, '[Albany Rattlers](albany_rattlers) beat [Albany Rattlers](albany_rattlers)');
  });

  it('case insensitive matching', () => {
    const result = replaceLinkInLine(
      'the albany rattlers won.',
      'Albany Rattlers', 'albany_rattlers', 'Albany Rattlers', false
    );
    assert.strictEqual(result, 'the [Albany Rattlers](albany_rattlers) won.');
  });

  it('case sensitive matching does not match wrong case', () => {
    const result = replaceLinkInLine(
      'the albany rattlers won.',
      'Albany Rattlers', 'albany_rattlers', 'Albany Rattlers', true
    );
    assert.strictEqual(result, 'the albany rattlers won.');
  });

  it('leaves already-correct links unchanged', () => {
    const result = replaceLinkInLine(
      'The [Albany Rattlers](albany_rattlers) won.',
      'Albany Rattlers', 'albany_rattlers', 'Albany Rattlers', false
    );
    assert.strictEqual(result, 'The [Albany Rattlers](albany_rattlers) won.');
  });

  it('does not match partial words', () => {
    const result = replaceLinkInLine(
      'CJB beat the team.',
      'CJB', 'calgary_jailbirds', 'Calgary Jailbirds', false
    );
    assert.strictEqual(result, '[Calgary Jailbirds](calgary_jailbirds) beat the team.');
  });

  it('does not create nested brackets from link text containing query inside another link', () => {
    const line = 'See [Albany Rattlers](some_page) for details about Albany Rattlers.';
    const result = replaceLinkInLine(
      line,
      'Albany Rattlers', 'albany_rattlers', 'Albany Rattlers', false
    );
    assert.ok(!result.includes('[['), 'should not contain nested brackets');
    assert.ok(result.includes('[Albany Rattlers](albany_rattlers)'));
  });

});
