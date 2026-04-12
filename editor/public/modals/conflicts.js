import { $ } from '../lib/dom.js';
import { api, postJson } from '../lib/api.js';
import { showToast } from '../lib/helpers.js';
import { openModalFn, closeModalFn } from '../lib/ui.js';

const CONFLICT_CARDS_SELECTOR = '#conflictCards';
const CONFLICT_FEEDBACK_SELECTOR = '#conflictFeedback';
const CONFLICT_FINISH_SELECTOR = '#btnConflictFinish';

let conflictData = [];

const showConflictFeedback = (msg, type) => {
  $(CONFLICT_FEEDBACK_SELECTOR).textContent = msg;
  $(CONFLICT_FEEDBACK_SELECTOR).className = 'deploy-feedback' + (type ? ' ' + type : '');
};

const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderConflictCard = (fileEntry, conflict) =>
  `<div class="conflict-card" data-file="${fileEntry.file}" data-conflict-id="${conflict.id}" id="conflict-${fileEntry.file}-${conflict.id}">
    <div class="conflict-card-header">
      <span class="conflict-card-file">${fileEntry.file}</span>
      <span>Conflict #${conflict.id + 1}</span>
    </div>
    <div class="conflict-card-body">
      <div class="conflict-side conflict-mine">
        <span class="conflict-side-label">Your changes</span>${escapeHtml(conflict.mine || '(empty)')}</div>
      <div class="conflict-side conflict-theirs">
        <span class="conflict-side-label">Their changes</span>${escapeHtml(conflict.theirs || '(empty)')}</div>
    </div>
    <div class="conflict-card-actions">
      <button class="conflict-btn-mine" data-file="${fileEntry.file}" data-id="${conflict.id}" data-choice="mine">Accept Mine</button>
      <button class="conflict-btn-theirs" data-file="${fileEntry.file}" data-id="${conflict.id}" data-choice="theirs">Accept Theirs</button>
    </div>
  </div>`;

const countTotalConflicts = () => conflictData.reduce((sum, f) => sum + f.conflicts.length, 0);

const countResolvedCards = () =>
  $(CONFLICT_CARDS_SELECTOR).querySelectorAll('.conflict-resolved').length;

const updateFinishButton = () => {
  const total = countTotalConflicts();
  const resolved = countResolvedCards();
  $(CONFLICT_FINISH_SELECTOR).disabled = resolved < total;
};

const renderConflicts = () => {
  const container = $(CONFLICT_CARDS_SELECTOR);
  if (conflictData.length === 0 || countTotalConflicts() === 0) {
    container.innerHTML = '<p class="conflict-empty">No conflicts to resolve.</p>';
    $(CONFLICT_FINISH_SELECTOR).disabled = false;
    return;
  }

  let html = '';
  for (const fileEntry of conflictData) {
    for (const conflict of fileEntry.conflicts) {
      html += renderConflictCard(fileEntry, conflict);
    }
  }
  container.innerHTML = html;

  container.querySelectorAll('.conflict-btn-mine, .conflict-btn-theirs').forEach((btn) => {
    btn.addEventListener('click', () => resolveOne(btn));
  });

  updateFinishButton();
};

const resolveOne = async (btn) => {
  const file = btn.getAttribute('data-file');
  const conflictId = parseInt(btn.getAttribute('data-id'), 10);
  const choice = btn.getAttribute('data-choice');
  const card = $(`#conflict-${CSS.escape(file)}-${conflictId}`);

  try {
    const result = await postJson('/api/deploy/conflicts/resolve', {
      file,
      conflictId,
      choice,
    });
    card.classList.add('conflict-resolved');
    showConflictFeedback(
      `Resolved conflict #${conflictId + 1} in ${file} (${choice === 'mine' ? 'your changes' : 'their changes'})`,
      'success',
    );
    updateFinishButton();
  } catch (err) {
    showConflictFeedback('Resolve failed: ' + err.message, 'error');
  }
};

const resolveAll = async (choice) => {
  const label = choice === 'mine' ? 'your changes' : 'their changes';
  if (!confirm(`Accept ${label} for ALL conflicts?`)) return;
  try {
    await postJson('/api/deploy/conflicts/resolve-all', { choice });
    $(CONFLICT_CARDS_SELECTOR)
      .querySelectorAll('.conflict-card')
      .forEach((card) => card.classList.add('conflict-resolved'));
    showConflictFeedback(`All conflicts resolved with ${label}.`, 'success');
    updateFinishButton();
  } catch (err) {
    showConflictFeedback('Resolve all failed: ' + err.message, 'error');
  }
};

const resetToRemote = async () => {
  if (
    !confirm(
      'This will DESTROY all your local changes and reset to the remote version. Are you absolutely sure?',
    )
  )
    return;
  try {
    await postJson('/api/deploy/conflicts/reset', {});
    showToast('Reset to remote. All local changes discarded.', 'success');
    closeModalFn($('#conflictModal'));
  } catch (err) {
    showConflictFeedback('Reset failed: ' + err.message, 'error');
  }
};

const finishDeploy = async () => {
  const btn = $(CONFLICT_FINISH_SELECTOR);
  btn.disabled = true;
  btn.textContent = 'Finishing deploy...';
  showConflictFeedback('Completing deploy...', '');
  try {
    const result = await postJson('/api/deploy/conflicts/finish', {});
    if (result.deployed) {
      showToast('Deployed successfully after resolving conflicts!', 'success');
      closeModalFn($('#conflictModal'));
    }
  } catch (err) {
    showConflictFeedback('Finish failed: ' + err.message, 'error');
  }
  btn.disabled = false;
  btn.textContent = 'Finish Deploy';
};

export const openConflictModal = (files) => {
  conflictData = files;
  showConflictFeedback('', '');
  $(CONFLICT_FINISH_SELECTOR).disabled = true;
  $(CONFLICT_FINISH_SELECTOR).textContent = 'Finish Deploy';
  renderConflicts();
  closeModalFn($('#deployModal'));
  openModalFn($('#conflictModal'));
};

export const initConflictModal = () => {
  $('#btnAcceptAllMine').addEventListener('click', () => resolveAll('mine'));
  $('#btnAcceptAllTheirs').addEventListener('click', () => resolveAll('theirs'));
  $('#btnConflictReset').addEventListener('click', resetToRemote);
  $('#btnConflictFinish').addEventListener('click', finishDeploy);
};
