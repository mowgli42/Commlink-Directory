/* ============================================================
   Enterprise Contact Directory — XML v1.0 / v1.1 parser & exporter
   Shared by the web app (browser) and Node test runner.
   ============================================================ */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DirectoryXml = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BILLING_MODELS = [
    'subscription',
    'owned',
    'pay_per_minute',
    'pay_per_mb',
    'reservation',
    'hybrid',
  ];

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

  function directChild(parent, tag) {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const node = parent.childNodes[i];
      if (node.nodeType === 1 && node.tagName === tag) return node;
    }
    return null;
  }

  function directChildren(parent, tag) {
    const out = [];
    for (let i = 0; i < parent.childNodes.length; i++) {
      const node = parent.childNodes[i];
      if (node.nodeType === 1 && node.tagName === tag) out.push(node);
    }
    return out;
  }

  function getText(parent, tag) {
    const el = directChild(parent, tag);
    return el ? el.textContent.trim() : '';
  }

  function getAttr(el, name) {
    const v = el.getAttribute(name);
    return v === null ? '' : v.trim();
  }

  function parseContactElement(el) {
    const contact = {
      id: getAttr(el, 'id'),
      platform: getAttr(el, 'platform') || 'site',
      name: getText(el, 'Name'),
      location: getText(el, 'Location'),
      department: getText(el, 'Department'),
      notes: getText(el, 'Notes'),
      createdAt: getText(el, 'CreatedAt'),
      updatedAt: getText(el, 'UpdatedAt'),
      position: null,
      capabilities: [],
      voip: null,
      xmpp: null,
      customServices: [],
    };

    const posEl = directChild(el, 'Position');
    if (posEl) {
      contact.position = {
        lat: getAttr(posEl, 'lat'),
        lon: getAttr(posEl, 'lon'),
        alt_m: getAttr(posEl, 'alt_m'),
      };
    }

    const capsEl = directChild(el, 'Capabilities');
    if (capsEl) {
      directChildren(capsEl, 'Capability').forEach((capEl) => {
        contact.capabilities.push({
          kind: getAttr(capEl, 'kind'),
          resourceRef: getAttr(capEl, 'resourceRef'),
        });
      });
    }

    const voipEl = directChild(el, 'VoIP');
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

    const xmppEl = directChild(el, 'XMPP');
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

    const customEl = directChild(el, 'CustomServices');
    if (customEl) {
      directChildren(customEl, 'Service').forEach((sEl) => {
        contact.customServices.push({
          name: getText(sEl, 'ServiceName'),
          ip: getText(sEl, 'IP'),
          port: getText(sEl, 'Port'),
          description: getText(sEl, 'Description'),
        });
      });
    }

    return contact;
  }

  function parseResourceElement(el) {
    const resource = {
      id: getAttr(el, 'id'),
      kind: getAttr(el, 'kind'),
      provider: getAttr(el, 'provider'),
      status: getAttr(el, 'status'),
      name: getText(el, 'Name'),
      owner: getText(el, 'Owner'),
      capacity: null,
      availability: [],
    };

    const capEl = directChild(el, 'Capacity');
    if (capEl) {
      resource.capacity = {
        bandwidth_khz: getAttr(capEl, 'bandwidth_khz'),
        channels: getAttr(capEl, 'channels'),
        maxConcurrentLinks: getAttr(capEl, 'maxConcurrentLinks'),
        coverageArea: getAttr(capEl, 'coverageArea'),
      };
    }

    directChildren(el, 'Availability').forEach((avEl) => {
      resource.availability.push({
        start: getAttr(avEl, 'start'),
        end: getAttr(avEl, 'end'),
        recurrence: getAttr(avEl, 'recurrence'),
      });
    });

    return resource;
  }

  function parseContractElement(el) {
    const contract = {
      id: getAttr(el, 'id'),
      resourceRef: getAttr(el, 'resourceRef'),
      billingModel: getAttr(el, 'billingModel'),
      label: getAttr(el, 'label'),
      priorityClass: getAttr(el, 'priorityClass'),
      included: null,
      overage: null,
      includedData: null,
      overageData: null,
    };

    const incEl = directChild(el, 'Included');
    if (incEl) {
      contract.included = {
        minutes: getAttr(incEl, 'minutes'),
        data_mb: getAttr(incEl, 'data_mb'),
      };
    }

    const ovEl = directChild(el, 'Overage');
    if (ovEl) {
      contract.overage = {
        rate: getAttr(ovEl, 'rate'),
        currency: getAttr(ovEl, 'currency'),
        unit: getAttr(ovEl, 'unit'),
      };
    }

    const incDataEl = directChild(el, 'IncludedData');
    if (incDataEl) {
      contract.includedData = {
        data_mb: getAttr(incDataEl, 'data_mb'),
      };
    }

    const ovDataEl = directChild(el, 'OverageData');
    if (ovDataEl) {
      contract.overageData = {
        rate: getAttr(ovDataEl, 'rate'),
        currency: getAttr(ovDataEl, 'currency'),
        unit: getAttr(ovDataEl, 'unit'),
      };
    }

    return contract;
  }

  function parseCommLinkElement(el) {
    const link = {
      id: getAttr(el, 'id'),
      type: getAttr(el, 'type'),
      subtype: getAttr(el, 'subtype'),
      resourceRef: getAttr(el, 'resourceRef'),
      contractRef: getAttr(el, 'contractRef'),
      endpoints: [],
      schedule: null,
      frequency: null,
    };

    directChildren(el, 'Endpoint').forEach((epEl) => {
      link.endpoints.push({ contactRef: getAttr(epEl, 'contactRef') });
    });

    const schedEl = directChild(el, 'Schedule');
    if (schedEl) {
      link.schedule = {
        start: getAttr(schedEl, 'start'),
        end: getAttr(schedEl, 'end'),
        recurrence: getAttr(schedEl, 'recurrence'),
      };
    }

    const freqEl = directChild(el, 'Frequency');
    if (freqEl) {
      link.frequency = {
        value_mhz: getAttr(freqEl, 'value_mhz'),
        bandwidth_khz: getAttr(freqEl, 'bandwidth_khz'),
      };
    }

    return link;
  }

  function parseReservationElement(el) {
    const reservation = {
      id: getAttr(el, 'id'),
      resourceRef: getAttr(el, 'resourceRef'),
      linkRef: getAttr(el, 'linkRef'),
      status: getAttr(el, 'status'),
      priority: getAttr(el, 'priority'),
      mission: getText(el, 'Mission'),
      window: null,
    };

    const winEl = directChild(el, 'Window');
    if (winEl) {
      reservation.window = {
        start: getAttr(winEl, 'start'),
        end: getAttr(winEl, 'end'),
      };
    }

    return reservation;
  }

  /**
   * Parse EnterpriseContactDirectory XML into a structured document.
   * Supports v1.0 (root-level Contact) and v1.1 (Contacts wrapper + scheduling sections).
   */
  function parseDirectoryXml(xmlText, parser) {
    const domParser = parser || new DOMParser();
    const doc = domParser.parseFromString(xmlText, 'application/xml');
    const parseErrors = doc.getElementsByTagName('parsererror');
    if (parseErrors.length > 0) {
      throw new Error('Invalid XML: ' + (parseErrors[0].textContent || '').trim());
    }

    const root = doc.documentElement;
    if (!root || root.tagName !== 'EnterpriseContactDirectory') {
      throw new Error('Root element must be EnterpriseContactDirectory');
    }

    const version = getAttr(root, 'version') || '1.0';
    const exported = getAttr(root, 'exported');

    const contacts = [];
    const contactsWrapper = directChild(root, 'Contacts');
    if (contactsWrapper) {
      directChildren(contactsWrapper, 'Contact').forEach((el) => {
        contacts.push(parseContactElement(el));
      });
    }
    directChildren(root, 'Contact').forEach((el) => {
      contacts.push(parseContactElement(el));
    });

    const resources = [];
    const resourcesWrapper = directChild(root, 'Resources');
    if (resourcesWrapper) {
      directChildren(resourcesWrapper, 'Resource').forEach((el) => {
        resources.push(parseResourceElement(el));
      });
    }

    const contracts = [];
    const contractsWrapper = directChild(root, 'Contracts');
    if (contractsWrapper) {
      directChildren(contractsWrapper, 'Contract').forEach((el) => {
        contracts.push(parseContractElement(el));
      });
    }

    const commLinks = [];
    const commLinksWrapper = directChild(root, 'CommLinks');
    if (commLinksWrapper) {
      directChildren(commLinksWrapper, 'CommLink').forEach((el) => {
        commLinks.push(parseCommLinkElement(el));
      });
    }

    const reservations = [];
    const reservationsWrapper = directChild(root, 'Reservations');
    if (reservationsWrapper) {
      directChildren(reservationsWrapper, 'Reservation').forEach((el) => {
        reservations.push(parseReservationElement(el));
      });
    }

    return { version, exported, contacts, resources, contracts, commLinks, reservations };
  }

  function serializeContact(contact, indent) {
    const lines = [];
    const pad = (n) => indent.repeat(n);
    lines.push(`${pad(2)}<Contact id="${escapeXml(contact.id)}" platform="${escapeXml(contact.platform)}">`);
    lines.push(`${pad(3)}<Name>${escapeXml(contact.name)}</Name>`);
    if (contact.location) lines.push(`${pad(3)}<Location>${escapeXml(contact.location)}</Location>`);
    if (contact.department) lines.push(`${pad(3)}<Department>${escapeXml(contact.department)}</Department>`);
    if (contact.notes) lines.push(`${pad(3)}<Notes>${escapeXml(contact.notes)}</Notes>`);
    if (contact.createdAt) lines.push(`${pad(3)}<CreatedAt>${escapeXml(contact.createdAt)}</CreatedAt>`);
    if (contact.updatedAt) lines.push(`${pad(3)}<UpdatedAt>${escapeXml(contact.updatedAt)}</UpdatedAt>`);

    if (contact.position && (contact.position.lat || contact.position.lon)) {
      const p = contact.position;
      lines.push(
        `${pad(3)}<Position lat="${escapeXml(p.lat)}" lon="${escapeXml(p.lon)}"` +
          (p.alt_m ? ` alt_m="${escapeXml(p.alt_m)}"` : '') +
          ' />'
      );
    }

    if (contact.capabilities && contact.capabilities.length) {
      lines.push(`${pad(3)}<Capabilities>`);
      contact.capabilities.forEach((cap) => {
        lines.push(
          `${pad(4)}<Capability kind="${escapeXml(cap.kind)}" resourceRef="${escapeXml(cap.resourceRef)}" />`
        );
      });
      lines.push(`${pad(3)}</Capabilities>`);
    }

    if (contact.voip) {
      lines.push(`${pad(3)}<VoIP>`);
      lines.push(`${pad(4)}<IP>${escapeXml(contact.voip.ip)}</IP>`);
      lines.push(`${pad(4)}<Port>${escapeXml(contact.voip.port)}</Port>`);
      if (contact.voip.extension) lines.push(`${pad(4)}<Extension>${escapeXml(contact.voip.extension)}</Extension>`);
      if (contact.voip.codec) lines.push(`${pad(4)}<Codec>${escapeXml(contact.voip.codec)}</Codec>`);
      lines.push(`${pad(4)}<Protocol>${escapeXml(contact.voip.protocol)}</Protocol>`);
      lines.push(`${pad(4)}<Transport>${escapeXml(contact.voip.transport)}</Transport>`);
      lines.push(`${pad(3)}</VoIP>`);
    }

    if (contact.xmpp) {
      lines.push(`${pad(3)}<XMPP>`);
      lines.push(`${pad(4)}<JID>${escapeXml(contact.xmpp.jid)}</JID>`);
      if (contact.xmpp.server) lines.push(`${pad(4)}<Server>${escapeXml(contact.xmpp.server)}</Server>`);
      if (contact.xmpp.ip) lines.push(`${pad(4)}<IP>${escapeXml(contact.xmpp.ip)}</IP>`);
      lines.push(`${pad(4)}<Port>${escapeXml(contact.xmpp.port)}</Port>`);
      lines.push(`${pad(4)}<Encryption>${escapeXml(contact.xmpp.encryption)}</Encryption>`);
      if (contact.xmpp.conference) lines.push(`${pad(4)}<Conference>${escapeXml(contact.xmpp.conference)}</Conference>`);
      lines.push(`${pad(3)}</XMPP>`);
    }

    if (contact.customServices && contact.customServices.length) {
      lines.push(`${pad(3)}<CustomServices>`);
      contact.customServices.forEach((s) => {
        lines.push(`${pad(4)}<Service>`);
        lines.push(`${pad(5)}<ServiceName>${escapeXml(s.name)}</ServiceName>`);
        if (s.ip) lines.push(`${pad(5)}<IP>${escapeXml(s.ip)}</IP>`);
        if (s.port) lines.push(`${pad(5)}<Port>${escapeXml(s.port)}</Port>`);
        if (s.description) lines.push(`${pad(5)}<Description>${escapeXml(s.description)}</Description>`);
        lines.push(`${pad(4)}</Service>`);
      });
      lines.push(`${pad(3)}</CustomServices>`);
    }

    lines.push(`${pad(2)}</Contact>`);
    return lines;
  }

  function serializeResource(resource, indent) {
    const lines = [];
    const pad = (n) => indent.repeat(n);
    let attrs = `id="${escapeXml(resource.id)}" kind="${escapeXml(resource.kind)}"`;
    if (resource.provider) attrs += ` provider="${escapeXml(resource.provider)}"`;
    if (resource.status) attrs += ` status="${escapeXml(resource.status)}"`;
    lines.push(`${pad(2)}<Resource ${attrs}>`);
    if (resource.name) lines.push(`${pad(3)}<Name>${escapeXml(resource.name)}</Name>`);
    if (resource.owner) lines.push(`${pad(3)}<Owner>${escapeXml(resource.owner)}</Owner>`);
    if (resource.capacity) {
      const c = resource.capacity;
      let capAttrs = '';
      if (c.bandwidth_khz) capAttrs += ` bandwidth_khz="${escapeXml(c.bandwidth_khz)}"`;
      if (c.channels) capAttrs += ` channels="${escapeXml(c.channels)}"`;
      if (c.maxConcurrentLinks) capAttrs += ` maxConcurrentLinks="${escapeXml(c.maxConcurrentLinks)}"`;
      if (c.coverageArea) capAttrs += ` coverageArea="${escapeXml(c.coverageArea)}"`;
      lines.push(`${pad(3)}<Capacity${capAttrs} />`);
    }
    (resource.availability || []).forEach((av) => {
      lines.push(
        `${pad(3)}<Availability start="${escapeXml(av.start)}" end="${escapeXml(av.end)}"` +
          (av.recurrence ? ` recurrence="${escapeXml(av.recurrence)}"` : '') +
          ' />'
      );
    });
    lines.push(`${pad(2)}</Resource>`);
    return lines;
  }

  function serializeContract(contract, indent) {
    const lines = [];
    const pad = (n) => indent.repeat(n);
    lines.push(
      `${pad(2)}<Contract id="${escapeXml(contract.id)}" resourceRef="${escapeXml(contract.resourceRef)}"` +
        ` billingModel="${escapeXml(contract.billingModel)}" label="${escapeXml(contract.label)}"` +
        (contract.priorityClass ? ` priorityClass="${escapeXml(contract.priorityClass)}"` : '') +
        '>'
    );
    if (contract.included) {
      const inc = contract.included;
      let incAttrs = '';
      if (inc.minutes) incAttrs += ` minutes="${escapeXml(inc.minutes)}"`;
      if (inc.data_mb) incAttrs += ` data_mb="${escapeXml(inc.data_mb)}"`;
      if (incAttrs) lines.push(`${pad(3)}<Included${incAttrs} />`);
    }
    if (contract.includedData && contract.includedData.data_mb) {
      lines.push(`${pad(3)}<IncludedData data_mb="${escapeXml(contract.includedData.data_mb)}" />`);
    }
    if (contract.overage) {
      const ov = contract.overage;
      lines.push(
        `${pad(3)}<Overage rate="${escapeXml(ov.rate)}" currency="${escapeXml(ov.currency)}"` +
          (ov.unit ? ` unit="${escapeXml(ov.unit)}"` : '') +
          ' />'
      );
    }
    if (contract.overageData) {
      const ov = contract.overageData;
      lines.push(
        `${pad(3)}<OverageData rate="${escapeXml(ov.rate)}" currency="${escapeXml(ov.currency)}"` +
          (ov.unit ? ` unit="${escapeXml(ov.unit)}"` : '') +
          ' />'
      );
    }
    lines.push(`${pad(2)}</Contract>`);
    return lines;
  }

  function serializeCommLink(link, indent) {
    const lines = [];
    const pad = (n) => indent.repeat(n);
    let attrs = `id="${escapeXml(link.id)}" type="${escapeXml(link.type)}"`;
    if (link.subtype) attrs += ` subtype="${escapeXml(link.subtype)}"`;
    if (link.resourceRef) attrs += ` resourceRef="${escapeXml(link.resourceRef)}"`;
    if (link.contractRef) attrs += ` contractRef="${escapeXml(link.contractRef)}"`;
    lines.push(`${pad(2)}<CommLink ${attrs}>`);
    (link.endpoints || []).forEach((ep) => {
      lines.push(`${pad(3)}<Endpoint contactRef="${escapeXml(ep.contactRef)}" />`);
    });
    if (link.schedule) {
      const s = link.schedule;
      lines.push(
        `${pad(3)}<Schedule start="${escapeXml(s.start)}" end="${escapeXml(s.end)}"` +
          (s.recurrence ? ` recurrence="${escapeXml(s.recurrence)}"` : '') +
          ' />'
      );
    }
    if (link.frequency) {
      const f = link.frequency;
      let fAttrs = '';
      if (f.value_mhz) fAttrs += ` value_mhz="${escapeXml(f.value_mhz)}"`;
      if (f.bandwidth_khz) fAttrs += ` bandwidth_khz="${escapeXml(f.bandwidth_khz)}"`;
      if (fAttrs) lines.push(`${pad(3)}<Frequency${fAttrs} />`);
    }
    lines.push(`${pad(2)}</CommLink>`);
    return lines;
  }

  function serializeReservation(reservation, indent) {
    const lines = [];
    const pad = (n) => indent.repeat(n);
    let attrs = `id="${escapeXml(reservation.id)}" resourceRef="${escapeXml(reservation.resourceRef)}"`;
    if (reservation.linkRef) attrs += ` linkRef="${escapeXml(reservation.linkRef)}"`;
    if (reservation.status) attrs += ` status="${escapeXml(reservation.status)}"`;
    if (reservation.priority) attrs += ` priority="${escapeXml(reservation.priority)}"`;
    lines.push(`${pad(2)}<Reservation ${attrs}>`);
    if (reservation.window) {
      lines.push(
        `${pad(3)}<Window start="${escapeXml(reservation.window.start)}" end="${escapeXml(reservation.window.end)}" />`
      );
    }
    if (reservation.mission) lines.push(`${pad(3)}<Mission>${escapeXml(reservation.mission)}</Mission>`);
    lines.push(`${pad(2)}</Reservation>`);
    return lines;
  }

  function hasSchedulingSections(doc) {
    return (
      (doc.resources && doc.resources.length > 0) ||
      (doc.contracts && doc.contracts.length > 0) ||
      (doc.commLinks && doc.commLinks.length > 0) ||
      (doc.reservations && doc.reservations.length > 0)
    );
  }

  /**
   * Serialize a directory document to XML.
   * Uses v1.1 layout (Contacts wrapper) when scheduling sections exist or forceV11 is true.
   */
  function serializeDirectoryXml(doc, options) {
    const opts = options || {};
    const indent = opts.indent || '  ';
    const exported = doc.exported || new Date().toISOString();
    const useV11 = opts.forceV11 || hasSchedulingSections(doc) || doc.version === '1.1';
    const version = useV11 ? '1.1' : '1.0';

    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    if (opts.includeStylesheet !== false) {
      lines.push('<?xml-stylesheet type="text/xsl" href="enterprise-contact-directory.xsl"?>');
    }
    lines.push(`<EnterpriseContactDirectory exported="${escapeXml(exported)}" version="${version}">`);

    if (useV11) {
      lines.push(`${indent}<Contacts>`);
      (doc.contacts || []).forEach((c) => lines.push(...serializeContact(c, indent)));
      lines.push(`${indent}</Contacts>`);
    } else {
      (doc.contacts || []).forEach((c) => lines.push(...serializeContact(c, indent)));
    }

    if (doc.resources && doc.resources.length) {
      lines.push(`${indent}<Resources>`);
      doc.resources.forEach((r) => lines.push(...serializeResource(r, indent)));
      lines.push(`${indent}</Resources>`);
    }

    if (doc.contracts && doc.contracts.length) {
      lines.push(`${indent}<Contracts>`);
      doc.contracts.forEach((c) => lines.push(...serializeContract(c, indent)));
      lines.push(`${indent}</Contracts>`);
    }

    if (doc.commLinks && doc.commLinks.length) {
      lines.push(`${indent}<CommLinks>`);
      doc.commLinks.forEach((l) => lines.push(...serializeCommLink(l, indent)));
      lines.push(`${indent}</CommLinks>`);
    }

    if (doc.reservations && doc.reservations.length) {
      lines.push(`${indent}<Reservations>`);
      doc.reservations.forEach((r) => lines.push(...serializeReservation(r, indent)));
      lines.push(`${indent}</Reservations>`);
    }

    lines.push('</EnterpriseContactDirectory>');
    return lines.join('\n');
  }

  function roundTrip(doc) {
    const xml = serializeDirectoryXml(doc);
    return parseDirectoryXml(xml);
  }

  return {
    BILLING_MODELS,
    parseDirectoryXml,
    serializeDirectoryXml,
    roundTrip,
    escapeXml,
  };
});
