const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { replaceLinkInLine } = require('../shared/link-replace');

describe('replaceLinkInLine', () => {
  const TEAM_ALBANY = 'Albany Rattlers';
  const SLUG_ALBANY = 'albany_rattlers';
  const SLUG_NEW_PAGE = 'new_page';
  const LINK_TEXT_CUSTOM = 'The Rattlers';
  const NESTED_BRACKETS_MSG = 'should not contain nested brackets';
  const LINE_PLAIN_GAME = 'The Albany Rattlers won the game.';
  const EXPECTED_PLAIN_GAME = 'The [Albany Rattlers](albany_rattlers) won the game.';
  const LINE_WRONG_TARGET = 'The [Albany Rattlers](wrong_page) won.';
  const EXPECTED_WRONG_TARGET = 'The [Albany Rattlers](albany_rattlers) won.';
  const LINE_FULL_LINK = '[Albany Rattlers](albany_rattlers)';
  const EXPECTED_REPLACED_TARGET = '[Albany Rattlers](new_page)';
  const LINE_PLAIN_SHORT = 'The Albany Rattlers won.';
  const EXPECTED_CUSTOM_TEXT = 'The [The Rattlers](albany_rattlers) won.';
  const LINE_OLD_LINK_CUSTOM = 'The [Albany Rattlers](old_page) won.';
  const LINE_DUPLICATE = 'Albany Rattlers vs Albany Rattlers';
  const EXPECTED_DUPLICATE =
    '[Albany Rattlers](albany_rattlers) vs [Albany Rattlers](albany_rattlers)';
  const LINE_MIXED = 'Albany Rattlers beat [Albany Rattlers](old_page)';
  const EXPECTED_MIXED =
    '[Albany Rattlers](albany_rattlers) beat [Albany Rattlers](albany_rattlers)';
  const LINE_LOWERCASE = 'the albany rattlers won.';
  const EXPECTED_LOWERCASE_LINKED = 'the [Albany Rattlers](albany_rattlers) won.';
  const LINE_ALREADY_CORRECT = 'The [Albany Rattlers](albany_rattlers) won.';
  const LINE_CJB = 'CJB beat the team.';
  const TEAM_CJB = 'CJB';
  const SLUG_CALGARY = 'calgary_jailbirds';
  const TITLE_CALGARY = 'Calgary Jailbirds';
  const EXPECTED_CJB = '[Calgary Jailbirds](calgary_jailbirds) beat the team.';
  const LINE_SEE_DETAILS = 'See [Albany Rattlers](some_page) for details about Albany Rattlers.';

  it('links plain text', () => {
    const result = replaceLinkInLine(LINE_PLAIN_GAME, TEAM_ALBANY, SLUG_ALBANY, TEAM_ALBANY, false);
    assert.strictEqual(result, EXPECTED_PLAIN_GAME);
  });

  it('replaces an existing link with a different target', () => {
    const result = replaceLinkInLine(
      LINE_WRONG_TARGET,
      TEAM_ALBANY,
      SLUG_ALBANY,
      TEAM_ALBANY,
      false,
    );
    assert.strictEqual(result, EXPECTED_WRONG_TARGET);
  });

  it('does not nest links -- existing link is fully replaced', () => {
    const result = replaceLinkInLine(
      LINE_FULL_LINK,
      TEAM_ALBANY,
      SLUG_NEW_PAGE,
      TEAM_ALBANY,
      false,
    );
    assert.strictEqual(result, EXPECTED_REPLACED_TARGET);
    assert.ok(!result.includes('[['), NESTED_BRACKETS_MSG);
  });

  it('replaces with custom link text', () => {
    const result = replaceLinkInLine(
      LINE_PLAIN_SHORT,
      TEAM_ALBANY,
      SLUG_ALBANY,
      LINK_TEXT_CUSTOM,
      false,
    );
    assert.strictEqual(result, EXPECTED_CUSTOM_TEXT);
  });

  it('replaces existing link with custom text', () => {
    const result = replaceLinkInLine(
      LINE_OLD_LINK_CUSTOM,
      TEAM_ALBANY,
      SLUG_ALBANY,
      LINK_TEXT_CUSTOM,
      false,
    );
    assert.strictEqual(result, EXPECTED_CUSTOM_TEXT);
  });

  it('handles multiple occurrences on one line', () => {
    const result = replaceLinkInLine(LINE_DUPLICATE, TEAM_ALBANY, SLUG_ALBANY, TEAM_ALBANY, false);
    assert.strictEqual(result, EXPECTED_DUPLICATE);
  });

  it('handles mix of plain text and existing link on one line', () => {
    const result = replaceLinkInLine(LINE_MIXED, TEAM_ALBANY, SLUG_ALBANY, TEAM_ALBANY, false);
    assert.strictEqual(result, EXPECTED_MIXED);
  });

  it('case insensitive matching', () => {
    const result = replaceLinkInLine(LINE_LOWERCASE, TEAM_ALBANY, SLUG_ALBANY, TEAM_ALBANY, false);
    assert.strictEqual(result, EXPECTED_LOWERCASE_LINKED);
  });

  it('case sensitive matching does not match wrong case', () => {
    const result = replaceLinkInLine(LINE_LOWERCASE, TEAM_ALBANY, SLUG_ALBANY, TEAM_ALBANY, true);
    assert.strictEqual(result, LINE_LOWERCASE);
  });

  it('leaves already-correct links unchanged', () => {
    const result = replaceLinkInLine(
      LINE_ALREADY_CORRECT,
      TEAM_ALBANY,
      SLUG_ALBANY,
      TEAM_ALBANY,
      false,
    );
    assert.strictEqual(result, LINE_ALREADY_CORRECT);
  });

  it('does not match partial words', () => {
    const result = replaceLinkInLine(LINE_CJB, TEAM_CJB, SLUG_CALGARY, TITLE_CALGARY, false);
    assert.strictEqual(result, EXPECTED_CJB);
  });

  it('does not create nested brackets from link text containing query inside another link', () => {
    const result = replaceLinkInLine(
      LINE_SEE_DETAILS,
      TEAM_ALBANY,
      SLUG_ALBANY,
      TEAM_ALBANY,
      false,
    );
    assert.ok(!result.includes('[['), NESTED_BRACKETS_MSG);
    assert.ok(result.includes('[Albany Rattlers](albany_rattlers)'));
  });
});
