import { $ } from '../lib/dom.js';
import { state } from '../lib/state.js';
import { api, postJson } from '../lib/api.js';
import { showToast } from '../lib/helpers.js';
import { updateUI, openModalFn } from '../lib/ui.js';
import { renderPreview } from '../lib/preview.js';

const showDeployFeedback = (msg, type) => {
  $('#deployFeedback').textContent = msg;
  $('#deployFeedback').className = 'deploy-feedback' + (type ? ' ' + type : '');
};

const getSelectedDeployFiles = () =>
  Array.from($('#deploySummary').querySelectorAll('.deploy-file-cb:checked')).map((cb) => cb.value);

const renderSummaryGroup = (label, cls, items) => {
  const list = items
    .map(
      (i) =>
        `<li><label><input type="checkbox" class="deploy-file-cb" value="${i.file}" checked />${i.label}<span class="type-badge">${i.type}</span></label></li>`,
    )
    .join('');
  return `<div class="deploy-summary-group">
    <div class="deploy-summary-label ${cls}">${label} (${items.length})</div>
    <ul class="deploy-summary-list">${list}</ul>
  </div>`;
};

const refreshDeploySummary = async () => {
  const summary = $('#deploySummary');
  const actionsRow = $('#deployActionsRow');
  summary.innerHTML = '<p class="deploy-hint">Checking for changes...</p>';
  actionsRow.style.display = 'none';
  try {
    const data = await api('/api/deploy/summary');
    const { created, edited, deleted } = data;
    if (!created.length && !edited.length && !deleted.length) {
      summary.innerHTML = '<p class="deploy-no-changes">No changes to deploy.</p>';
      return;
    }
    let html = '';
    if (created.length) html += renderSummaryGroup('Created', 'created', created);
    if (edited.length) html += renderSummaryGroup('Edited', 'edited', edited);
    if (deleted.length) html += renderSummaryGroup('Deleted', 'deleted', deleted);
    summary.innerHTML = html;
    actionsRow.style.display = 'flex';
  } catch {
    summary.innerHTML = '<p class="deploy-hint">Could not load change summary.</p>';
  }
};

const deploy = async (editor) => {
  const msg = $('#deployMessage').value.trim();
  if (!msg) {
    showDeployFeedback('Please describe what you changed.', 'error');
    return;
  }
  const files = getSelectedDeployFiles();
  if (files.length === 0) {
    showDeployFeedback('No files selected to deploy.', 'error');
    return;
  }
  const btn = $('#btnDeploy');
  btn.disabled = true;
  btn.textContent = 'Deploying...';
  showDeployFeedback('Deploying your changes...', '');
  try {
    const result = await postJson('/api/deploy', { message: msg, files });
    if (result.deployed) {
      showDeployFeedback('Deployed successfully! Your changes are now live.', 'success');
      $('#deployMessage').value = '';
      state.dirty = false;
      updateUI(editor);
      refreshDeploySummary();
    } else {
      showDeployFeedback(result.message || 'Nothing to deploy.', 'error');
    }
  } catch (err) {
    showDeployFeedback('Deploy failed: ' + err.message, 'error');
  }
  btn.disabled = false;
  btn.textContent = 'Deploy Selected';
};

const revertSelected = async (editor) => {
  const files = getSelectedDeployFiles();
  if (files.length === 0) {
    showDeployFeedback('No files selected to revert.', 'error');
    return;
  }
  if (
    !confirm('Revert ' + files.length + ' file(s)? This will discard your changes to these files.')
  )
    return;
  try {
    await postJson('/api/deploy/revert', { files });
    showDeployFeedback('Reverted ' + files.length + ' file(s).', 'success');
    refreshDeploySummary();
    if (state.currentPage) {
      const data = await api('/api/pages/' + encodeURIComponent(state.currentPage)).catch(
        () => null,
      );
      if (data) {
        state.savedContent = data.content || '';
        editor.setMarkdown(state.savedContent);
        state.dirty = false;
        updateUI(editor);
        renderPreview(editor);
      }
    }
  } catch (err) {
    showDeployFeedback('Revert failed: ' + err.message, 'error');
  }
};

export const initDeployModal = (editor) => {
  $('#btnDeployOpen').addEventListener('click', async () => {
    $('#deployMessage').value = '';
    $('#deployFeedback').textContent = '';
    $('#deployFeedback').className = 'deploy-feedback';
    openModalFn($('#deployModal'));
    await refreshDeploySummary();
    setTimeout(() => $('#deployMessage').focus(), 100);
  });
  $('#btnDeploySelectAll').addEventListener('click', () => {
    $('#deploySummary')
      .querySelectorAll('.deploy-file-cb')
      .forEach((cb) => (cb.checked = true));
  });
  $('#btnDeployDeselectAll').addEventListener('click', () => {
    $('#deploySummary')
      .querySelectorAll('.deploy-file-cb')
      .forEach((cb) => (cb.checked = false));
  });
  $('#btnRevertSelected').addEventListener('click', () => revertSelected(editor));
  $('#btnDeploy').addEventListener('click', () => deploy(editor));
  $('#deployMessage').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') deploy(editor);
  });
};
