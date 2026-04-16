### PCIP — PCI Professional (Payment Card Industry)

**The fintech-specific cert.** PCI Security Standards Council's entry-level cred for PCI DSS knowledge. Essential for payment processors, fintech, any org handling card data.

**Exam logistics:**
- Code: PCIP (current version aligned with PCI DSS v4.0.1)
- Duration: 90 min, 75 questions (multiple choice)
- Passing: 70% (approximate)
- Cost: ~$395 USD (includes training); exam-only option available
- Validity: 3 years (renewal via recert exam aligned with latest PCI DSS version)
- Prerequisite: none; recommended: understanding of PCI DSS + 2 years security experience

**What it validates:**
- Understanding of PCI Data Security Standard (PCI DSS)
- PCI Payment Application DSS (PA-DSS) — retired, replaced by Secure Software Standard
- Related standards: PIN Transaction Security (PTS), Point-to-Point Encryption (P2PE), Tokenization
- Appropriate use of PCI Security Council resources
- Cardholder data environment (CDE) scoping

**The 12 PCI DSS requirements (know all by heart):**

| # | Requirement | Goal |
|---|---|---|
| 1 | Install and maintain network security controls (firewalls) | Segment CDE from untrusted networks |
| 2 | Apply secure configurations to system components | No defaults, hardened configs |
| 3 | Protect stored account data | Encrypt stored CHD, never store SAD post-auth |
| 4 | Protect CHD with strong cryptography during transmission | TLS 1.2+ over public networks |
| 5 | Protect systems from malicious software | Anti-malware, regular updates |
| 6 | Develop and maintain secure systems and software | Secure SDLC, patch management |
| 7 | Restrict access to system components by business need-to-know | Least privilege |
| 8 | Identify users and authenticate access | Unique IDs, MFA for admin + remote |
| 9 | Restrict physical access to cardholder data | Physical security, media handling |
| 10 | Log and monitor all access to system components and CHD | Audit logs, daily review, 1 year retention (3 months online) |
| 11 | Test security of systems and networks regularly | Vuln scans (quarterly), pen tests (annual) |
| 12 | Support information security with organizational policies | Policies, risk assessment, IR plan |

**PCI DSS v4.0 key changes (vs v3.2.1):**
- **Future-dated requirements**: effective March 31, 2025 (extended compliance deadline)
- **Customized approach**: organizations can meet intent through alternative controls with risk analysis (not just prescriptive)
- **Targeted risk analysis** required for certain flexible requirements
- **Multi-factor authentication**: required for ALL access to CDE (not just remote/admin)
- **Phishing-resistant authentication** for critical roles (FIDO2, hardware tokens)
- **Anti-phishing mechanisms** required (DMARC, user training)
- **Automated log review** encouraged (SIEM, UEBA)
- **Stronger password requirements**: 12 characters minimum (up from 7), or NIST-style long passphrases

**Key data types you must distinguish:**
- **CHD (Cardholder Data)** — PAN, cardholder name, expiration date, service code. CAN be stored (encrypted).
- **SAD (Sensitive Authentication Data)** — full track data, CAV2/CVC2/CVV2/CID, PINs/PIN blocks. CANNOT be stored post-authorization.

**PCI scope reduction strategies:**
- Tokenization (replace PAN with token outside CDE)
- P2PE (Point-to-Point Encryption) — CHD encrypted at swipe, decrypted only at payment processor
- Outsourcing to PCI-compliant payment processor (Stripe, Adyen) — dramatically reduces SAQ type

**Self-Assessment Questionnaire (SAQ) types:**
- **SAQ A** — fully outsourced e-commerce (~22 questions, simplest)
- **SAQ A-EP** — e-commerce with JS control (Stripe.js) (~140 questions)
- **SAQ B / B-IP** — standalone POS terminals, dial-up or IP
- **SAQ C / C-VT** — merchants with payment application on internet / virtual terminals
- **SAQ D** — merchants storing/processing/transmitting CHD (~400 questions, most complex)

**PCI compliance validation levels (merchants):**
- **Level 1** — >6M transactions/year → annual on-site audit by QSA (Qualified Security Assessor)
- **Level 2** — 1-6M transactions/year → annual SAQ + attestation
- **Level 3** — 20K-1M e-commerce transactions/year → annual SAQ
- **Level 4** — <20K e-commerce or <1M total → annual SAQ

**Key roles in PCI ecosystem:**
- **QSA** (Qualified Security Assessor) — certified by PCI SSC, performs Level 1 audits, produces RoC (Report on Compliance)
- **ISA** (Internal Security Assessor) — in-house equivalent, for large orgs with internal assessors
- **PCIP** — entry-level knowledge of PCI DSS (this cert)
- **PCI-DSS Auditor** (not a cert but a role filled by QSA/ISA)

**Study path:**
- Official PCI SSC training (includes exam voucher, ~$395)
- PCI DSS v4.0.1 Requirements and Testing Procedures (official document, ~350 pages, free)
- PCI SSC glossary (memorize the acronyms)
- Coalfire / Optiv / Schellman blogs for real-world interpretation
- Practice interpreting requirement numbers (e.g., "3.4.1 refers to..." should be instant)

**Existing memos:**
- `design_patterns/payment_network/pci_dss_scope_reduction_tokenization_encryption_segmentation.md` (directly relevant)
- `design_patterns/payment_network/tokenization_vts_pan_replacement_cryptogram_verification.md`
- `design_patterns/payment_network/multi_currency_cross_border_fx_rates_conversion_settlement.md`
- All `design_patterns/payment_network/` files provide context

**Who it's for:** Fintech engineers, payment processors, security teams at merchants, auditors, anyone whose system touches CHD. Prep time: 30-60 hours if you have security background + payment experience.

**Rule of thumb:** PCIP tests your ability to READ and INTERPRET PCI DSS — it's more like a reading comprehension exam than deep technical. Memorize the 12 requirement categories and their numbering. Know SAQ types and validation levels cold. PCI DSS v4.0.1 is the current version — v3.2.1 questions are no longer on the exam. Combined with CISSP/CCSP, PCIP maps you as a fintech-security specialist (salary premium in banking).
