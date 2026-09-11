# HighLevel Account Mapping — Current Authority

Last confirmed: 2026-09-11

## iShare LLC

- Canonical HighLevel Location ID: `BYx4g32AidgEkTBg7nLQ`
- Treat this ID as the authoritative iShare LLC location in integrations, diagnostics, and CRM lookups.
- Do not relabel this ID as another HighLevel account without an explicit owner correction.

## Other HighLevel account

- Location ID `XLKMmX4V4Kju4Xzklda6` belongs to a different HighLevel account.
- It must not be treated as the iShare LLC location.
- Any records or Stripe metadata referencing this location must be investigated under that separate account before CRM merges or identity cleanup.

## Safety rule

Never merge, move, or delete contacts across HighLevel locations based only on matching names or email addresses. Confirm the location ID first.
