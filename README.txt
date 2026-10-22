ZERO X — V8 CITY BRANCH INTEREST & LEAD TRACKING

Built as an extension of the supplied V6 project. Existing course names/prices,
registration, login, payment-order flow, consultation flow, copy-trading page,
student dashboard, and Node.js backend files are retained.

V7 additions retained:
- New services.html page consolidating existing and proposed educational services.
- New academies.html page showing the current education offer and future expansion placeholder.
- Homepage preview sections for services and academy expansion.
- Updated desktop/mobile navigation and footer links.
- Added responsive styles for service and academy cards.
- Existing future-expansion section and service status labels are retained.
- Podcast is labelled as in preparation, not as an active service.

V8 additions:
- The two planned city locations are now Damascus and Latakia. Both are clearly marked as in preparation; no street address or opening date is fabricated.
- Public interest form supports city preference, service interest, contact method, and optional note.
- Leads are stored in the backend JSON database and visible to authorized admins only.
- Admin panel includes lead follow-up status changes.
- Basic server validation, required consent, honeypot field, and simple submission throttling are included.
- Fixed request body parsing so existing POST endpoints pass the request object to readBody().

Run locally:
  node server.js
Then open:
  http://localhost:3000

Existing current course pricing retained in the supplied project:
- Basics: $60
- Regular Volume: $160
- Advanced Volume: $400
- Modern Advanced Volume: $1000 (locked / not currently available)
- Consultation: $20
- Copy-trading information: see copy.html (review all risk disclosures before publication)

Important pre-launch checks:
- Verify every price, payment address, service term, phone/social/contact link, and claim.
- The student dashboard currently shows course ownership and payment requests; lesson progress/content is not implemented yet.
- The lead form stores personal contact data. Before going live, publish a real privacy notice, limit data access, and use durable database storage; the current JSON-file store and in-memory throttling are a starter implementation, not a scaled production CRM.
- Production launch should include a security and privacy review and durable database/storage before accepting real student data or payment proof.


V9 — Team page
- Open team.html to preview the team page.
- Team portraits are stored in assets/team-alaa.jpg, assets/team-jamal.jpg and assets/team-ahmad.jpg. Yasmin intentionally has no photo.
- See UPGRADE-NOTES-V9.txt for the change summary.


V10 — Updated homepage portrait and team visuals
- The homepage hero and founder/about section now use assets/alaa-home.jpg.
- The homepage team section uses the real photos of Alaa, Ahmad, and Jamal plus a no-photo initials card for Yasmin.
- See UPGRADE-NOTES-V10.txt for details.
