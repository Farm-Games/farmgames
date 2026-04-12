import { $ } from '../lib/dom.js';
import { state } from '../lib/state.js';
import { postJson } from '../lib/api.js';
import { slugToTitle, showToast } from '../lib/helpers.js';
import { openModalFn } from '../lib/ui.js';
import { loadPageList } from '../lib/pages.js';

const ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;

const getSelectedLinkLines = () =>
  Array.from($('#linkAcrossResults').querySelectorAll('.link-across-cb:checked')).map(
    (cb) => cb.value,
  );

const searchAcrossPages = async () => {
  const query = $('#linkAcrossQuery').value.trim();
  if (!query) {
    showToast('Enter a search term', 'error');
    return;
  }
  const caseSensitive = $('#linkAcrossCaseSensitive').checked;
  try {
    const results = await postJson('/api/search', { query, caseSensitive });
    const resultsEl = $('#linkAcrossResults');
    if (results.length === 0) {
      resultsEl.innerHTML = '<p class="deploy-hint">No matches found.</p>';
      $('#linkAcrossAction').style.display = 'none';
      return;
    }
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(`(${query.replace(ESCAPE_REGEX, '\\$&')})`, flags);
    let totalMatches = 0;
    let html =
      '<div class="link-across-select-all"><label><input type="checkbox" id="linkAcrossSelectAll" checked /> Select all</label></div>';
    for (const page of results) {
      totalMatches += page.matches.length;
      html += `<div class="link-across-page">
        <div class="link-across-page-name">${slugToTitle(page.slug)} <span style="color:var(--gray-dark);font-weight:400">(${page.matches.length})</span></div>`;
      for (const m of page.matches) {
        const highlighted = m.text.replace(regex, '<mark>$1</mark>');
        html += `<div class="link-across-match">
          <label><input type="checkbox" class="link-across-cb" value="${m.id}" checked />
          <span>L${m.line}: ${highlighted}</span></label>
        </div>`;
      }
      html += '</div>';
    }
    html += `<div class="link-across-count">${totalMatches} match(es) across ${results.length} page(s)</div>`;
    resultsEl.innerHTML = html;

    const selectAllCb = $('#linkAcrossSelectAll');
    if (selectAllCb) {
      selectAllCb.addEventListener('change', () => {
        resultsEl
          .querySelectorAll('.link-across-cb')
          .forEach((cb) => (cb.checked = selectAllCb.checked));
      });
    }

    await loadPageList();
    $('#linkAcrossTarget').innerHTML = state.allPages
      .filter((p) => !p.startsWith('file_'))
      .map((p) => `<option value="${p}">${slugToTitle(p)}</option>`)
      .join('');
    $('#linkAcrossAction').style.display = 'flex';
    $('#linkAcrossFeedback').textContent = '';
  } catch (err) {
    $('#linkAcrossResults').innerHTML =
      '<p class="deploy-hint">Search failed: ' + err.message + '</p>';
  }
};

const applyLinkAcross = async () => {
  const query = $('#linkAcrossQuery').value.trim();
  const caseSensitive = $('#linkAcrossCaseSensitive').checked;
  const targetSlug = $('#linkAcrossTarget').value;
  const useSearchText = $('#linkAcrossReplaceText').checked;
  const customText = $('#linkAcrossCustomText').value.trim();
  const replaceText = useSearchText ? query : customText || query;
  const selectedLines = getSelectedLinkLines();

  if (!query || !targetSlug) return;
  if (selectedLines.length === 0) {
    $('#linkAcrossFeedback').textContent = 'No occurrences selected.';
    $('#linkAcrossFeedback').className = 'deploy-feedback error';
    return;
  }

  if (
    !confirm(
      `This will link ${selectedLines.length} occurrence(s) of "${query}" to "${slugToTitle(targetSlug)}". Continue?`,
    )
  )
    return;

  try {
    const result = await postJson('/api/pages/link', {
      query,
      caseSensitive,
      targetSlug,
      replaceText,
      selectedLines,
    });
    $('#linkAcrossFeedback').textContent =
      `Linked ${result.totalReplaced} occurrence(s) across ${result.pagesModified} page(s).`;
    $('#linkAcrossFeedback').className = 'deploy-feedback success';
    searchAcrossPages();
  } catch (err) {
    $('#linkAcrossFeedback').textContent = 'Failed: ' + err.message;
    $('#linkAcrossFeedback').className = 'deploy-feedback error';
  }
};

export const openLinkAcrossModal = () => {
  $('#linkAcrossQuery').value = '';
  $('#linkAcrossResults').innerHTML =
    '<p class="deploy-hint">Enter a search term and click Search to find matches across all pages.</p>';
  $('#linkAcrossAction').style.display = 'none';
  $('#linkAcrossFeedback').textContent = '';
  $('#linkAcrossFeedback').className = 'deploy-feedback';
  openModalFn($('#linkAcrossModal'));
  setTimeout(() => $('#linkAcrossQuery').focus(), 100);
};

export const initLinkAcrossModal = () => {
  $('#btnLinkAcrossSearch').addEventListener('click', searchAcrossPages);
  $('#linkAcrossQuery').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchAcrossPages();
  });
  $('#btnLinkAcrossApply').addEventListener('click', applyLinkAcross);
  $('#linkAcrossReplaceText').addEventListener('change', () => {
    $('#linkAcrossCustomText').style.display = $('#linkAcrossReplaceText').checked
      ? 'none'
      : 'block';
  });
};
