# Cameron Estate Email Conversion — Agent Instructions

You are converting 8 Cameron Estate HTML email files into Unlayer design JSON format.

## Your Task

For each email listed below, you will:
1. Read the HTML source file
2. Extract all copy (subject line, headings, body text, CTAs)
3. Identify which images are used (look for `storage.googleapis.com/msgsndr` URLs)
4. Output a complete Unlayer design JSON file

## Required Reading — Do This First

Read this file for the complete Unlayer JSON schema, Cameron Estate brand rules, and block type definitions:

```
/Users/cole/Dev/TheBloomApp/clients/cameron-estate/email-generation/system-prompt.md
```

Also read the already-completed example to understand the expected output format:

```
/Users/cole/Dev/TheBloomApp/clients/cameron-estate/email-generation/emails/01-welcome-email.json
```

## HTML Source Files

All source files are in:
```
/Users/cole/Dev/TheBloomApp/clients/cameron-estate/email-generation/html-source/
```

## Output Files

Write each completed JSON file to:
```
/Users/cole/Dev/TheBloomApp/clients/cameron-estate/email-generation/emails/
```

Use the naming convention: `NN-email-slug.json`

---

## The 8 Emails

Process them in order. For each one:
- Read the HTML source file
- Generate the Unlayer JSON
- Write the output file
- Move to the next

### Email 01 — Day 1: Welcome
- Source: `Email 1 - Day 1.html`
- Output: `01-welcome-email.json` **(ALREADY DONE — skip this one)**

### Email 02 — Day 2: What to Look For in a Wedding Venue
- Source: `Email 2 Day 2.html`
- Output: `02-what-to-look-for.json`
- Theme: Educate the couple on what actually matters when venue shopping (capacity, all-inclusive vs. a-la-carte, overnight guests, coordinator, etc.). Position Cameron Estate as the venue that checks every box.
- CTA: Schedule a tour

### Email 03 — Day 3: Real Couple Stories
- Source: `Email 3 Day 3.html`
- Output: `03-real-stories.json`
- Theme: Social proof. Share a real couple's experience or testimonial. Emotional, personal tone. Lisa shares why these stories matter to her.
- CTA: Schedule a tour

### Email 04 — Day 5: Your Wedding Vision
- Source: `Email Day 5.html`
- Output: `04-vision.json`
- Theme: Help the couple visualize their day at Cameron Estate. Paint a picture of the ceremony spaces, the reception, waking up on the estate the next morning. Dreamy and aspirational.
- CTA: Schedule a tour

### Email 05 — Day 7: Pinterest vs. Reality
- Source: `Email 7.html`
- Output: `05-pinterest.json`
- Theme: Acknowledge the couple has probably been pinning for months. Help them understand how Cameron Estate brings Pinterest-worthy moments to life without the stress of coordinating vendors.
- CTA: Schedule a tour

### Email 06 — Day 10: Everything Included
- Source: `Email 10.html`
- Output: `06-inclusions.json`
- Theme: Transparent pricing. Walk through everything included in Cameron Estate's all-inclusive package. No hidden fees, no surprises. One price covers ceremony, reception, dinner, open bar, overnight rooms, coordination, setup/breakdown.
- CTA: Schedule a tour

### Email 07 — Day 12: Frequently Asked Questions
- Source: `Email 12.html`
- Output: `07-faq.json`
- Theme: Objection handling. Answer the top questions couples have (capacity, dates, dietary restrictions, outside vendors, payment plans, etc.). Reassuring and practical tone.
- CTA: Schedule a tour

### Email 08 — Day 14: Last Chance
- Source: `Email 14.html`
- Output: `08-last-chance.json`
- Theme: Urgency and warmth. Lisa's final note in the sequence. Acknowledges she knows they're busy. Reminds them dates fill up. Extends a genuine invitation to visit, no pressure. Feels personal, not salesy.
- CTA: Schedule a tour

---

## Conversion Rules

### Extracting Copy from HTML
The source HTML files are compiled MJML — heavily inlined CSS. When reading them:
- Ignore all `<style>` blocks, `<meta>` tags, and HTML boilerplate
- Extract actual text content from `<td>`, `<p>`, `<h1>`, `<h2>`, `<span>`, `<a>` tags
- Preserve GHL merge tags exactly: `{{contact.first_name}}`, `{{links.book_tour}}`, `{{links.unsubscribe}}`
- Copy over any image URLs from `storage.googleapis.com/msgsndr` — these are already hosted
- If the HTML has a subject line in a comment or meta tag, use it; otherwise infer from context

### Building the Unlayer JSON
Follow the standard email structure from the system prompt:
1. Header row (navy bg, logo centered)
2. Opening row (heading + 1-2 paragraphs)
3. Content rows (images, text sections, callout boxes — match the source email's content flow)
4. Warm-tone callout if email has pricing/highlights (tan bg #F5F1EB)
5. CTA row (button to `{{links.book_tour}}`)
6. Signature row (Cormorant Garamond, "Talk soon, Lisa")
7. Footer row (logo, contact info, social links, unsubscribe)

### Image URLs to Use
These are already hosted and ready — use whichever fit the email content:
- Estate exterior: `https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0a7fd1ecad41c546.jpg`
- Spring Garden ceremony: `https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0a7fd1cf9141c545.jpg`
- Reception setup: `https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0708e4880ea07007.jpg`
- Celebration/reception: `https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a38f77a2717eb4653.jpg`
- Logo: `https://cameronestateinn.com/wp-content/uploads/2025/09/Cameron-Estate-Logo.png`

Use whatever other image URLs you find in the source HTML — they are already hosted.

### ID Generation
Every block needs a unique `id`. Use 8-character random alphanumeric strings like `a1b2c3d4`. Do not reuse IDs within a file or across files.

### Output Format
- Write ONLY the JSON object — no markdown fences, no explanation
- The JSON must be valid and parseable
- It must be loadable into Unlayer via `loadDesign()`
- Top-level structure: `{ "body": { "id": "...", "rows": [...], "values": { ... } } }`

---

## Verification

After writing each file, confirm:
- [ ] File is valid JSON (no trailing commas, no unmatched brackets)
- [ ] All text strings use proper HTML tags (`<p>`, `<strong>`, `<a>`, `<br/>`)
- [ ] All GHL merge tags are preserved
- [ ] All IDs are unique within the file
- [ ] File path is correct
