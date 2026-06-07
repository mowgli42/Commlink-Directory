# Commlink integration roadmap

## Strategic goal

Make Commlink-Directory the source data format for communication endpoints, links, scarce resources, contracts, reservations, and status-policy metadata. Commlink-Schedule, o-my, and o-my-sim should consume this source format instead of inventing parallel schemas.

The implementation order matters:

```text
Commlink-Directory XML v1.1
        |
        +--> Commlink-Schedule import/planning/utilization
        |
        +--> o-my commlink status service prototype
        |
        +--> o-my-sim OMS platform comm subsystem feeds
```

Start with the source data format. Do not build the o-my prototype service until the XML shape is stable enough for round-trip tests.

## Current format

Current XML has:

- `EnterpriseContactDirectory version="1.0"`
- `Contact` records with `id` and `platform`
- `VoIP`, `XMPP`, and `CustomServices`
- no canonical `CommLink`
- no resource/contract/reservation model
- no geospatial position fields for assets
- no status publication policy

That is enough for an address book. It is not enough to drive scheduling or live status.

## Target format, version 1.1

Add optional top-level sections so old v1.0 contact-only files remain valid:

```xml
<EnterpriseContactDirectory version="1.1">
  <Contacts>
    <Contact id="c005-mobile-unit-bravo" platform="mobile">
      ...
      <Position lat="34.1000" lon="-118.3000" alt_m="0" />
      <Capabilities>
        <Capability kind="satcom" resourceRef="res-iridium-lband" />
        <Capability kind="vhf_radio" resourceRef="res-vhf-net" />
      </Capabilities>
    </Contact>
  </Contacts>

  <Resources>
    <Resource id="res-iridium-lband" kind="satellite_transponder" provider="Iridium" status="operational">
      <Capacity bandwidth_khz="41.667" channels="2" maxConcurrentLinks="2" />
      <Availability start="2026-02-10T00:00:00Z" end="2026-02-11T00:00:00Z" recurrence="daily" />
    </Resource>
  </Resources>

  <Contracts>
    <Contract id="contract-iridium-metered" resourceRef="res-iridium-lband" billingModel="pay_per_minute" label="$/MIN">
      <Included minutes="60" />
      <Overage rate="2.00" currency="USD" unit="minute" />
    </Contract>
  </Contracts>

  <CommLinks>
    <CommLink id="link-004" type="satellite" subtype="LEO" resourceRef="res-iridium-lband" contractRef="contract-iridium-metered">
      <Endpoint contactRef="c001-ops-center-alpha" />
      <Endpoint contactRef="c008-eagle-one" />
      <Schedule start="2026-02-10T00:00:00Z" end="2026-02-11T00:00:00Z" recurrence="daily" />
      <Frequency value_mhz="1616.0" bandwidth_khz="41.667" />
    </CommLink>
  </CommLinks>

  <Reservations>
    <Reservation id="resv-002" resourceRef="res-iridium-lband" linkRef="link-004" status="approved" priority="routine">
      <Window start="2026-02-10T14:00:00Z" end="2026-02-10T16:00:00Z" />
      <Mission>Airborne surveillance fallback</Mission>
    </Reservation>
  </Reservations>
</EnterpriseContactDirectory>
```

## Billing model vocabulary

Use these values across all repos:

| Value | Display | Meaning |
|-------|---------|---------|
| `subscription` | `SUB` | prepaid recurring access |
| `owned` | `OWNED` | internal service, no marginal usage cost |
| `pay_per_minute` | `$/MIN` | cost grows with active minutes |
| `pay_per_mb` | `$/MB` | cost grows with data volume |
| `reservation` | `RESERVE` | use requires approved booking |
| `hybrid` | `BASE+OVERAGE` | included allocation plus overage |

## Phases

### Phase 1, source format

Owned by this repo.

- Define XML v1.1 tags and attributes.
- Update sample XML with at least one example of each billing model.
- Add parser/exporter helpers for resources, contracts, comm links, reservations.
- Add round-trip tests or smoke scripts proving v1.0 contact files still parse.
- Document compatibility rules.

### Phase 2, schedule consumer

Owned by Commlink-Schedule after Phase 1 lands.

- Import v1.1 XML into assets, commLinks, resources, contracts, reservations.
- Export v1.1 XML without losing scheduling/resource data.
- Flag conflicts and utilization using source data.

### Phase 3, o-my status service prototype

Owned by o-my after Phase 1 and the Schedule importer are stable.

- Read Commlink-Directory XML v1.1.
- Publish commlink inventory and status reports on Redis.
- Serve status over REST/SSE for simple map display.

### Phase 4, o-my-sim OMS platform integration

Owned by o-my-sim after o-my status message contracts are stable.

- Map directory contacts/resources to OMS-style platforms and subsystems.
- Include comm subsystem status in `PlatformStatusReport`.
- Drive scenario availability from reservations and resource windows.

## Acceptance criteria for this repo

- `sample-directory.xml` uses `version="1.1"` and includes contacts, resources, contracts, comm links, and reservations.
- v1.0 contact-only XML remains parseable.
- XML export preserves unknown future sections where practical, or documents that it does not.
- README explains that Commlink-Directory is the source of truth for downstream status/schedule services.
- Beads contains phase tasks for the format work.
