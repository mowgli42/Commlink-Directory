#!/usr/bin/env node
/**
 * Build sample-directory.xml v1.1 from the v1.0 fixture plus scheduling sections.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(import.meta.url);
const DirectoryXml = require(join(root, 'directory-xml.js'));

global.DOMParser = DOMParser;

const v10 = readFileSync(join(root, 'fixtures/sample-directory-v1.0.xml'), 'utf8');
const base = DirectoryXml.parseDirectoryXml(v10, new DOMParser());

const positionById = {
  'c001-ops-center-alpha': { lat: '34.0522', lon: '-118.2437', alt_m: '50' },
  'c005-mobile-unit-bravo': { lat: '34.1000', lon: '-118.3000', alt_m: '0' },
  'c006-mobile-unit-charlie': { lat: '33.9500', lon: '-118.2200', alt_m: '0' },
  'c008-aircraft-eagle-one': { lat: '34.1500', lon: '-118.1500', alt_m: '7620' },
  'c010-uav-raven-three': { lat: '34.0800', lon: '-118.1000', alt_m: '1524' },
};

const capabilitiesById = {
  'c001-ops-center-alpha': [
    { kind: 'satcom', resourceRef: 'res-muos-t3k' },
    { kind: 'voip', resourceRef: 'res-ip-voice' },
  ],
  'c005-mobile-unit-bravo': [
    { kind: 'satcom', resourceRef: 'res-muos-t3k' },
    { kind: 'vhf_radio', resourceRef: 'res-vhf-net' },
    { kind: 'mcc', resourceRef: 'res-mobile-command-center' },
  ],
  'c006-mobile-unit-charlie': [{ kind: 'hf_radio', resourceRef: 'res-hf-net' }],
  'c008-aircraft-eagle-one': [
    { kind: 'satcom', resourceRef: 'res-iridium-lband' },
    { kind: 'satcom', resourceRef: 'res-o3b-ka7' },
  ],
  'c009-aircraft-hawk-two': [{ kind: 'satcom', resourceRef: 'res-wgs-x2' }],
};

base.contacts = base.contacts.map((contact) => ({
  ...contact,
  position: positionById[contact.id] || contact.position,
  capabilities: capabilitiesById[contact.id] || contact.capabilities,
}));

base.version = '1.1';
base.exported = '2026-02-10T12:00:00.000Z';

base.resources = [
  {
    id: 'res-muos-t3k',
    kind: 'satellite_transponder',
    name: 'MUOS-5 T3-K',
    owner: 'Operations',
    provider: 'DoD',
    status: 'operational',
    capacity: { bandwidth_khz: '36000', channels: '1', maxConcurrentLinks: '1', coverageArea: 'GEO western CONUS beam' },
    availability: [{ start: '2026-02-10T00:00:00Z', end: '2026-02-11T00:00:00Z', recurrence: 'daily' }],
  },
  {
    id: 'res-iridium-lband',
    kind: 'satellite_transponder',
    name: 'Iridium L-Band PTT',
    owner: 'Field Ops',
    provider: 'Iridium',
    status: 'operational',
    capacity: { bandwidth_khz: '41.667', channels: '2', maxConcurrentLinks: '2', coverageArea: 'LEO global spot beam' },
    availability: [{ start: '2026-02-10T00:00:00Z', end: '2026-02-11T00:00:00Z', recurrence: 'daily' }],
  },
  {
    id: 'res-o3b-ka7',
    kind: 'satellite_transponder',
    name: 'O3b MEO Ka-7',
    owner: 'Air Ops',
    provider: 'SES',
    status: 'operational',
    capacity: { bandwidth_khz: '500', channels: '1', maxConcurrentLinks: '1', coverageArea: 'MEO steerable beam' },
    availability: [{ start: '2026-02-10T04:00:00Z', end: '2026-02-10T16:00:00Z', recurrence: 'daily' }],
  },
  {
    id: 'res-wgs-x2',
    kind: 'satellite_transponder',
    name: 'WGS-6 X-2',
    owner: 'Air Ops',
    provider: 'DoD',
    status: 'operational',
    capacity: { bandwidth_khz: '18000', channels: '1', maxConcurrentLinks: '1', coverageArea: 'GEO Pacific beam' },
    availability: [{ start: '2026-02-10T10:00:00Z', end: '2026-02-10T22:00:00Z', recurrence: 'daily' }],
  },
  {
    id: 'res-mobile-command-center',
    kind: 'mobile_command_center',
    name: 'Mobile Command Center MCC-01',
    owner: 'Field Ops',
    provider: 'Internal',
    status: 'operational',
    capacity: { bandwidth_khz: '25000', channels: '4', maxConcurrentLinks: '4', coverageArea: '30 km deployable bubble' },
    availability: [{ start: '2026-02-10T12:00:00Z', end: '2026-02-10T20:00:00Z', recurrence: 'none' }],
  },
  {
    id: 'res-hf-net',
    kind: 'radio_net',
    name: 'HF Net Primary',
    owner: 'Field Ops',
    provider: 'Internal',
    status: 'operational',
    capacity: { bandwidth_khz: '3', channels: '1', maxConcurrentLinks: '1', coverageArea: 'Regional HF skywave' },
    availability: [{ start: '2026-02-10T00:00:00Z', end: '2026-02-11T00:00:00Z', recurrence: 'daily' }],
  },
  {
    id: 'res-vhf-net',
    kind: 'radio_net',
    name: 'VHF Channel 16',
    owner: 'Field Ops',
    provider: 'Internal',
    status: 'maintenance',
    capacity: { bandwidth_khz: '25', channels: '1', maxConcurrentLinks: '1', coverageArea: '50 km line-of-sight' },
    availability: [{ start: '2026-02-10T06:00:00Z', end: '2026-02-10T22:00:00Z', recurrence: 'daily' }],
  },
  {
    id: 'res-satcom-data',
    kind: 'satellite_transponder',
    name: 'Commercial Ka Data Beam',
    owner: 'IT Infrastructure',
    provider: 'Commercial',
    status: 'operational',
    capacity: { bandwidth_khz: '50000', channels: '2', maxConcurrentLinks: '2', coverageArea: 'Regional Ka spot' },
    availability: [{ start: '2026-02-10T00:00:00Z', end: '2026-02-11T00:00:00Z', recurrence: 'daily' }],
  },
];

base.contracts = [
  { id: 'contract-muos-sub', resourceRef: 'res-muos-t3k', billingModel: 'subscription', label: 'SUB', priorityClass: 'mission', included: { minutes: '1440' } },
  { id: 'contract-iridium-metered', resourceRef: 'res-iridium-lband', billingModel: 'pay_per_minute', label: '$/MIN', priorityClass: 'field', included: { minutes: '60' }, overage: { rate: '2.00', currency: 'USD', unit: 'minute' } },
  { id: 'contract-o3b-hybrid', resourceRef: 'res-o3b-ka7', billingModel: 'hybrid', label: 'BASE+OVERAGE', priorityClass: 'air', included: { minutes: '480', data_mb: '10000' }, overage: { rate: '0.12', currency: 'USD', unit: 'minute' }, overageData: { rate: '0.05', currency: 'USD', unit: 'mb' } },
  { id: 'contract-wgs-reservation', resourceRef: 'res-wgs-x2', billingModel: 'reservation', label: 'RESERVE', priorityClass: 'priority' },
  { id: 'contract-mcc-reservation', resourceRef: 'res-mobile-command-center', billingModel: 'reservation', label: 'RESERVE', priorityClass: 'priority' },
  { id: 'contract-hf-owned', resourceRef: 'res-hf-net', billingModel: 'owned', label: 'OWNED', priorityClass: 'routine', included: { minutes: '1440' } },
  { id: 'contract-vhf-owned', resourceRef: 'res-vhf-net', billingModel: 'owned', label: 'OWNED', priorityClass: 'routine', included: { minutes: '960' } },
  { id: 'contract-satcom-data-metered', resourceRef: 'res-satcom-data', billingModel: 'pay_per_mb', label: '$/MB', priorityClass: 'routine', includedData: { data_mb: '5000' }, overageData: { rate: '0.08', currency: 'USD', unit: 'mb' } },
];

base.commLinks = [
  {
    id: 'link-001',
    type: 'satellite',
    subtype: 'GEO',
    resourceRef: 'res-muos-t3k',
    contractRef: 'contract-muos-sub',
    endpoints: [{ contactRef: 'c001-ops-center-alpha' }, { contactRef: 'c005-mobile-unit-bravo' }],
    schedule: { start: '2026-02-10T06:00:00Z', end: '2026-02-10T18:00:00Z', recurrence: 'daily' },
    frequency: { value_mhz: '14250.0', bandwidth_khz: '36000' },
  },
  {
    id: 'link-002',
    type: 'los_radio',
    subtype: 'HF',
    resourceRef: 'res-hf-net',
    contractRef: 'contract-hf-owned',
    endpoints: [{ contactRef: 'c005-mobile-unit-bravo' }, { contactRef: 'c006-mobile-unit-charlie' }],
    schedule: { start: '2026-02-10T00:00:00Z', end: '2026-02-11T00:00:00Z', recurrence: 'daily' },
    frequency: { value_mhz: '7.350', bandwidth_khz: '3' },
  },
  {
    id: 'link-004',
    type: 'satellite',
    subtype: 'LEO',
    resourceRef: 'res-iridium-lband',
    contractRef: 'contract-iridium-metered',
    endpoints: [{ contactRef: 'c001-ops-center-alpha' }, { contactRef: 'c008-aircraft-eagle-one' }],
    schedule: { start: '2026-02-10T00:00:00Z', end: '2026-02-11T00:00:00Z', recurrence: 'daily' },
    frequency: { value_mhz: '1616.0', bandwidth_khz: '41.667' },
  },
  {
    id: 'link-005',
    type: 'los_radio',
    subtype: 'VHF',
    resourceRef: 'res-vhf-net',
    contractRef: 'contract-vhf-owned',
    endpoints: [{ contactRef: 'c005-mobile-unit-bravo' }, { contactRef: 'c007-mobile-relay-fox' }],
    schedule: { start: '2026-02-10T06:00:00Z', end: '2026-02-10T22:00:00Z', recurrence: 'daily' },
    frequency: { value_mhz: '156.800', bandwidth_khz: '25' },
  },
  {
    id: 'link-006',
    type: 'satellite',
    subtype: 'MEO',
    resourceRef: 'res-o3b-ka7',
    contractRef: 'contract-o3b-hybrid',
    endpoints: [{ contactRef: 'c006-mobile-unit-charlie' }, { contactRef: 'c008-aircraft-eagle-one' }],
    schedule: { start: '2026-02-10T04:00:00Z', end: '2026-02-10T16:00:00Z', recurrence: 'daily' },
    frequency: { value_mhz: '7500.0', bandwidth_khz: '500' },
  },
  {
    id: 'link-011',
    type: 'satellite',
    subtype: 'GEO',
    resourceRef: 'res-wgs-x2',
    contractRef: 'contract-wgs-reservation',
    endpoints: [{ contactRef: 'c009-aircraft-hawk-two' }, { contactRef: 'c010-uav-raven-three' }],
    schedule: { start: '2026-02-10T10:00:00Z', end: '2026-02-10T22:00:00Z', recurrence: 'daily' },
    frequency: { value_mhz: '12450.0', bandwidth_khz: '18000' },
  },
];

base.reservations = [
  {
    id: 'resv-001',
    resourceRef: 'res-muos-t3k',
    linkRef: 'link-001',
    status: 'active',
    priority: 'priority',
    mission: 'Bravo field operations',
    window: { start: '2026-02-10T06:00:00Z', end: '2026-02-10T18:00:00Z' },
  },
  {
    id: 'resv-002',
    resourceRef: 'res-iridium-lband',
    linkRef: 'link-004',
    status: 'approved',
    priority: 'routine',
    mission: 'Airborne surveillance fallback',
    window: { start: '2026-02-10T14:00:00Z', end: '2026-02-10T16:00:00Z' },
  },
  {
    id: 'resv-003',
    resourceRef: 'res-mobile-command-center',
    linkRef: '',
    status: 'approved',
    priority: 'priority',
    mission: 'Temporary command bubble for field teams',
    window: { start: '2026-02-10T14:00:00Z', end: '2026-02-10T18:00:00Z' },
  },
  {
    id: 'resv-004',
    resourceRef: 'res-wgs-x2',
    linkRef: 'link-011',
    status: 'requested',
    priority: 'routine',
    mission: 'UAV control restoration',
    window: { start: '2026-02-10T10:00:00Z', end: '2026-02-10T22:00:00Z' },
  },
];

const xml = DirectoryXml.serializeDirectoryXml(base, { forceV11: true });
writeFileSync(join(root, 'sample-directory.xml'), xml + '\n', 'utf8');
console.log('Wrote sample-directory.xml (v1.1)');
