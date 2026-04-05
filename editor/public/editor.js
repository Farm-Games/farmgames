/* global toastui */
(function () {
  'use strict';

  // ===== STATE =====
  let currentPage = null;
  let dirty = false;
  let allPages = [];
  let previewTimer = null;
  let activePopoverImg = null;
  let activePopoverLink = null;
  let savedContent = '';

  // ===== DOM =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const btnNew = $('#btnNew');
  const btnOpen = $('#btnOpen');
  const btnSave = $('#btnSave');
  const btnDelete = $('#btnDelete');
  const btnDeployOpen = $('#btnDeployOpen');
  const hamburgerBtn = $('#hamburgerBtn');
  const toolbarActions = $('#toolbarActions');
  const currentPageLabel = $('#currentPageLabel');
  const previewFrame = $('#previewFrame');
  const imageReplaceInput = $('#imageReplaceInput');

  // Modals
  const openModal = $('#openModal');
  const openSearch = $('#openSearch');
  const hideFileStubs = $('#hideFileStubs');
  const pageList = $('#pageList');
  const newModal = $('#newModal');
  const newPageName = $('#newPageName');
  const newPageHint = $('#newPageHint');
  const btnCreatePage = $('#btnCreatePage');
  const deployModal = $('#deployModal');
  const deployMessage = $('#deployMessage');
  const deployFeedback = $('#deployFeedback');

  // Link page modal
  const linkPageModal = $('#linkPageModal');
  const linkPageSearch = $('#linkPageSearch');
  const linkPageHideStubs = $('#linkPageHideStubs');
  const linkPageList = $('#linkPageList');

  // Image popover
  const imagePopover = $('#imagePopover');
  const popoverAltInput = $('#popoverAltInput');

  // Link popover
  const linkPopover = $('#linkPopover');
  const linkPopoverText = $('#linkPopoverText');
  const linkPopoverUrl = $('#linkPopoverUrl');

  // ===== HELPERS =====

  function getTrueMarkdown() {
    let md = editor.getMarkdown();
    if (!savedContent) return md;
    const imgRegex = /<img[^>]*src="([^"]*)"[^>]*class="[^"]*"[^>]*\/?>/gi;
    let match;
    while ((match = imgRegex.exec(savedContent)) !== null) {
      const src = match[1];
      const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      md = md.replace(new RegExp(`<img[^>]*src="${escapedSrc}"[^>]*/?>`, 'i'), match[0]);
      md = md.replace(new RegExp(`!\\[[^\\]]*\\]\\(${escapedSrc}\\)`), match[0]);
    }
    return md;
  }

  function slugToTitle(slug) {
    if (slug === 'index') return 'Homepage';
    return slug
      .split('_')
      .map((w) => {
        try { return w[0].toUpperCase() + w.substring(1); } catch { return w; }
      })
      .join(' ');
  }

  function sanitizeSlug(input) {
    return input.replace(/[^a-z0-9_-]/gi, '_').toLowerCase().replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
  }

  function showToast(message, type) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.className = 'toast visible' + (type ? ' toast-' + type : '');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.className = 'toast';
    }, 3000);
  }

  async function api(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || res.statusText);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('json')) return res.json();
    return res.text();
  }

  function updateUI() {
    const hasPage = currentPage !== null;
    const hasContent = editor.getMarkdown().trim().length > 0;
    btnSave.disabled = !(hasPage || hasContent);
    btnDelete.disabled = !hasPage;
    currentPageLabel.textContent = hasPage
      ? slugToTitle(currentPage) + (dirty ? ' *' : '')
      : 'No page open';
    document.title = hasPage
      ? slugToTitle(currentPage) + ' - Farm Games Wiki Editor'
      : 'Farm Games Wiki Editor';
  }

  // ===== IMAGE UPLOAD (shared helper) =====

  async function uploadImageFile(file) {
    const formData = new FormData();
    formData.append('images', file);
    const result = await api('/api/images', { method: 'POST', body: formData });
    return result[0];
  }

  // ===== TOAST UI EDITOR =====

  const linkPageButton = {
    name: 'linkPage',
    tooltip: 'Link to Wiki Page',
    className: 'toastui-editor-toolbar-icons link-page-icon',
    style: { backgroundImage: 'none', fontSize: '12px', fontWeight: '700', padding: '0' },
    text: 'Wiki',
    command: 'linkPage',
  };

  const editor = new toastui.Editor({
    el: $('#editor'),
    initialEditType: 'wysiwyg',
    previewStyle: 'tab',
    height: '100%',
    usageStatistics: false,
    toolbarItems: [
      ['heading', 'bold', 'italic', 'strike'],
      ['hr', 'quote'],
      ['ul', 'ol', 'task'],
      ['table', 'image', {
        name: 'wikiLink',
        tooltip: 'Link to Wiki Page',
        text: '',
        className: 'toastui-editor-toolbar-icons link',
        command: 'wikiLink',
      }],
      ['code', 'codeblock'],
    ],
    hooks: {
      addImageBlobHook: async (blob, callback) => {
        try {
          const img = await uploadImageFile(blob);
          callback(img.url, img.name);
        } catch (err) {
          showToast('Image upload failed: ' + err.message, 'error');
        }
      },
    },
  });

  editor.addCommand('wysiwyg', 'wikiLink', () => { openLinkPageModal(); return true; });
  editor.addCommand('markdown', 'wikiLink', () => { openLinkPageModal(); return true; });

  editor.on('change', () => {
    dirty = true;
    updateUI();
    schedulePreview();
  });

  // ===== ELEMENT POPOVERS =====

  function setupPopovers() {
    const wwEl = document.querySelector('.toastui-editor-ww-container .ProseMirror');
    if (!wwEl) return;

    wwEl.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (e.target.tagName === 'IMG') {
        hideLinkPopover();
        showImagePopover(e.target);
      } else if (link) {
        e.preventDefault();
        hideImagePopover();
        showLinkPopover(link);
      } else {
        hideImagePopover();
        hideLinkPopover();
      }
    });
  }

  function getImageClassesFromMarkdown(src) {
    const md = savedContent || editor.getMarkdown();
    const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const htmlMatch = md.match(new RegExp(`<img[^>]*src="${escapedSrc}"[^>]*class="([^"]*)"[^>]*/?>`, 'i'));
    return htmlMatch ? htmlMatch[1] : '';
  }

  let cleanupImagePopover = null;

  function showImagePopover(imgEl) {
    activePopoverImg = imgEl;
    popoverAltInput.value = imgEl.alt || '';

    const src = imgEl.getAttribute('src') || '';
    const classes = getImageClassesFromMarkdown(src) || imgEl.className || '';
    const sizeMatch = classes.match(/img-(small|medium|large|full)/);
    const alignMatch = classes.match(/img-(left|center|right)/);
    $('#popoverSize').value = sizeMatch ? sizeMatch[0] : '';
    $('#popoverAlign').value = alignMatch ? alignMatch[0] : '';

    imagePopover.classList.add('active');

    if (cleanupImagePopover) cleanupImagePopover();
    cleanupImagePopover = FloatingUIDOM.autoUpdate(imgEl, imagePopover, () => {
      FloatingUIDOM.computePosition(imgEl, imagePopover, {
        placement: 'bottom-start',
        middleware: [FloatingUIDOM.offset(4), FloatingUIDOM.flip(), FloatingUIDOM.shift({ padding: 8 })],
      }).then(({ x, y }) => {
        Object.assign(imagePopover.style, { left: x + 'px', top: y + 'px' });
      });
    });
  }

  function hideImagePopover() {
    imagePopover.classList.remove('active');
    activePopoverImg = null;
    if (cleanupImagePopover) { cleanupImagePopover(); cleanupImagePopover = null; }
  }

  let replaceTarget = null;

  $('#popoverReplace').addEventListener('click', () => {
    replaceTarget = activePopoverImg;
    hideImagePopover();
    imageReplaceInput.click();
  });

  imageReplaceInput.addEventListener('change', async () => {
    if (!imageReplaceInput.files.length || !replaceTarget) return;
    try {
      const img = await uploadImageFile(imageReplaceInput.files[0]);
      const md = editor.getMarkdown();
      const oldSrc = replaceTarget.getAttribute('src');
      const oldAlt = replaceTarget.alt || img.name;
      const updated = md.replace(
        new RegExp(`!\\[([^\\]]*)\\]\\(${oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`),
        `![${oldAlt}](${img.url})`
      );
      editor.setMarkdown(updated);
      showToast('Image replaced', 'success');
    } catch (err) {
      showToast('Replace failed: ' + err.message, 'error');
    }
    imageReplaceInput.value = '';
    replaceTarget = null;
  });

  $('#popoverDelete').addEventListener('click', () => {
    if (!activePopoverImg) return;
    const md = editor.getMarkdown();
    const src = activePopoverImg.getAttribute('src');
    const updated = md.replace(
      new RegExp(`\\n?!\\[([^\\]]*)\\]\\(${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\n?`),
      '\n'
    );
    editor.setMarkdown(updated);
    hideImagePopover();
    showToast('Image removed', 'success');
  });

  $('#popoverSave').addEventListener('click', async () => {
    if (!activePopoverImg || !currentPage) return;
    const src = activePopoverImg.getAttribute('src');
    const newAlt = popoverAltInput.value;
    const size = $('#popoverSize').value;
    const align = $('#popoverAlign').value;
    const classes = [size, align].filter(Boolean).join(' ');

    const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mdImgRegex = new RegExp(`\\n?!\\[([^\\]]*)\\]\\(${escapedSrc}\\)\\n?`);
    const htmlImgRegex = new RegExp(`\\n?<img[^>]*src="${escapedSrc}"[^>]*/?>\\n?`, 'i');

    try {
      const page = await api('/api/pages/' + encodeURIComponent(currentPage));
      let md = page.content;

      if (classes) {
        const htmlTag = `\n<img src="${src}" alt="${newAlt}" class="${classes}" />\n`;
        if (htmlImgRegex.test(md)) {
          md = md.replace(htmlImgRegex, htmlTag);
        } else {
          md = md.replace(mdImgRegex, htmlTag);
        }
      } else {
        const plainImg = `\n![${newAlt}](${src})\n`;
        if (htmlImgRegex.test(md)) {
          md = md.replace(htmlImgRegex, plainImg);
        } else {
          md = md.replace(
            new RegExp(`!\\[([^\\]]*)\\]\\(${escapedSrc}\\)`),
            `![${newAlt}](${src})`
          );
        }
      }

      await api('/api/pages/' + encodeURIComponent(currentPage), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: md }),
      });

      savedContent = md;
      editor.setMarkdown(md);
      dirty = false;
      updateUI();
      hideImagePopover();
      renderPreview();
      showToast('Image updated', 'success');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
  });

  // ===== LINK POPOVER =====

  let cleanupLinkPopover = null;

  function showLinkPopover(linkEl) {
    activePopoverLink = linkEl;
    linkPopoverText.value = linkEl.textContent || '';
    linkPopoverUrl.value = linkEl.getAttribute('href') || '';
    linkPopover.classList.add('active');

    if (cleanupLinkPopover) cleanupLinkPopover();
    cleanupLinkPopover = FloatingUIDOM.autoUpdate(linkEl, linkPopover, () => {
      FloatingUIDOM.computePosition(linkEl, linkPopover, {
        placement: 'bottom-start',
        middleware: [FloatingUIDOM.offset(4), FloatingUIDOM.flip(), FloatingUIDOM.shift({ padding: 8 })],
      }).then(({ x, y }) => {
        Object.assign(linkPopover.style, { left: x + 'px', top: y + 'px' });
      });
    });
  }

  function hideLinkPopover() {
    linkPopover.classList.remove('active');
    activePopoverLink = null;
    if (cleanupLinkPopover) { cleanupLinkPopover(); cleanupLinkPopover = null; }
  }

  $('#linkPopoverSave').addEventListener('click', () => {
    if (!activePopoverLink) return;
    const md = editor.getMarkdown();
    const oldHref = activePopoverLink.getAttribute('href');
    const oldText = activePopoverLink.textContent;
    const newText = linkPopoverText.value || oldText;
    const newUrl = linkPopoverUrl.value || oldHref;
    const escaped = oldHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const updated = md.replace(
      new RegExp(`\\[${oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(${escaped}\\)`),
      `[${newText}](${newUrl})`
    );
    editor.setMarkdown(updated);
    hideLinkPopover();
    showToast('Link updated', 'success');
  });

  $('#linkPopoverDelete').addEventListener('click', () => {
    if (!activePopoverLink) return;
    const md = editor.getMarkdown();
    const href = activePopoverLink.getAttribute('href');
    const text = activePopoverLink.textContent;
    const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const updated = md.replace(
      new RegExp(`\\[${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(${escaped}\\)`),
      text
    );
    editor.setMarkdown(updated);
    hideLinkPopover();
    showToast('Link removed', 'success');
  });

  document.addEventListener('click', (e) => {
    if (!imagePopover.contains(e.target) && e.target.tagName !== 'IMG') {
      hideImagePopover();
    }
    if (!linkPopover.contains(e.target) && !e.target.closest('a')) {
      hideLinkPopover();
    }
  });

  // Initialize popovers after editor renders
  setTimeout(setupPopovers, 500);

  // ===== MODALS =====

  function openModalFn(modal) {
    modal.classList.add('active');
    closeToolbarMenu();
  }

  function closeModalFn(modal) {
    modal.classList.remove('active');
  }

  $$('.modal-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      closeModalFn($('#' + modalId));
    });
  });

  $$('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModalFn(overlay);
    });
  });

  // ===== PREVIEW =====

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 400);
  }

  async function renderPreview() {
    const markdown = getTrueMarkdown();
    try {
      const html = await api('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, pageName: currentPage || 'Untitled' }),
      });
      previewFrame.srcdoc = html;
    } catch {
      // silently fail preview
    }
  }

  // ===== FILTERABLE PAGE LIST (reusable) =====

  function renderFilterablePageList(listEl, searchEl, hideStubsEl, onSelect) {
    const search = searchEl.value.toLowerCase();
    const hideStubs = hideStubsEl.checked;
    let filtered = allPages;
    if (hideStubs) {
      filtered = filtered.filter((p) => !p.startsWith('file_'));
    }
    if (search) {
      filtered = filtered.filter((p) =>
        p.toLowerCase().includes(search) || slugToTitle(p).toLowerCase().includes(search)
      );
    }
    filtered.sort((a, b) => {
      if (a === 'index') return -1;
      if (b === 'index') return 1;
      return a.localeCompare(b);
    });
    if (filtered.length === 0) {
      listEl.innerHTML = '<li class="page-list-empty">No pages found</li>';
      return;
    }
    listEl.innerHTML = filtered
      .map(
        (p) =>
          `<li data-page="${p}"><span class="page-title">${slugToTitle(p)}</span><span class="page-slug">${p}</span></li>`
      )
      .join('');
    listEl.querySelectorAll('li[data-page]').forEach((li) => {
      li.addEventListener('click', () => {
        onSelect(li.getAttribute('data-page'));
      });
    });
  }

  // ===== PAGE OPERATIONS =====

  async function loadPageList() {
    try {
      allPages = await api('/api/pages');
    } catch (err) {
      showToast('Failed to load pages: ' + err.message, 'error');
    }
  }

  function renderPageList() {
    renderFilterablePageList(pageList, openSearch, hideFileStubs, (slug) => {
      loadPage(slug);
      closeModalFn(openModal);
    });
  }

  async function loadPage(name) {
    try {
      const data = await api('/api/pages/' + encodeURIComponent(name));
      currentPage = data.name;
      savedContent = data.content || '';
      editor.setMarkdown(savedContent);
      dirty = false;
      updateUI();
      renderPreview();
      showToast('Opened: ' + slugToTitle(name), 'success');
    } catch (err) {
      showToast('Failed to open page: ' + err.message, 'error');
    }
  }

  let saveAfterNaming = false;

  async function savePage() {
    if (!currentPage) {
      saveAfterNaming = true;
      await loadPageList();
      newPageName.value = '';
      newPageHint.textContent = '';
      btnCreatePage.disabled = true;
      openModalFn(newModal);
      setTimeout(() => newPageName.focus(), 100);
      return;
    }
    try {
      const content = getTrueMarkdown();
      await api('/api/pages/' + encodeURIComponent(currentPage), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      savedContent = content;
      dirty = false;
      updateUI();
      showToast('Saved: ' + slugToTitle(currentPage), 'success');
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    }
  }

  async function deletePage() {
    if (!currentPage) return;
    const name = currentPage;
    if (!confirm('Delete "' + slugToTitle(name) + '"? This cannot be undone.')) return;
    try {
      await api('/api/pages/' + encodeURIComponent(name), { method: 'DELETE' });
      currentPage = null;
      editor.setMarkdown('');
      dirty = false;
      updateUI();
      renderPreview();
      showToast('Deleted: ' + slugToTitle(name), 'success');
      allPages = allPages.filter((p) => p !== name);
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  }

  // ===== NEW PAGE =====

  function validateNewPageName() {
    const raw = newPageName.value;
    const slug = sanitizeSlug(raw);
    if (!raw) {
      newPageHint.textContent = '';
      newPageHint.className = 'input-hint';
      btnCreatePage.disabled = true;
      return null;
    }
    if (slug !== raw) {
      newPageHint.textContent = 'Will be saved as: ' + slug;
      newPageHint.className = 'input-hint';
    } else {
      newPageHint.textContent = '';
    }
    if (allPages.includes(slug)) {
      newPageHint.textContent = 'A page with this name already exists.';
      newPageHint.className = 'input-hint error';
      btnCreatePage.disabled = true;
      return null;
    }
    btnCreatePage.disabled = false;
    return slug;
  }

  function createNewPage() {
    const slug = validateNewPageName();
    if (!slug) return;
    const shouldSave = saveAfterNaming;
    saveAfterNaming = false;
    currentPage = slug;
    if (!shouldSave) {
      editor.setMarkdown('');
    }
    dirty = true;
    allPages.push(slug);
    allPages.sort();
    updateUI();
    closeModalFn(newModal);
    newPageName.value = '';
    newPageHint.textContent = '';
    if (shouldSave) {
      savePage();
    } else {
      showToast('New page: ' + slugToTitle(slug) + ' (not saved yet)', 'success');
    }
    renderPreview();
  }

  // ===== LINK PAGE MODAL =====

  const linkModeWiki = $('#linkModeWiki');
  const linkModeUrl = $('#linkModeUrl');
  const linkUrlText = $('#linkUrlText');
  const linkUrlHref = $('#linkUrlHref');

  function setLinkMode(mode) {
    $$('.link-mode-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });
    linkModeWiki.style.display = mode === 'wiki' ? 'flex' : 'none';
    linkModeUrl.style.display = mode === 'url' ? 'flex' : 'none';
  }

  $$('.link-mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => setLinkMode(tab.getAttribute('data-mode')));
  });

  function insertLink(text, url) {
    if (editor.isWysiwygMode()) {
      editor.exec('addLink', { linkUrl: url, linkText: text });
    } else {
      editor.insertText(`[${text}](${url})`);
    }
    closeModalFn(linkPageModal);
    showToast('Link inserted', 'success');
  }

  async function openLinkPageModal() {
    linkPageSearch.value = '';
    linkUrlText.value = '';
    linkUrlHref.value = '';
    setLinkMode('wiki');
    await loadPageList();
    renderLinkPageList();
    openModalFn(linkPageModal);
    setTimeout(() => linkPageSearch.focus(), 100);
  }

  function renderLinkPageList() {
    renderFilterablePageList(linkPageList, linkPageSearch, linkPageHideStubs, (slug) => {
      insertLink(slugToTitle(slug), slug);
    });
  }

  linkPageSearch.addEventListener('input', renderLinkPageList);
  linkPageHideStubs.addEventListener('change', renderLinkPageList);

  $('#btnInsertUrl').addEventListener('click', () => {
    const text = linkUrlText.value.trim();
    const url = linkUrlHref.value.trim();
    if (!url) { showToast('Please enter a URL', 'error'); return; }
    insertLink(text || url, url);
  });

  linkUrlHref.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btnInsertUrl').click();
  });

  // ===== LINK ACROSS PAGES =====

  const linkAcrossModal = $('#linkAcrossModal');
  const linkAcrossQuery = $('#linkAcrossQuery');
  const linkAcrossCaseSensitive = $('#linkAcrossCaseSensitive');
  const linkAcrossResults = $('#linkAcrossResults');
  const linkAcrossAction = $('#linkAcrossAction');
  const linkAcrossTarget = $('#linkAcrossTarget');
  const linkAcrossReplaceText = $('#linkAcrossReplaceText');
  const linkAcrossCustomText = $('#linkAcrossCustomText');
  const linkAcrossFeedback = $('#linkAcrossFeedback');

  function openLinkAcrossModal() {
    linkAcrossQuery.value = '';
    linkAcrossResults.innerHTML = '<p class="deploy-hint">Enter a search term and click Search to find matches across all pages.</p>';
    linkAcrossAction.style.display = 'none';
    linkAcrossFeedback.textContent = '';
    linkAcrossFeedback.className = 'deploy-feedback';
    openModalFn(linkAcrossModal);
    setTimeout(() => linkAcrossQuery.focus(), 100);
  }

  async function searchAcrossPages() {
    const query = linkAcrossQuery.value.trim();
    if (!query) {
      showToast('Enter a search term', 'error');
      return;
    }
    const caseSensitive = linkAcrossCaseSensitive.checked;
    try {
      const results = await api('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, caseSensitive }),
      });
      if (results.length === 0) {
        linkAcrossResults.innerHTML = '<p class="deploy-hint">No matches found.</p>';
        linkAcrossAction.style.display = 'none';
        return;
      }
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, flags);
      let totalMatches = 0;
      let html = '<div class="link-across-select-all"><label><input type="checkbox" id="linkAcrossSelectAll" checked /> Select all</label></div>';
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
      linkAcrossResults.innerHTML = html;

      const selectAllCb = $('#linkAcrossSelectAll');
      if (selectAllCb) {
        selectAllCb.addEventListener('change', () => {
          linkAcrossResults.querySelectorAll('.link-across-cb').forEach((cb) => {
            cb.checked = selectAllCb.checked;
          });
        });
      }

      await loadPageList();
      linkAcrossTarget.innerHTML = allPages
        .filter((p) => !p.startsWith('file_'))
        .map((p) => `<option value="${p}">${slugToTitle(p)}</option>`)
        .join('');
      linkAcrossAction.style.display = 'flex';
      linkAcrossFeedback.textContent = '';
    } catch (err) {
      linkAcrossResults.innerHTML = '<p class="deploy-hint">Search failed: ' + err.message + '</p>';
    }
  }

  function getSelectedLinkLines() {
    return Array.from(linkAcrossResults.querySelectorAll('.link-across-cb:checked')).map((cb) => cb.value);
  }

  async function applyLinkAcross() {
    const query = linkAcrossQuery.value.trim();
    const caseSensitive = linkAcrossCaseSensitive.checked;
    const targetSlug = linkAcrossTarget.value;
    const useSearchText = linkAcrossReplaceText.checked;
    const customText = linkAcrossCustomText.value.trim();
    const replaceText = useSearchText ? query : (customText || query);
    const selectedLines = getSelectedLinkLines();

    if (!query || !targetSlug) return;
    if (selectedLines.length === 0) {
      linkAcrossFeedback.textContent = 'No occurrences selected.';
      linkAcrossFeedback.className = 'deploy-feedback error';
      return;
    }

    if (!confirm(`This will link ${selectedLines.length} occurrence(s) of "${query}" to "${slugToTitle(targetSlug)}". Continue?`)) return;

    try {
      const result = await api('/api/pages/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, caseSensitive, targetSlug, replaceText, selectedLines }),
      });
      linkAcrossFeedback.textContent = `Linked ${result.totalReplaced} occurrence(s) across ${result.pagesModified} page(s).`;
      linkAcrossFeedback.className = 'deploy-feedback success';
      searchAcrossPages();
    } catch (err) {
      linkAcrossFeedback.textContent = 'Failed: ' + err.message;
      linkAcrossFeedback.className = 'deploy-feedback error';
    }
  }

  $('#btnLinkAcrossSearch').addEventListener('click', searchAcrossPages);
  linkAcrossQuery.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchAcrossPages();
  });
  $('#btnLinkAcrossApply').addEventListener('click', applyLinkAcross);

  linkAcrossReplaceText.addEventListener('change', () => {
    linkAcrossCustomText.style.display = linkAcrossReplaceText.checked ? 'none' : 'block';
  });

  // ===== DEPLOY =====

  function getSelectedDeployFiles() {
    return Array.from($('#deploySummary').querySelectorAll('.deploy-file-cb:checked')).map((cb) => cb.value);
  }

  async function deploy() {
    const msg = deployMessage.value.trim();
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
      const result = await api('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, files }),
      });
      if (result.deployed) {
        showDeployFeedback('Deployed successfully! Your changes are now live.', 'success');
        deployMessage.value = '';
        dirty = false;
        updateUI();
        refreshDeploySummary();
      } else {
        showDeployFeedback(result.message || 'Nothing to deploy.', 'error');
      }
    } catch (err) {
      showDeployFeedback('Deploy failed: ' + err.message, 'error');
    }
    btn.disabled = false;
    btn.textContent = 'Deploy Selected';
  }

  async function revertSelected() {
    const files = getSelectedDeployFiles();
    if (files.length === 0) {
      showDeployFeedback('No files selected to revert.', 'error');
      return;
    }
    if (!confirm('Revert ' + files.length + ' file(s)? This will discard your changes to these files.')) return;
    try {
      await api('/api/deploy/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });
      showDeployFeedback('Reverted ' + files.length + ' file(s).', 'success');
      refreshDeploySummary();
      if (currentPage) {
        const data = await api('/api/pages/' + encodeURIComponent(currentPage)).catch(() => null);
        if (data) {
          savedContent = data.content || '';
          editor.setMarkdown(savedContent);
          dirty = false;
          updateUI();
          renderPreview();
        }
      }
    } catch (err) {
      showDeployFeedback('Revert failed: ' + err.message, 'error');
    }
  }

  function showDeployFeedback(msg, type) {
    deployFeedback.textContent = msg;
    deployFeedback.className = 'deploy-feedback' + (type ? ' ' + type : '');
  }

  // ===== EVENT LISTENERS =====

  // Toolbar
  btnNew.addEventListener('click', () => {
    saveAfterNaming = false;
    newPageName.value = '';
    newPageHint.textContent = '';
    btnCreatePage.disabled = true;
    openModalFn(newModal);
    setTimeout(() => newPageName.focus(), 100);
  });

  btnOpen.addEventListener('click', async () => {
    openSearch.value = '';
    await loadPageList();
    renderPageList();
    openModalFn(openModal);
    setTimeout(() => openSearch.focus(), 100);
  });

  btnSave.addEventListener('click', savePage);
  btnDelete.addEventListener('click', deletePage);
  $('#btnLinkAcross').addEventListener('click', openLinkAcrossModal);

  async function refreshDeploySummary() {
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
  }

  btnDeployOpen.addEventListener('click', async () => {
    deployMessage.value = '';
    deployFeedback.textContent = '';
    deployFeedback.className = 'deploy-feedback';
    openModalFn(deployModal);
    await refreshDeploySummary();
    setTimeout(() => deployMessage.focus(), 100);
  });

  $('#btnDeploySelectAll').addEventListener('click', () => {
    $('#deploySummary').querySelectorAll('.deploy-file-cb').forEach((cb) => (cb.checked = true));
  });
  $('#btnDeployDeselectAll').addEventListener('click', () => {
    $('#deploySummary').querySelectorAll('.deploy-file-cb').forEach((cb) => (cb.checked = false));
  });
  $('#btnRevertSelected').addEventListener('click', revertSelected);

  function renderSummaryGroup(label, cls, items) {
    const list = items
      .map((i) => `<li><label><input type="checkbox" class="deploy-file-cb" value="${i.file}" checked />${i.label}<span class="type-badge">${i.type}</span></label></li>`)
      .join('');
    return `<div class="deploy-summary-group">
      <div class="deploy-summary-label ${cls}">${label} (${items.length})</div>
      <ul class="deploy-summary-list">${list}</ul>
    </div>`;
  }

  // Update
  $('#btnUpdate').addEventListener('click', async () => {
    if (!confirm('This will pull the latest changes and restart the editor. Continue?')) return;
    const btn = $('#btnUpdate');
    btn.disabled = true;
    btn.textContent = 'Updating...';
    try {
      await api('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      showToast('Update complete -- editor is restarting...', 'success');
      setTimeout(() => { window.location.reload(); }, 3000);
    } catch (err) {
      showToast('Update failed: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = '\u{1F504} Update';
    }
  });

  // Hamburger
  function closeToolbarMenu() {
    toolbarActions.classList.remove('open');
  }

  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toolbarActions.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!toolbarActions.contains(e.target) && e.target !== hamburgerBtn) {
      closeToolbarMenu();
    }
  });

  // Open page modal
  openSearch.addEventListener('input', renderPageList);
  hideFileStubs.addEventListener('change', renderPageList);

  // New page modal
  newPageName.addEventListener('input', validateNewPageName);
  newPageName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createNewPage();
  });
  btnCreatePage.addEventListener('click', createNewPage);

  // Deploy modal
  $('#btnDeploy').addEventListener('click', deploy);
  deployMessage.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') deploy();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      savePage();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      btnDeployOpen.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      openLinkAcrossModal();
    }
  });

  // Warn on unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ===== MOBILE VIEW TOGGLE =====
  const editorPane = $('#editorPane');
  const previewPane = $('#previewPane');

  $$('.mobile-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      $$('.mobile-toggle-btn').forEach((b) => b.classList.toggle('active', b === btn));
      if (view === 'editor') {
        editorPane.classList.remove('mobile-hidden');
        previewPane.classList.add('mobile-hidden');
      } else {
        editorPane.classList.add('mobile-hidden');
        previewPane.classList.remove('mobile-hidden');
        renderPreview();
      }
    });
  });

  previewPane.classList.add('mobile-hidden');

  // ===== INIT =====
  updateUI();
  renderPreview();
})();
