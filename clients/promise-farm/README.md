# Promise Farm - Client Onboarding

**Location ID:** Ys6TV8qbSBcSRdgrPnpv  
**Website:** https://promise-farm.com/  
**Industry:** Wedding Venue  
**Onboarding Date:** February 21, 2026

---

## Overview

Promise Farm is a rustic barn wedding venue located in Lancaster County, Pennsylvania. The venue offers a warm, welcoming atmosphere with flexible vendor policies and affordable pricing.

### Brand Voice Summary
- **Adjectives:** Warm, welcoming, peaceful, down-to-earth, flexible, affordable, natural, unpretentious
- **Personality:** Helpful, approachable neighbor who happens to own a beautiful property
- **Key Messaging:** Beautiful weddings don't require rigid rules or extravagant budgets

---

## Onboarding Summary

### Website Crawl
- **Pages Crawled:** 40
- **Pages Added to Knowledge Hub:** 40
- **Initial Facts Extracted:** 4

### AI Analysis
- **Pages Analyzed for Brand Voice:** 30
- **Additional Facts Extracted:** 30 (25 added, 5 queued for verification)
- **Brand Voice Profile:** Created and saved

### Journeys Created

#### 1. New Leads → Book a Tour (7 touchpoints)
| Touchpoint | Delay | Type | Purpose |
|------------|-------|------|---------|
| Welcome | Immediate | Email | Warm welcome, value overview, CTA to book tour |
| Value Propositions | Day 2 | Email | Why Promise Farm is different - authentic charm, transparent pricing, creative freedom |
| Our Spaces | Day 4 | Email | Showcase ceremony and reception options |
| FAQ | Day 6 | Email | Answer common questions about catering, capacity, weather |
| Social Proof | Day 9 | Email | Testimonials from happy couples |
| Final CTA | Day 12 | Email | Strong call-to-action to book tour |
| Soft Breakup | Day 16 | Email | Final check-in, no pressure |

#### 2. Booked Tours → Tour Reminders (4 touchpoints)
| Touchpoint | Timing | Type | Purpose |
|------------|--------|------|---------|
| Confirmation | Immediate | Email | Confirm date/time, set expectations, what to bring |
| Excitement Builder | 3 days before | Email | Build anticipation, highlight key features |
| Logistics Reminder | 1 day before | Email | Directions, parking, weather, final details |
| Day-Of SMS | 2 hours before | SMS | Final reminder, safety message |

#### Additional Default Journeys (5 journeys, 17 touchpoints)
- Welcome Series (5 touchpoints)
- Inquiry Follow-Up (3 touchpoints)
- Tour Confirmation (2 touchpoints)
- Proposal Nurture (4 touchpoints)
- Post-Booking Welcome (3 touchpoints)

---

## Knowledge Hub Contents

### Golden Pages
40 pages crawled from promise-farm.com including:
- Homepage
- Pricing information
- Venue spaces details
- Blog articles
- FAQ page
- Accommodations information

### Facts Extracted
**Total Facts:** 34 (from initial crawl + AI extraction)

**Categories:**
- Venue details (location, capacity, spaces)
- Amenities (coordinator, bridal suite, climate control)
- Policies (flexible vendor policy, BYO catering welcome)
- Services (day-of coordination, parking attendants)

### Brand Voice Profile
Complete brand voice analysis saved to:
`knowledge-hub/brand-voice/profile.json`

---

## File Structure

```
clients/promise-farm/
├── README.md                           # This file
├── location-config.json                # Client configuration
├── journeys/                           # Generated journey templates
│   ├── generated-journeys.json         # Index of all journeys
│   ├── journey_new-leads-to-tour.json  # Custom: New Leads → Tour
│   ├── journey_tour-reminders.json     # Custom: Tour Reminders
│   └── [5 default journeys...]
└── knowledge-hub/                      # Website data & AI analysis
    ├── config.json
    ├── brand-voice/profile.json
    ├── facts/index.json
    ├── golden-pages/index.json
    └── [other hub directories...]
```

---

## Next Steps for the Writer

1. **Review Brand Voice Profile**
   - Check `knowledge-hub/brand-voice/profile.json`
   - Verify voice adjectives and personality match client expectations
   - Adjust DOs and DON'Ts as needed

2. **Verify Extracted Facts**
   - Review facts in `knowledge-hub/facts/index.json`
   - Mark high-confidence facts as "verified"
   - Add any missing key facts manually

3. **Customize Journey Content**
   - Edit journey touchpoints in the JSON files
   - Add specific pricing details when available
   - Include actual testimonials from the client
   - Update all `{{placeholder}}` variables with real values

4. **Add Missing Information**
   - Phone number
   - Exact address
   - Specific pricing tiers
   - Available dates/seasons
   - Preferred vendor list (if any)

5. **Get Client Approval**
   - Share brand voice profile with client
   - Review journey sequences
   - Confirm messaging tone
   - Approve final templates

6. **Prepare for Deployment**
   - Set up Airtable connection
   - Import journeys to Airtable
   - Configure GHL integration
   - Test workflows end-to-end

---

## Important Notes

- **GHL Integration:** GHL API connection was skipped during onboarding (no API key). Extract location data manually if needed.
- **Airtable Integration:** Airtable API key not configured. Journeys saved locally only.
- **Email Templates:** Need to be customized with actual client information before deployment.
- **Photos:** Consider adding venue photos to email templates for visual impact.

---

## Contact Information

**Client:** Promise Farm  
**Website:** https://promise-farm.com/  
**Location:** Lancaster County, PA  
**GHL Location ID:** Ys6TV8qbSBcSRdgrPnpv

---

*Generated by BloomBuilder Onboarding Wizard - February 21, 2026*