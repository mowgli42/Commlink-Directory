<?xml version="1.0" encoding="UTF-8"?>
<!--
  Enterprise Contact Directory — XSLT Browser Stylesheet
  Version: 1.0

  When an exported XML file references this stylesheet via:
    <?xml-stylesheet type="text/xsl" href="enterprise-contact-directory.xsl"?>
  modern browsers will render the XML as a formatted, dark-themed
  HTML page — no server required.
-->
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:output method="html" indent="yes" encoding="UTF-8"
              doctype-system="about:legacy-compat"/>

  <!-- ============================================================
       Root template
       ============================================================ -->
  <xsl:template match="/">
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Enterprise Contact Directory</title>
      <style>
        /* ── Design tokens ─────────────────────────── */
        :root {
          --bg-base:     #0d1117;
          --bg-surface:  #161b22;
          --bg-elevated: #1c2128;
          --bg-hover:    #21262d;
          --border:      #30363d;
          --text-1:      #e6edf3;
          --text-2:      #8b949e;
          --text-3:      #484f58;
          --accent:      #58a6ff;
          --accent-bg:   rgba(56,139,253,0.12);
          --success:     #3fb950;
          --warning:     #d29922;
          --danger:      #f85149;
          --purple:      #d2a8ff;
          --purple-bg:   rgba(137,87,229,0.10);
          --blue-bg:     rgba(31,111,235,0.10);
          --gold-bg:     rgba(210,153,34,0.10);
          --radius:      8px;
          --font:        'Segoe UI', -apple-system, BlinkMacSystemFont,
                         'Helvetica Neue', Arial, sans-serif;
          --mono:        'SFMono-Regular', Consolas, 'Liberation Mono',
                         Menlo, monospace;
        }

        /* ── Reset ─────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-size: 15px; }
        body {
          font-family: var(--font);
          background: var(--bg-base);
          color: var(--text-1);
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          padding: 0;
        }

        /* ── Header ────────────────────────────────── */
        .header {
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border);
          padding: 16px 28px;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .header h1 {
          font-size: 1.2rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .header h1 svg { flex-shrink: 0; color: var(--accent); }
        .header-meta {
          margin-top: 6px;
          font-size: 0.8rem;
          color: var(--text-3);
        }
        .header-meta span + span::before {
          content: ' · ';
        }

        /* ── Main ──────────────────────────────────── */
        .main {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px 28px 60px;
        }

        /* ── Summary bar ───────────────────────────── */
        .summary {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .summary-chip {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          color: var(--text-2);
        }
        .summary-chip b { color: var(--text-1); margin-right: 4px; }

        /* ── Contact card ──────────────────────────── */
        .card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          margin-bottom: 16px;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .card:hover {
          border-color: #484f58;
        }
        .card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-elevated);
        }
        .card-name {
          font-size: 1.05rem;
          font-weight: 600;
        }
        .card-id {
          font-family: var(--mono);
          font-size: 0.72rem;
          color: var(--text-3);
          margin-top: 2px;
        }
        .badge {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 3px 10px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .badge-site     { background: var(--accent-bg);  color: var(--accent); }
        .badge-mobile   { background: rgba(63,185,80,0.15); color: var(--success); }
        .badge-aircraft { background: var(--gold-bg);  color: var(--warning); }

        .card-body { padding: 16px 18px; }
        .card-meta {
          font-size: 0.82rem;
          color: var(--text-2);
          margin-bottom: 12px;
        }
        .card-meta span + span::before { content: ' · '; color: var(--text-3); }
        .card-notes {
          font-size: 0.82rem;
          color: var(--text-3);
          font-style: italic;
          margin-bottom: 14px;
          padding: 8px 12px;
          border-left: 3px solid var(--border);
          background: var(--bg-base);
          border-radius: 0 var(--radius) var(--radius) 0;
        }

        /* ── Service sections ──────────────────────── */
        .service-section {
          margin-bottom: 14px;
        }
        .service-section:last-child { margin-bottom: 0; }
        .service-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .service-title .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .dot-voip   { background: #8957e5; }
        .dot-xmpp   { background: #1f6feb; }
        .dot-custom  { background: #d29922; }

        /* ── Data table ────────────────────────────── */
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }
        .data-table th {
          text-align: left;
          font-weight: 500;
          color: var(--text-3);
          padding: 4px 12px 4px 0;
          white-space: nowrap;
          width: 120px;
          vertical-align: top;
        }
        .data-table td {
          padding: 4px 0;
          font-family: var(--mono);
          font-size: 0.8rem;
          color: var(--text-2);
          word-break: break-all;
        }

        /* ── Custom services list ──────────────────── */
        .custom-svc {
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 8px;
        }
        .custom-svc:last-child { margin-bottom: 0; }
        .custom-svc-name {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--warning);
          margin-bottom: 4px;
        }
        .custom-svc-detail {
          font-family: var(--mono);
          font-size: 0.78rem;
          color: var(--text-2);
        }
        .custom-svc-desc {
          font-size: 0.78rem;
          color: var(--text-3);
          margin-top: 4px;
          font-style: italic;
        }

        /* ── Timestamps footer ─────────────────────── */
        .card-timestamps {
          padding: 8px 18px;
          border-top: 1px solid var(--border);
          font-size: 0.72rem;
          color: var(--text-3);
          display: flex;
          gap: 16px;
        }

        /* ── Schema link ───────────────────────────── */
        .schema-ref {
          text-align: center;
          font-size: 0.75rem;
          color: var(--text-3);
          padding: 20px 0 0;
          border-top: 1px solid var(--border);
          margin-top: 24px;
        }
        .schema-ref a {
          color: var(--accent);
          text-decoration: none;
        }
        .schema-ref a:hover { text-decoration: underline; }

        /* ── Responsive ────────────────────────────── */
        @media (max-width: 700px) {
          .header { padding: 12px 16px; }
          .main { padding: 16px; }
          .card-head { flex-direction: column; align-items: flex-start; gap: 8px; }
          .data-table th { width: 90px; }
        }

        /* ── Print ─────────────────────────────────── */
        @media print {
          body { background: #fff; color: #222; }
          .header { background: #f5f5f5; border-color: #ccc; position: static; }
          .header h1 svg { color: #333; }
          .header-meta { color: #666; }
          .card { border-color: #ccc; break-inside: avoid; }
          .card-head { background: #f9f9f9; border-color: #ccc; }
          .card-notes { background: #f5f5f5; border-color: #ccc; }
          .data-table th { color: #666; }
          .data-table td { color: #333; }
          .badge-site     { background: #e8f0fe; color: #1a73e8; }
          .badge-mobile   { background: #e6f4ea; color: #137333; }
          .badge-aircraft { background: #fef7e0; color: #b06000; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" width="24" height="24">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          Enterprise Contact Directory
        </h1>
        <div class="header-meta">
          <span>
            Exported: <xsl:value-of select="/EnterpriseContactDirectory/@exported"/>
          </span>
          <span>
            Schema v<xsl:value-of select="/EnterpriseContactDirectory/@version"/>
          </span>
          <span>
            <xsl:value-of select="count(/EnterpriseContactDirectory/Contact)"/> contacts
          </span>
        </div>
      </div>

      <div class="main">
        <!-- Summary chips -->
        <div class="summary">
          <div class="summary-chip">
            <b><xsl:value-of select="count(/EnterpriseContactDirectory/Contact[@platform='site'])"/></b> Site
          </div>
          <div class="summary-chip">
            <b><xsl:value-of select="count(/EnterpriseContactDirectory/Contact[@platform='mobile'])"/></b> Mobile
          </div>
          <div class="summary-chip">
            <b><xsl:value-of select="count(/EnterpriseContactDirectory/Contact[@platform='aircraft'])"/></b> Aircraft
          </div>
          <div class="summary-chip">
            <b><xsl:value-of select="count(/EnterpriseContactDirectory/Contact/VoIP)"/></b> VoIP
          </div>
          <div class="summary-chip">
            <b><xsl:value-of select="count(/EnterpriseContactDirectory/Contact/XMPP)"/></b> XMPP
          </div>
          <div class="summary-chip">
            <b><xsl:value-of select="count(/EnterpriseContactDirectory/Contact/CustomServices/Service)"/></b> Custom Services
          </div>
        </div>

        <!-- Contact cards -->
        <xsl:apply-templates select="/EnterpriseContactDirectory/Contact"/>

        <div class="schema-ref">
          Schema: <a href="enterprise-contact-directory.xsd">enterprise-contact-directory.xsd</a>
          &#160;|&#160;
          Application: <a href="index.html">Enterprise Contact Directory Web App</a>
        </div>
      </div>
    </body>
    </html>
  </xsl:template>

  <!-- ============================================================
       Contact template
       ============================================================ -->
  <xsl:template match="Contact">
    <div class="card">
      <!-- Card header -->
      <div class="card-head">
        <div>
          <div class="card-name"><xsl:value-of select="Name"/></div>
          <div class="card-id">ID: <xsl:value-of select="@id"/></div>
        </div>
        <span>
          <xsl:attribute name="class">badge badge-<xsl:value-of select="@platform"/></xsl:attribute>
          <xsl:value-of select="@platform"/>
        </span>
      </div>

      <!-- Card body -->
      <div class="card-body">
        <!-- Meta line -->
        <xsl:if test="Location or Department">
          <div class="card-meta">
            <xsl:if test="Location"><span><xsl:value-of select="Location"/></span></xsl:if>
            <xsl:if test="Department"><span><xsl:value-of select="Department"/></span></xsl:if>
          </div>
        </xsl:if>

        <!-- Notes -->
        <xsl:if test="Notes and Notes != ''">
          <div class="card-notes"><xsl:value-of select="Notes"/></div>
        </xsl:if>

        <!-- VoIP section -->
        <xsl:if test="VoIP">
          <div class="service-section">
            <div class="service-title">
              <span class="dot dot-voip"></span> VoIP Configuration
            </div>
            <table class="data-table">
              <tr><th>IP Address</th><td><xsl:value-of select="VoIP/IP"/></td></tr>
              <tr><th>Port</th><td><xsl:value-of select="VoIP/Port"/></td></tr>
              <xsl:if test="VoIP/Extension and VoIP/Extension != ''">
                <tr><th>Extension</th><td><xsl:value-of select="VoIP/Extension"/></td></tr>
              </xsl:if>
              <xsl:if test="VoIP/Codec and VoIP/Codec != ''">
                <tr><th>Codec</th><td><xsl:value-of select="VoIP/Codec"/></td></tr>
              </xsl:if>
              <tr><th>Protocol</th><td><xsl:value-of select="VoIP/Protocol"/></td></tr>
              <tr><th>Transport</th><td><xsl:value-of select="VoIP/Transport"/></td></tr>
            </table>
          </div>
        </xsl:if>

        <!-- XMPP section -->
        <xsl:if test="XMPP">
          <div class="service-section">
            <div class="service-title">
              <span class="dot dot-xmpp"></span> XMPP Chat Configuration
            </div>
            <table class="data-table">
              <tr><th>JID</th><td><xsl:value-of select="XMPP/JID"/></td></tr>
              <xsl:if test="XMPP/Server and XMPP/Server != ''">
                <tr><th>Server</th><td><xsl:value-of select="XMPP/Server"/></td></tr>
              </xsl:if>
              <xsl:if test="XMPP/IP and XMPP/IP != ''">
                <tr><th>Server IP</th><td><xsl:value-of select="XMPP/IP"/></td></tr>
              </xsl:if>
              <tr><th>Port</th><td><xsl:value-of select="XMPP/Port"/></td></tr>
              <tr><th>Encryption</th><td><xsl:value-of select="XMPP/Encryption"/></td></tr>
              <xsl:if test="XMPP/Conference and XMPP/Conference != ''">
                <tr><th>Conference</th><td><xsl:value-of select="XMPP/Conference"/></td></tr>
              </xsl:if>
            </table>
          </div>
        </xsl:if>

        <!-- Custom services section -->
        <xsl:if test="CustomServices/Service">
          <div class="service-section">
            <div class="service-title">
              <span class="dot dot-custom"></span> Custom Services
            </div>
            <xsl:for-each select="CustomServices/Service">
              <div class="custom-svc">
                <div class="custom-svc-name"><xsl:value-of select="ServiceName"/></div>
                <div class="custom-svc-detail">
                  <xsl:if test="IP and IP != ''">
                    <xsl:value-of select="IP"/>
                  </xsl:if>
                  <xsl:if test="Port and Port != ''">
                    :<xsl:value-of select="Port"/>
                  </xsl:if>
                </div>
                <xsl:if test="Description and Description != ''">
                  <div class="custom-svc-desc"><xsl:value-of select="Description"/></div>
                </xsl:if>
              </div>
            </xsl:for-each>
          </div>
        </xsl:if>
      </div>

      <!-- Timestamps footer -->
      <xsl:if test="CreatedAt or UpdatedAt">
        <div class="card-timestamps">
          <xsl:if test="CreatedAt">
            <span>Created: <xsl:value-of select="CreatedAt"/></span>
          </xsl:if>
          <xsl:if test="UpdatedAt">
            <span>Updated: <xsl:value-of select="UpdatedAt"/></span>
          </xsl:if>
        </div>
      </xsl:if>
    </div>
  </xsl:template>

</xsl:stylesheet>
