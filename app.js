/* ============================================================
   Enterprise Contact Directory — Application Logic
   ============================================================ */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  let contacts = [];          // master list
  let editingId = null;       // null = adding, string = editing
  let deleteTargetId = null;

  // ── DOM refs ───────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const contactListEl     = $('#contact-list');
  const emptyStateEl      = $('#empty-state');
  const statsBar          = $('#stats-bar');
  const searchInput       = $('#search-input');
  const modalOverlay      = $('#modal-overlay');
  const modalTitle        = $('#modal-title');
  const contactForm       = $('#contact-form');
  const confirmOverlay    = $('#confirm-overlay');
  const confirmNameEl     = $('#confirm-name');
  const validationBanner  = $('#validation-banner');
  const validationText    = $('#validation-text');
  const customServiceList = $('#custom-services-list');

  // ── Helpers ────────────────────────────────────────────────
  // Utility functions for ID generation, escaping, and notifications.
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function escapeXml(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function toast(message, type = 'info') {
    const container = $('#toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => { el.remove(); }, 3500);
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return iso; }
  }

  // ── Validation ─────────────────────────────────────────────
  // IPv4 format checking, global duplicate detection (names + IPs),
  // and per-contact duplicate checks shown at save time.
  function isValidIP(ip) {
    if (!ip) return true; // optional
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4.test(ip)) return false;
    return ip.split('.').every((o) => { const n = parseInt(o, 10); return n >= 0 && n <= 255; });
  }

  /**
   * Collect all IP addresses from a contact's VoIP, XMPP, and custom
   * service entries. Used by the duplicate-detection routines.
   */
  function collectIPs(contact) {
    const ips = [];
    if (contact.voip && contact.voip.ip) ips.push(contact.voip.ip.trim());
    if (contact.xmpp && contact.xmpp.ip) ips.push(contact.xmpp.ip.trim());
    if (contact.customServices) {
      contact.customServices.forEach((s) => {
        if (s.ip) ips.push(s.ip.trim());
      });
    }
    return ips;
  }

  function runGlobalDuplicateCheck() {
    const nameMap = {};
    const ipMap = {};

    contacts.forEach((c) => {
      const key = c.name.trim().toLowerCase();
      nameMap[key] = (nameMap[key] || []);
      nameMap[key].push(c.id);

      collectIPs(c).forEach((ip) => {
        if (ip) {
          ipMap[ip] = ipMap[ip] || [];
          ipMap[ip].push(c.id);
        }
      });
    });

    const dupNames = Object.entries(nameMap).filter(([, ids]) => ids.length > 1);
    const dupIPs = Object.entries(ipMap).filter(([, ids]) => ids.length > 1);

    const dupContactIds = new Set();
    dupNames.forEach(([, ids]) => ids.forEach((id) => dupContactIds.add(id)));
    dupIPs.forEach(([, ids]) => ids.forEach((id) => dupContactIds.add(id)));

    if (dupNames.length || dupIPs.length) {
      const parts = [];
      if (dupNames.length) parts.push(`Duplicate names: ${dupNames.map(([n]) => '"' + n + '"').join(', ')}`);
      if (dupIPs.length) parts.push(`Duplicate IPs: ${dupIPs.map(([ip]) => ip).join(', ')}`);
      validationText.textContent = parts.join(' | ');
      validationBanner.classList.remove('hidden');
    } else {
      validationBanner.classList.add('hidden');
    }

    return dupContactIds;
  }

  /**
   * Check a single contact (while editing) against the rest.
   * Returns an array of warning strings.
   */
  function checkContactDuplicates(name, ips, excludeId) {
    const warnings = [];
    const otherContacts = contacts.filter((c) => c.id !== excludeId);

    // Duplicate name
    if (name) {
      const lower = name.trim().toLowerCase();
      if (otherContacts.some((c) => c.name.trim().toLowerCase() === lower)) {
        warnings.push(`Name "${name}" already exists in the directory.`);
      }
    }

    // Duplicate IPs
    ips.forEach((ip) => {
      if (!ip) return;
      const trimmed = ip.trim();
      otherContacts.forEach((c) => {
        if (collectIPs(c).includes(trimmed)) {
          warnings.push(`IP ${trimmed} is already assigned to "${c.name}".`);
        }
      });
    });

    return warnings;
  }

  // ── Persistence ────────────────────────────────────────────
  // Contacts are stored in localStorage for session continuity.
  // For distribution, use XML Export to produce a portable file.
  function save() {
    try { localStorage.setItem('ecd_contacts', JSON.stringify(contacts)); } catch {}
  }
  function load() {
    try {
      const data = localStorage.getItem('ecd_contacts');
      if (data) contacts = JSON.parse(data);
    } catch {}
  }

  // ── Rendering ──────────────────────────────────────────────
  // Rebuilds the contact card grid after any data or filter change.
  // Also triggers the global duplicate check and updates the stats bar.
  function render() {
    const dupIds = runGlobalDuplicateCheck();
    const filtered = getFilteredContacts();

    if (contacts.length === 0) {
      emptyStateEl.classList.remove('hidden');
      contactListEl.innerHTML = '';
    } else {
      emptyStateEl.classList.add('hidden');
      if (filtered.length === 0) {
        contactListEl.innerHTML = '<p style="color:var(--text-muted);padding:24px;text-align:center;">No contacts match your filters.</p>';
      } else {
        contactListEl.innerHTML = filtered.map((c) => renderCard(c, dupIds.has(c.id))).join('');
      }
    }

    statsBar.textContent = `${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`;
  }

  function renderCard(c, isDuplicate) {
    const badges = [];
    if (c.voip && c.voip.ip) badges.push('<span class="service-badge voip">VoIP</span>');
    if (c.xmpp && c.xmpp.jid) badges.push('<span class="service-badge xmpp">XMPP</span>');
    if (c.customServices && c.customServices.length) {
      c.customServices.forEach((s) => {
        badges.push(`<span class="service-badge custom">${escapeHtml(s.name || 'Custom')}</span>`);
      });
    }

    const details = [];
    if (c.voip && c.voip.ip) {
      details.push(`<span class="label">VoIP:</span> ${escapeHtml(c.voip.ip)}:${escapeHtml(c.voip.port || '5060')} ext ${escapeHtml(c.voip.extension || '—')} [${escapeHtml(c.voip.codec || '—')} / ${escapeHtml(c.voip.protocol || 'SIP')} / ${escapeHtml(c.voip.transport || 'UDP')}]`);
    }
    if (c.xmpp && c.xmpp.jid) {
      details.push(`<span class="label">XMPP:</span> ${escapeHtml(c.xmpp.jid)} @ ${escapeHtml(c.xmpp.server || '—')} (${escapeHtml(c.xmpp.ip || '—')}:${escapeHtml(c.xmpp.port || '5222')}) [${escapeHtml(c.xmpp.encryption || 'STARTTLS')}]`);
    }
    if (c.customServices) {
      c.customServices.forEach((s) => {
        details.push(`<span class="label">${escapeHtml(s.name || 'Service')}:</span> ${escapeHtml(s.ip || '—')}:${escapeHtml(s.port || '—')} ${escapeHtml(s.description || '')}`);
      });
    }

    const dupClass = isDuplicate ? ' duplicate-warning' : '';

    return `
      <article class="contact-card${dupClass}" role="listitem" data-id="${c.id}">
        <div class="card-header">
          <span class="card-name">${escapeHtml(c.name)}</span>
          <span class="card-platform platform-${c.platform}">${escapeHtml(c.platform)}</span>
        </div>
        <div class="card-meta">
          ${c.location ? `<span>${escapeHtml(c.location)}</span>` : ''}
          ${c.department ? `<span>${escapeHtml(c.department)}</span>` : ''}
        </div>
        ${badges.length ? `<div class="card-services">${badges.join('')}</div>` : ''}
        ${details.length ? `<div class="card-detail">${details.join('<br>')}</div>` : ''}
        ${c.notes ? `<div class="card-detail" style="margin-top:6px;font-family:var(--font-sans);color:var(--text-muted);">${escapeHtml(c.notes)}</div>` : ''}
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm btn-edit" data-id="${c.id}">Edit</button>
          <button class="btn btn-danger btn-sm btn-delete" data-id="${c.id}">Delete</button>
        </div>
      </article>`;
  }

  // ── Filtering ──────────────────────────────────────────────
  // Applies the search query and sidebar filter chips to produce
  // the visible subset of contacts.
  function getFilteredContacts() {
    const query = searchInput.value.trim().toLowerCase();
    const platformChecks = getCheckedValues('platform');
    const serviceChecks = getCheckedValues('service');

    return contacts.filter((c) => {
      // Search
      if (query) {
        const haystack = [
          c.name, c.location, c.department, c.notes, c.platform,
          c.voip?.ip, c.voip?.extension, c.voip?.codec,
          c.xmpp?.jid, c.xmpp?.server, c.xmpp?.ip,
          ...(c.customServices || []).map((s) => `${s.name} ${s.ip} ${s.description}`)
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      // Platform
      if (!platformChecks.includes('all') && !platformChecks.includes(c.platform)) return false;

      // Service type
      if (!serviceChecks.includes('all')) {
        const has = [];
        if (c.voip && c.voip.ip) has.push('voip');
        if (c.xmpp && c.xmpp.jid) has.push('xmpp');
        if (c.customServices && c.customServices.length) has.push('custom');
        if (!serviceChecks.some((s) => has.includes(s))) return false;
      }

      return true;
    });
  }

  function getCheckedValues(name) {
    return $$(`input[name="${name}"]:checked`).map((el) => el.value);
  }

  // ── Filter "All" toggle logic ──────────────────────────────
  // "All" acts as a radio-style default: checking any specific
  // filter unchecks "All", and unchecking all specifics re-checks "All".
  function setupFilterAllLogic(groupName) {
    const allBox = $(`input[name="${groupName}"][value="all"]`);
    const others = $$(`input[name="${groupName}"]`).filter((el) => el.value !== 'all');

    allBox.addEventListener('change', () => {
      if (allBox.checked) {
        others.forEach((el) => { el.checked = false; });
      }
      render();
    });

    others.forEach((el) => {
      el.addEventListener('change', () => {
        if (el.checked) {
          allBox.checked = false;
        }
        // If none checked, re-check All
        if (!others.some((o) => o.checked)) {
          allBox.checked = true;
        }
        render();
      });
    });
  }

  // ── Modal open / close ─────────────────────────────────────
  // Opens the Add/Edit modal. When a contact object is passed,
  // the form is pre-populated for editing; otherwise it starts blank.
  function openModal(contact) {
    clearFormErrors();
    contactForm.reset();
    customServiceList.innerHTML = '';
    setCollapsible('voip', false);
    setCollapsible('xmpp', false);
    setCollapsible('custom', false);

    if (contact) {
      editingId = contact.id;
      modalTitle.textContent = 'Edit Contact';
      $('#contact-id').value = contact.id;
      $('#contact-name').value = contact.name || '';
      $('#contact-platform').value = contact.platform || '';
      $('#contact-location').value = contact.location || '';
      $('#contact-department').value = contact.department || '';
      $('#contact-notes').value = contact.notes || '';

      if (contact.voip) {
        $('#voip-enabled').checked = true;
        setCollapsible('voip', true);
        $('#voip-ip').value = contact.voip.ip || '';
        $('#voip-port').value = contact.voip.port || '';
        $('#voip-extension').value = contact.voip.extension || '';
        $('#voip-codec').value = contact.voip.codec || '';
        $('#voip-protocol').value = contact.voip.protocol || 'SIP';
        $('#voip-transport').value = contact.voip.transport || 'UDP';
      }

      if (contact.xmpp) {
        $('#xmpp-enabled').checked = true;
        setCollapsible('xmpp', true);
        $('#xmpp-jid').value = contact.xmpp.jid || '';
        $('#xmpp-server').value = contact.xmpp.server || '';
        $('#xmpp-ip').value = contact.xmpp.ip || '';
        $('#xmpp-port').value = contact.xmpp.port || '';
        $('#xmpp-encryption').value = contact.xmpp.encryption || 'STARTTLS';
        $('#xmpp-conference').value = contact.xmpp.conference || '';
      }

      if (contact.customServices && contact.customServices.length) {
        $('#custom-enabled').checked = true;
        setCollapsible('custom', true);
        contact.customServices.forEach((s) => addCustomServiceRow(s));
      }
    } else {
      editingId = null;
      modalTitle.textContent = 'Add Contact';
      $('#contact-id').value = '';
    }

    modalOverlay.classList.remove('hidden');
    $('#contact-name').focus();
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
    editingId = null;
  }

  function setCollapsible(section, open) {
    const el = $(`#${section}-fields`);
    if (open) el.classList.remove('collapsed');
    else el.classList.add('collapsed');
  }

  // ── Custom service rows ────────────────────────────────────
  // Dynamically creates a row (name/IP/port) + description field
  // inside the Custom Services fieldset. The remove button cleans up both.
  function addCustomServiceRow(data) {
    const row = document.createElement('div');
    row.className = 'custom-service-row';
    row.innerHTML = `
      <div class="form-group">
        <label>Service Name</label>
        <input type="text" class="cs-name" value="${escapeHtml(data?.name || '')}" placeholder="e.g. Monitoring">
      </div>
      <div class="form-group">
        <label>IP Address</label>
        <input type="text" class="cs-ip" value="${escapeHtml(data?.ip || '')}" placeholder="e.g. 10.0.5.10">
      </div>
      <div class="form-group">
        <label>Port</label>
        <input type="number" class="cs-port" value="${data?.port || ''}" placeholder="e.g. 8080" min="1" max="65535">
      </div>
      <button type="button" class="btn-icon btn-remove-service" title="Remove">&times;</button>
    `;
    customServiceList.appendChild(row);

    // Add description row below the grid
    const descRow = document.createElement('div');
    descRow.className = 'custom-service-desc';
    descRow.innerHTML = `
      <div class="form-group" style="margin-bottom:12px;">
        <label>Description</label>
        <input type="text" class="cs-desc" value="${escapeHtml(data?.description || '')}" placeholder="e.g. Real-time status dashboard">
      </div>
    `;
    customServiceList.appendChild(descRow);

    row.querySelector('.btn-remove-service').addEventListener('click', () => {
      row.remove();
      descRow.remove();
    });
  }

  // ── Form validation & save ─────────────────────────────────
  // Validates required fields and IP formats, checks for duplicates
  // (with a confirmation prompt), then persists and re-renders.
  function clearFormErrors() {
    $$('.field-error').forEach((el) => { el.textContent = ''; });
    $$('.invalid').forEach((el) => { el.classList.remove('invalid'); });
  }

  function setFieldError(inputId, errorId, msg) {
    const inp = $(`#${inputId}`);
    if (inp) inp.classList.add('invalid');
    const err = $(`#${errorId}`);
    if (err) err.textContent = msg;
  }

  function handleSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const name = $('#contact-name').value.trim();
    const platform = $('#contact-platform').value;
    let valid = true;

    if (!name) {
      setFieldError('contact-name', 'error-name', 'Name is required.');
      valid = false;
    }
    if (!platform) {
      valid = false;
      toast('Please select a platform.', 'error');
    }

    // VoIP validation
    let voip = null;
    if ($('#voip-enabled').checked) {
      const ip = $('#voip-ip').value.trim();
      if (ip && !isValidIP(ip)) {
        setFieldError('voip-ip', 'error-voip-ip', 'Invalid IPv4 address.');
        valid = false;
      }
      voip = {
        ip,
        port: $('#voip-port').value || '5060',
        extension: $('#voip-extension').value.trim(),
        codec: $('#voip-codec').value,
        protocol: $('#voip-protocol').value,
        transport: $('#voip-transport').value,
      };
    }

    // XMPP validation
    let xmpp = null;
    if ($('#xmpp-enabled').checked) {
      const ip = $('#xmpp-ip').value.trim();
      if (ip && !isValidIP(ip)) {
        setFieldError('xmpp-ip', 'error-xmpp-ip', 'Invalid IPv4 address.');
        valid = false;
      }
      xmpp = {
        jid: $('#xmpp-jid').value.trim(),
        server: $('#xmpp-server').value.trim(),
        ip,
        port: $('#xmpp-port').value || '5222',
        encryption: $('#xmpp-encryption').value,
        conference: $('#xmpp-conference').value.trim(),
      };
    }

    // Custom services
    let customServices = [];
    if ($('#custom-enabled').checked) {
      const rows = $$('.custom-service-row');
      const descs = $$('.custom-service-desc');
      rows.forEach((row, i) => {
        const sName = row.querySelector('.cs-name').value.trim();
        const sIp = row.querySelector('.cs-ip').value.trim();
        const sPort = row.querySelector('.cs-port').value;
        const sDesc = descs[i] ? (descs[i].querySelector('.cs-desc')?.value.trim() || '') : '';
        if (sName || sIp) {
          customServices.push({ name: sName, ip: sIp, port: sPort, description: sDesc });
        }
      });
    }

    if (!valid) return;

    // Duplicate check (warning, not blocking)
    const ipsToCheck = [];
    if (voip && voip.ip) ipsToCheck.push(voip.ip);
    if (xmpp && xmpp.ip) ipsToCheck.push(xmpp.ip);
    customServices.forEach((s) => { if (s.ip) ipsToCheck.push(s.ip); });

    const warnings = checkContactDuplicates(name, ipsToCheck, editingId);
    if (warnings.length > 0) {
      const proceed = confirm('Duplicate Warning:\n\n' + warnings.join('\n') + '\n\nDo you want to save anyway?');
      if (!proceed) return;
    }

    const contact = {
      id: editingId || uuid(),
      name,
      platform,
      location: $('#contact-location').value.trim(),
      department: $('#contact-department').value.trim(),
      notes: $('#contact-notes').value.trim(),
      voip,
      xmpp,
      customServices,
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      const idx = contacts.findIndex((c) => c.id === editingId);
      if (idx !== -1) {
        contact.createdAt = contacts[idx].createdAt;
        contacts[idx] = contact;
      }
      toast('Contact updated.', 'success');
    } else {
      contact.createdAt = contact.updatedAt;
      contacts.push(contact);
      toast('Contact added.', 'success');
    }

    save();
    closeModal();
    render();
  }

  // ── Delete ─────────────────────────────────────────────────
  function openConfirmDelete(id) {
    const contact = contacts.find((c) => c.id === id);
    if (!contact) return;
    deleteTargetId = id;
    confirmNameEl.textContent = contact.name;
    confirmOverlay.classList.remove('hidden');
  }

  function confirmDelete() {
    contacts = contacts.filter((c) => c.id !== deleteTargetId);
    deleteTargetId = null;
    confirmOverlay.classList.add('hidden');
    save();
    render();
    toast('Contact deleted.', 'success');
  }

  // ── XML Export ─────────────────────────────────────────────
  // Serialises the contact list to well-formed XML with an XSLT
  // stylesheet reference, then triggers a browser file download.
  // Filename format: enterprise-contact-directory_YYYY-MM-DD_HHMMSS_N-contacts.xml
  function generateXML() {
    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<?xml-stylesheet type="text/xsl" href="enterprise-contact-directory.xsl"?>');
    lines.push(`<EnterpriseContactDirectory exported="${new Date().toISOString()}" version="1.0">`);

    contacts.forEach((c) => {
      lines.push(`  <Contact id="${escapeXml(c.id)}" platform="${escapeXml(c.platform)}">`);
      lines.push(`    <Name>${escapeXml(c.name)}</Name>`);
      if (c.location) lines.push(`    <Location>${escapeXml(c.location)}</Location>`);
      if (c.department) lines.push(`    <Department>${escapeXml(c.department)}</Department>`);
      if (c.notes) lines.push(`    <Notes>${escapeXml(c.notes)}</Notes>`);
      if (c.createdAt) lines.push(`    <CreatedAt>${escapeXml(c.createdAt)}</CreatedAt>`);
      if (c.updatedAt) lines.push(`    <UpdatedAt>${escapeXml(c.updatedAt)}</UpdatedAt>`);

      if (c.voip) {
        lines.push('    <VoIP>');
        lines.push(`      <IP>${escapeXml(c.voip.ip)}</IP>`);
        lines.push(`      <Port>${escapeXml(c.voip.port)}</Port>`);
        lines.push(`      <Extension>${escapeXml(c.voip.extension)}</Extension>`);
        lines.push(`      <Codec>${escapeXml(c.voip.codec)}</Codec>`);
        lines.push(`      <Protocol>${escapeXml(c.voip.protocol)}</Protocol>`);
        lines.push(`      <Transport>${escapeXml(c.voip.transport)}</Transport>`);
        lines.push('    </VoIP>');
      }

      if (c.xmpp) {
        lines.push('    <XMPP>');
        lines.push(`      <JID>${escapeXml(c.xmpp.jid)}</JID>`);
        lines.push(`      <Server>${escapeXml(c.xmpp.server)}</Server>`);
        lines.push(`      <IP>${escapeXml(c.xmpp.ip)}</IP>`);
        lines.push(`      <Port>${escapeXml(c.xmpp.port)}</Port>`);
        lines.push(`      <Encryption>${escapeXml(c.xmpp.encryption)}</Encryption>`);
        lines.push(`      <Conference>${escapeXml(c.xmpp.conference)}</Conference>`);
        lines.push('    </XMPP>');
      }

      if (c.customServices && c.customServices.length) {
        lines.push('    <CustomServices>');
        c.customServices.forEach((s) => {
          lines.push('      <Service>');
          lines.push(`        <ServiceName>${escapeXml(s.name)}</ServiceName>`);
          lines.push(`        <IP>${escapeXml(s.ip)}</IP>`);
          lines.push(`        <Port>${escapeXml(s.port)}</Port>`);
          if (s.description) lines.push(`        <Description>${escapeXml(s.description)}</Description>`);
          lines.push('      </Service>');
        });
        lines.push('    </CustomServices>');
      }

      lines.push('  </Contact>');
    });

    lines.push('</EnterpriseContactDirectory>');
    return lines.join('\n');
  }

  function buildExportFilename() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const count = contacts.length;
    return `enterprise-contact-directory_${datePart}_${timePart}_${count}-contacts.xml`;
  }

  function exportXML() {
    if (contacts.length === 0) {
      toast('No contacts to export.', 'error');
      return;
    }
    const xml = generateXML();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildExportFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exported as ${a.download}`, 'success');
  }

  // ── XML Import ─────────────────────────────────────────────
  // Parses an uploaded XML file using DOMParser, extracts contacts,
  // and merges them into the current list (matching by ID: existing
  // contacts are updated, new ones are appended).
  function importXML(xmlText) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'application/xml');

      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        toast('Invalid XML file.', 'error');
        return;
      }

      const contactEls = doc.querySelectorAll('Contact');
      if (contactEls.length === 0) {
        toast('No contacts found in XML.', 'error');
        return;
      }

      const imported = [];
      contactEls.forEach((el) => {
        const contact = {
          id: el.getAttribute('id') || uuid(),
          platform: el.getAttribute('platform') || 'site',
          name: getText(el, 'Name'),
          location: getText(el, 'Location'),
          department: getText(el, 'Department'),
          notes: getText(el, 'Notes'),
          createdAt: getText(el, 'CreatedAt') || new Date().toISOString(),
          updatedAt: getText(el, 'UpdatedAt') || new Date().toISOString(),
          voip: null,
          xmpp: null,
          customServices: [],
        };

        const voipEl = el.querySelector('VoIP');
        if (voipEl) {
          contact.voip = {
            ip: getText(voipEl, 'IP'),
            port: getText(voipEl, 'Port') || '5060',
            extension: getText(voipEl, 'Extension'),
            codec: getText(voipEl, 'Codec'),
            protocol: getText(voipEl, 'Protocol') || 'SIP',
            transport: getText(voipEl, 'Transport') || 'UDP',
          };
        }

        const xmppEl = el.querySelector('XMPP');
        if (xmppEl) {
          contact.xmpp = {
            jid: getText(xmppEl, 'JID'),
            server: getText(xmppEl, 'Server'),
            ip: getText(xmppEl, 'IP'),
            port: getText(xmppEl, 'Port') || '5222',
            encryption: getText(xmppEl, 'Encryption') || 'STARTTLS',
            conference: getText(xmppEl, 'Conference'),
          };
        }

        const serviceEls = el.querySelectorAll('CustomServices > Service');
        serviceEls.forEach((sEl) => {
          contact.customServices.push({
            name: getText(sEl, 'ServiceName'),
            ip: getText(sEl, 'IP'),
            port: getText(sEl, 'Port'),
            description: getText(sEl, 'Description'),
          });
        });

        imported.push(contact);
      });

      // Merge: overwrite by id, add new
      const existingIds = new Set(contacts.map((c) => c.id));
      let updated = 0;
      let added = 0;
      imported.forEach((ic) => {
        if (existingIds.has(ic.id)) {
          const idx = contacts.findIndex((c) => c.id === ic.id);
          contacts[idx] = ic;
          updated++;
        } else {
          contacts.push(ic);
          added++;
        }
      });

      save();
      render();
      toast(`Imported: ${added} added, ${updated} updated.`, 'success');
    } catch (err) {
      toast('Error parsing XML: ' + err.message, 'error');
    }
  }

  function getText(parent, tag) {
    const el = parent.querySelector(`:scope > ${tag}`);
    return el ? el.textContent.trim() : '';
  }

  // ── Event listeners & initialisation ───────────────────────
  // Wires up all UI interactions: search, filters, modal buttons,
  // form submission, card action delegation, keyboard shortcuts,
  // and XML import/export triggers.
  function init() {
    load();

    // Search
    searchInput.addEventListener('input', debounce(render, 200));

    // Filter logic
    setupFilterAllLogic('platform');
    setupFilterAllLogic('service');

    // Add contact
    $('#btn-add-contact').addEventListener('click', () => openModal(null));

    // Form submit
    contactForm.addEventListener('submit', handleSubmit);

    // Modal close
    $('#btn-close-modal').addEventListener('click', closeModal);
    $('#btn-cancel-modal').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    // Confirm delete
    $('#btn-close-confirm').addEventListener('click', () => confirmOverlay.classList.add('hidden'));
    $('#btn-cancel-delete').addEventListener('click', () => confirmOverlay.classList.add('hidden'));
    $('#btn-confirm-delete').addEventListener('click', confirmDelete);
    confirmOverlay.addEventListener('click', (e) => { if (e.target === confirmOverlay) confirmOverlay.classList.add('hidden'); });

    // Section toggles
    ['voip', 'xmpp', 'custom'].forEach((sec) => {
      $(`#${sec}-enabled`).addEventListener('change', (e) => {
        setCollapsible(sec, e.target.checked);
      });
    });

    // Add custom service row
    $('#btn-add-service').addEventListener('click', () => addCustomServiceRow());

    // Export / Import
    $('#btn-export-xml').addEventListener('click', exportXML);
    $('#btn-import-xml').addEventListener('click', () => $('#file-import').click());
    $('#file-import').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => importXML(ev.target.result);
      reader.readAsText(file);
      e.target.value = ''; // reset
    });

    // Dismiss validation banner
    $('#btn-dismiss-validation').addEventListener('click', () => {
      validationBanner.classList.add('hidden');
    });

    // Delegate card actions
    contactListEl.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit');
      if (editBtn) {
        const contact = contacts.find((c) => c.id === editBtn.dataset.id);
        if (contact) openModal(contact);
        return;
      }
      const deleteBtn = e.target.closest('.btn-delete');
      if (deleteBtn) {
        openConfirmDelete(deleteBtn.dataset.id);
      }
    });

    // Keyboard: Escape closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!confirmOverlay.classList.contains('hidden')) {
          confirmOverlay.classList.add('hidden');
        } else if (!modalOverlay.classList.contains('hidden')) {
          closeModal();
        }
      }
    });

    render();
  }

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ── Boot ───────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
