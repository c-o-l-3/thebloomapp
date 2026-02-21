/**
 * Default Journey Generator
 * Auto-generates starter journeys for new clients
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { KnowledgeHub } from './knowledge-hub.js';
import airtableService from './airtable.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');

export class JourneyGenerator {
  constructor(clientSlug) {
    this.clientSlug = clientSlug;
    this.clientDir = path.join(repoRoot, 'clients', clientSlug);
    this.hub = new KnowledgeHub(clientSlug);
  }

  /**
   * Generate a unique ID
   */
  generateId(prefix) {
    return `${prefix}_${uuidv4().split('-')[0]}`;
  }

  /**
   * Get facts from Knowledge Hub
   */
  async getRelevantFacts(category = null) {
    try {
      const facts = await this.hub.getFacts(category);
      return facts.filter(f => f.confidence >= 0.7);
    } catch (error) {
      logger.warn('Failed to get facts from Knowledge Hub', { error: error.message });
      return [];
    }
  }

  /**
   * Get brand voice profile
   */
  async getBrandVoice() {
    try {
      return await this.hub.getBrandVoice();
    } catch (error) {
      logger.warn('Failed to get brand voice', { error: error.message });
      return null;
    }
  }

  /**
   * Get location config
   */
  async getLocationConfig() {
    try {
      const configPath = path.join(this.clientDir, 'location-config.json');
      const content = await fs.readFile(configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      logger.warn('Failed to get location config', { error: error.message });
      return {};
    }
  }

  /**
   * Build journey context from facts and config
   */
  async buildJourneyContext() {
    const [facts, brandVoice, config] = await Promise.all([
      this.getRelevantFacts(),
      this.getBrandVoice(),
      this.getLocationConfig()
    ]);

    // Group facts by category
    const factsByCategory = facts.reduce((acc, fact) => {
      if (!acc[fact.category]) acc[fact.category] = [];
      acc[fact.category].push(fact);
      return acc;
    }, {});

    return {
      companyName: config.name || '{{company_name}}',
      website: config.contact?.website || '',
      email: config.contact?.email || '',
      phone: config.contact?.phone || '',
      address: config.address || {},
      timezone: config.timezone || 'America/New_York',
      facts: factsByCategory,
      brandVoice: brandVoice || {
        voice: {
          adjectives: ['warm', 'professional', 'elegant'],
          personality: 'An elegant but approachable host',
          do: ['Use warm, inviting language'],
          dont: ['Use pushy sales language']
        }
      },
      keyFacts: {
        capacity: this.findFact(facts, 'capacity', 'guest-capacity'),
        pricing: this.findFact(facts, 'pricing', 'price-range'),
        location: this.findFact(facts, 'venue-details', 'location'),
        amenities: facts.filter(f => f.category === 'amenities').slice(0, 3)
      }
    };
  }

  /**
   * Find a specific fact
   */
  findFact(facts, category, subcategory = null) {
    return facts.find(f => 
      f.category === category && 
      (!subcategory || f.subcategory === subcategory)
    );
  }

  /**
   * Generate welcome series journey
   */
  async generateWelcomeSeries(context) {
    const journeyId = this.generateId('journey');
    const { companyName, keyFacts, brandVoice } = context;

    const capacity = keyFacts.capacity?.value || '{{capacity}}';
    const location = keyFacts.location?.value || '{{location}}';

    return {
      id: journeyId,
      name: 'Welcome Series',
      description: `5-email welcome series for new ${companyName} inquiries`,
      category: 'nurture',
      status: 'Draft',
      client: this.clientSlug,
      touchpoints: [
        {
          id: this.generateId('tp'),
          name: 'Welcome - Immediate',
          type: 'Email',
          order: 1,
          delay: 0,
          delayUnit: 'hours',
          content: this.generateEmailContent('welcome', {
            subject: `Welcome to ${companyName}!`,
            greeting: `Hi {{contact.first_name}},`,
            body: `Welcome to ${companyName}! We're thrilled you're considering us for your special day.

${location ? `Located in ${location},` : 'Our venue'} offers a stunning setting for weddings of up to ${capacity} guests.

What makes us special:
${keyFacts.amenities.map(a => `- ${a.statement}`).join('\n') || '- Elegant ceremony and reception spaces\n- Dedicated coordination team\n- Flexible catering options'}

Ready to see it in person? I'd love to show you around.

Best regards,
The ${companyName} Team`,
            cta: 'Book a Tour',
            ctaUrl: '{{tour_booking_link}}'
          })
        },
        {
          id: this.generateId('tp'),
          name: 'What to Look For - Day 2',
          type: 'Email',
          order: 2,
          delay: 2,
          delayUnit: 'days',
          content: this.generateEmailContent('what_to_look_for', {
            subject: 'What to look for in your venue tour',
            greeting: `Hi {{contact.first_name}},`,
            body: `As you plan your venue tours, here are a few things to consider:

✓ Flow between ceremony and reception spaces
✓ Natural lighting for photography
✓ Weather contingency plans
✓ Vendor flexibility

When you visit ${companyName}, we'll walk through all of these together.

Questions before your tour? Just reply to this email.

Warmly,
The ${companyName} Team`,
            cta: 'Schedule Your Tour',
            ctaUrl: '{{tour_booking_link}}'
          })
        },
        {
          id: this.generateId('tp'),
          name: 'Love Stories - Day 4',
          type: 'Email',
          order: 3,
          delay: 4,
          delayUnit: 'days',
          content: this.generateEmailContent('stories', {
            subject: 'A recent love story at ' + companyName,
            greeting: `Hi {{contact.first_name}},`,
            body: `I wanted to share a recent wedding that might inspire you...

Sarah and Michael celebrated with us last spring. Their vision was an intimate garden ceremony followed by a lively reception under the stars.

"${companyName} exceeded every expectation. The team thought of details we hadn't even considered," Sarah shared.

Every couple's story is unique. We'd love to help write yours.

Warmly,
The ${companyName} Team`,
            cta: 'See More Stories',
            ctaUrl: '{{gallery_link}}'
          })
        },
        {
          id: this.generateId('tp'),
          name: 'Vision Planning - Day 7',
          type: 'Email',
          order: 4,
          delay: 7,
          delayUnit: 'days',
          content: this.generateEmailContent('vision', {
            subject: "Let's bring your vision to life",
            greeting: `Hi {{contact.first_name}},`,
            body: `Planning a wedding involves countless decisions, but it all starts with your vision.

At ${companyName}, we specialize in:
- Intimate ceremonies (20-50 guests)
- Grand celebrations (up to ${capacity} guests)
- Customizable spaces that reflect your style

Whether you're dreaming of rustic elegance or modern sophistication, our flexible venue adapts to your vision.

Let's talk about what matters most to you.

Best,
The ${companyName} Team`,
            cta: 'Book a Consultation',
            ctaUrl: '{{tour_booking_link}}'
          })
        },
        {
          id: this.generateId('tp'),
          name: 'Closing - Day 14',
          type: 'Email',
          order: 5,
          delay: 14,
          delayUnit: 'days',
          content: this.generateEmailContent('close', {
            subject: 'One week left for special pricing',
            greeting: `Hi {{contact.first_name}},`,
            body: `I hope your wedding planning is going smoothly!

I wanted to reach out one more time about ${companyName}. We're currently booking ${new Date().getFullYear() + 1} dates, and prime weekends are filling quickly.

If you're still considering us, I'd love to:
- Answer any remaining questions
- Schedule a personalized tour
- Discuss available dates and packages

No pressure either way—just want to make sure you have everything you need.

Warmly,
The ${companyName} Team

P.S. Reply to this email or call us at ${context.phone || '{{phone}}'}`,
            cta: 'Get in Touch',
            ctaUrl: 'mailto:' + (context.email || '{{email}}')
          })
        }
      ]
    };
  }

  /**
   * Generate inquiry follow-up journey
   */
  async generateInquiryFollowUp(context) {
    const journeyId = this.generateId('journey');
    const { companyName } = context;

    return {
      id: journeyId,
      name: 'Inquiry Follow-Up',
      description: '3-touchpoint follow-up for new inquiries',
      category: 'follow-up',
      status: 'Draft',
      client: this.clientSlug,
      touchpoints: [
        {
          id: this.generateId('tp'),
          name: 'SMS Welcome - 10 min',
          type: 'SMS',
          order: 1,
          delay: 0,
          delayUnit: 'hours',
          content: `Hi {{contact.first_name}}! Thanks for your interest in ${companyName}. Ready to see our venue? Book your tour here: {{tour_booking_link}} - Reply STOP to opt out`
        },
        {
          id: this.generateId('tp'),
          name: 'Email Details - 1 hour',
          type: 'Email',
          order: 2,
          delay: 1,
          delayUnit: 'hours',
          content: this.generateEmailContent('inquiry_response', {
            subject: `Thanks for reaching out to ${companyName}`,
            greeting: `Hi {{contact.first_name}},`,
            body: `Thank you for your inquiry about ${companyName}! I've received your message and will personally review your wedding vision.

Here's what happens next:
1. I'll review your details (within 24 hours)
2. I'll send available dates that match your preferences
3. We'll schedule your private tour

In the meantime, browse our gallery for inspiration: {{gallery_link}}

Excited to connect soon!

Best,
The ${companyName} Team`,
            cta: 'View Our Gallery',
            ctaUrl: '{{gallery_link}}'
          })
        },
        {
          id: this.generateId('tp'),
          name: 'SMS Barrier Removal - 3 days',
          type: 'SMS',
          order: 3,
          delay: 3,
          delayUnit: 'days',
          content: `Hi {{contact.first_name}}! Quick question - what's the #1 thing you're looking for in a venue? I might have some helpful info for you. - ${companyName} Team`
        }
      ]
    };
  }

  /**
   * Generate tour confirmation journey
   */
  async generateTourConfirmation(context) {
    const journeyId = this.generateId('journey');
    const { companyName, address } = context;

    const location = address.city && address.state 
      ? `${address.city}, ${address.state}` 
      : '{{location}}';

    return {
      id: journeyId,
      name: 'Tour Confirmation',
      description: '2-touchpoint tour confirmation and reminder',
      category: 'confirmation',
      status: 'Draft',
      client: this.clientSlug,
      touchpoints: [
        {
          id: this.generateId('tp'),
          name: 'Confirmation Email',
          type: 'Email',
          order: 1,
          delay: 0,
          delayUnit: 'hours',
          content: this.generateEmailContent('tour_confirmation', {
            subject: `Your ${companyName} Tour is Confirmed!`,
            greeting: `Hi {{contact.first_name}},`,
            body: `Great news! Your tour of ${companyName} is confirmed.

📅 Date: {{appointment.date}}
🕐 Time: {{appointment.time}}
📍 Location: ${location}

What to expect:
- 45-60 minute personalized tour
- See ceremony and reception spaces
- Discuss your vision and date preferences
- Review package options
- Get all your questions answered

What to bring:
- Your vision board or inspiration photos
- Rough guest count
- Any must-have questions

Can't make it? Reschedule here: {{manage_tour_link}}

Looking forward to meeting you!

Best,
The ${companyName} Team`,
            cta: 'Add to Calendar',
            ctaUrl: '{{calendar_link}}'
          })
        },
        {
          id: this.generateId('tp'),
          name: 'SMS Reminder - 24h',
          type: 'SMS',
          order: 2,
          delay: 24,
          delayUnit: 'hours',
          content: `Hi {{contact.first_name}}! Reminder: Your tour at ${companyName} is tomorrow at {{appointment.time}}. See you soon! Questions? Call us at {{phone}}`
        }
      ]
    };
  }

  /**
   * Generate proposal nurture journey
   */
  async generateProposalNurture(context) {
    const journeyId = this.generateId('journey');
    const { companyName } = context;

    return {
      id: journeyId,
      name: 'Proposal Nurture',
      description: '4-touchpoint nurture sequence after proposal sent',
      category: 'nurture',
      status: 'Draft',
      client: this.clientSlug,
      touchpoints: [
        {
          id: this.generateId('tp'),
          name: 'Proposal Follow-Up - Day 3',
          type: 'Email',
          order: 1,
          delay: 3,
          delayUnit: 'days',
          content: this.generateEmailContent('proposal_followup', {
            subject: 'Questions about your proposal?',
            greeting: `Hi {{contact.first_name}},`,
            body: `I hope you've had a chance to review the personalized proposal I sent over.

I know choosing your venue is a big decision, and I'm here to help with:
- Package customization options
- Date availability updates
- Vendor recommendations
- Payment plan details

Have questions? Just reply to this email or give me a call.

Best,
The ${companyName} Team`,
            cta: 'Schedule a Call',
            ctaUrl: '{{calendar_link}}'
          })
        },
        {
          id: this.generateId('tp'),
          name: 'Social Proof - Day 7',
          type: 'Email',
          order: 2,
          delay: 7,
          delayUnit: 'days',
          content: this.generateEmailContent('social_proof', {
            subject: 'What couples say about ' + companyName,
            greeting: `Hi {{contact.first_name}},`,
            body: `As you consider your options, I thought you'd appreciate hearing from recent couples who celebrated with us:

"The team went above and beyond. Our wedding was absolutely perfect!" - Jennifer & David

"Best decision we made! The venue was stunning and the service impeccable." - Amanda & Chris

"Our guests are still talking about how beautiful everything was." - Michelle & James

We'd love to add your story to our collection of happy memories.

Warmly,
The ${companyName} Team`,
            cta: 'Read More Reviews',
            ctaUrl: '{{reviews_link}}'
          })
        },
        {
          id: this.generateId('tp'),
          name: 'Urgency - Day 10',
          type: 'Email',
          order: 3,
          delay: 10,
          delayUnit: 'days',
          content: this.generateEmailContent('urgency', {
            subject: 'Your date is still available (for now)',
            greeting: `Hi {{contact.first_name}},`,
            body: `I wanted to give you a quick update on your preferred wedding date ({{wedding_date}}).

Currently, it's still available, but I've had several inquiries for that weekend recently.

To secure your date:
1. Sign your proposal
2. Submit the deposit
3. We'll send your official booking confirmation

I'd hate for you to miss out on your perfect date. Let me know if you have any questions!

Best,
The ${companyName} Team`,
            cta: 'Secure Your Date',
            ctaUrl: '{{proposal_link}}'
          })
        },
        {
          id: this.generateId('tp'),
          name: 'Final Follow-Up - Day 14',
          type: 'Email',
          order: 4,
          delay: 14,
          delayUnit: 'days',
          content: this.generateEmailContent('final_followup', {
            subject: 'One final question...',
            greeting: `Hi {{contact.first_name}},`,
            body: `I haven't heard back about your proposal, so I wanted to check in one last time.

I completely understand if:
- You've chosen another venue (congrats!)
- Your plans have changed
- You need more time to decide

If ${companyName} is still in the running, I'm happy to:
- Adjust the proposal
- Schedule another tour
- Answer any remaining questions

Just reply and let me know where you stand—no pressure either way!

Wishing you all the best,
The ${companyName} Team`,
            cta: 'Get in Touch',
            ctaUrl: 'mailto:{{email}}'
          })
        }
      ]
    };
  }

  /**
   * Generate post-booking series
   */
  async generatePostBooking(context) {
    const journeyId = this.generateId('journey');
    const { companyName } = context;

    return {
      id: journeyId,
      name: 'Post-Booking Welcome',
      description: '3-touchpoint welcome series for booked couples',
      category: 'onboarding',
      status: 'Draft',
      client: this.clientSlug,
      touchpoints: [
        {
          id: this.generateId('tp'),
          name: 'Welcome to the Family!',
          type: 'Email',
          order: 1,
          delay: 0,
          delayUnit: 'hours',
          content: this.generateEmailContent('booking_welcome', {
            subject: `🎉 Welcome to the ${companyName} Family!`,
            greeting: `Hi {{contact.first_name}},`,
            body: `Congratulations! We're absolutely thrilled that you've chosen ${companyName} for your wedding day.

Your date is officially reserved:
📅 {{wedding_date}}
👥 {{guest_count}} guests
💍 {{ceremony_type}}

What happens next:
1. You'll receive your detailed planning timeline within 48 hours
2. Your dedicated coordinator will reach out within one week
3. We'll schedule your planning kickoff meeting for 6 months before your date

In the meantime, join our exclusive Facebook group for ${companyName} couples: {{facebook_group}}

Welcome to the family!

With excitement,
The ${companyName} Team`,
            cta: 'Join Couples Group',
            ctaUrl: '{{facebook_group}}'
          })
        },
        {
          id: this.generateId('tp'),
          name: 'Planning Timeline - 48h',
          type: 'Email',
          order: 2,
          delay: 2,
          delayUnit: 'days',
          content: this.generateEmailContent('planning_timeline', {
            subject: 'Your wedding planning timeline',
            greeting: `Hi {{contact.first_name}},`,
            body: `Now that your date is secured, here's what to expect over the coming months:

12 Months Before:
☑ Venue booked (that's us!) ✓
☐ Finalize guest list
☐ Choose wedding party

9 Months Before:
☐ Book photographer & videographer
☐ Book caterer (if external)
☐ Order save-the-dates

6 Months Before:
☐ Final menu tasting
☐ Rehearsal walkthrough
☐ Finalize décor details

Don't worry—we'll send you timely reminders for each milestone.

Questions? Your coordinator is here to help!

Best,
The ${companyName} Team`,
            cta: 'Download Full Timeline',
            ctaUrl: '{{timeline_pdf}}'
          })
        },
        {
          id: this.generateId('tp'),
          name: 'Vendor Recommendations - 1 week',
          type: 'Email',
          order: 3,
          delay: 7,
          delayUnit: 'days',
          content: this.generateEmailContent('vendor_recommendations', {
            subject: 'Our favorite vendor partners',
            greeting: `Hi {{contact.first_name}},`,
            body: `Over the years, we've worked with some amazing vendors who consistently deliver exceptional experiences for our couples.

Our top recommendations:

📸 Photography: {{photographer_recommendations}}
🎥 Videography: {{videographer_recommendations}}
💐 Florals: {{florist_recommendations}}
🎵 Entertainment: {{dj_recommendations}}
🎂 Cake: {{bakery_recommendations}}

These vendors know our venue well and will help make your day seamless.

Want introductions? Just let us know!

Best,
The ${companyName} Team`,
            cta: 'View All Vendors',
            ctaUrl: '{{vendors_page}}'
          })
        }
      ]
    };
  }

  /**
   * Generate email content template
   */
  generateEmailContent(type, data) {
    return {
      type: 'email',
      subject: data.subject,
      greeting: data.greeting,
      body: data.body,
      cta: {
        text: data.cta,
        url: data.ctaUrl
      },
      templateType: type,
      compliance: {
        unsubscribeRequired: true,
        physicalAddressRequired: true,
        companyNameRequired: true
      }
    };
  }

  /**
   * Generate all default journeys
   */
  async generateAllJourneys() {
    logger.info(`Generating default journeys for ${this.clientSlug}`);

    const context = await this.buildJourneyContext();
    
    const journeys = [
      await this.generateWelcomeSeries(context),
      await this.generateInquiryFollowUp(context),
      await this.generateTourConfirmation(context),
      await this.generateProposalNurture(context),
      await this.generatePostBooking(context)
    ];

    const summary = {
      journeysCreated: journeys.length,
      totalTouchpoints: journeys.reduce((sum, j) => sum + j.touchpoints.length, 0),
      byType: journeys.reduce((acc, j) => {
        acc[j.category] = (acc[j.category] || 0) + 1;
        return acc;
      }, {}),
      journeys: journeys.map(j => ({
        id: j.id,
        name: j.name,
        touchpointCount: j.touchpoints.length
      }))
    };

    logger.success(`Generated ${summary.journeysCreated} journeys with ${summary.totalTouchpoints} touchpoints`);

    return { journeys, summary };
  }

  /**
   * Save journeys to local files
   */
  async saveJourneysToFiles(journeys) {
    const journeysDir = path.join(this.clientDir, 'journeys');
    await fs.mkdir(journeysDir, { recursive: true });

    const savedFiles = [];

    for (const journey of journeys) {
      const filename = `${journey.id}.json`;
      const filePath = path.join(journeysDir, filename);
      await fs.writeFile(filePath, JSON.stringify(journey, null, 2) + '\n', 'utf8');
      savedFiles.push(filePath);
      logger.debug(`Saved journey: ${filePath}`);
    }

    // Save summary
    const summaryPath = path.join(journeysDir, 'generated-journeys.json');
    await fs.writeFile(summaryPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      client: this.clientSlug,
      journeys: journeys.map(j => ({
        id: j.id,
        name: j.name,
        category: j.category,
        touchpointCount: j.touchpoints.length
      }))
    }, null, 2) + '\n', 'utf8');

    return savedFiles;
  }

  /**
   * Create journeys in Airtable
   */
  async createJourneysInAirtable(journeys) {
    logger.info('Creating journeys in Airtable...');

    await airtableService.connect();

    const createdJourneys = [];
    const createdTouchpoints = [];

    for (const journey of journeys) {
      try {
        // Create journey record
        const journeyRecord = await airtableService.base('Journeys').create({
          Name: journey.name,
          Description: journey.description,
          Category: journey.category,
          Status: journey.status,
          Client: journey.client,
          'Generated By': 'onboarding-wizard'
        });

        createdJourneys.push({
          id: journeyRecord.id,
          name: journey.name
        });

        logger.success(`Created journey in Airtable: ${journey.name} (${journeyRecord.id})`);

        // Create touchpoint records
        for (const tp of journey.touchpoints) {
          const tpRecord = await airtableService.base('Touchpoints').create({
            Name: tp.name,
            Journey: [journeyRecord.id],
            Type: tp.type,
            Order: tp.order,
            Delay: tp.delay,
            'Delay Unit': tp.delayUnit,
            Content: typeof tp.content === 'string' ? tp.content : JSON.stringify(tp.content),
            Status: 'Draft'
          });

          createdTouchpoints.push({
            id: tpRecord.id,
            name: tp.name,
            journeyId: journeyRecord.id
          });

          logger.debug(`Created touchpoint: ${tp.name}`);
        }

      } catch (error) {
        logger.error(`Failed to create journey in Airtable: ${journey.name}`, { error: error.message });
      }
    }

    return {
      journeys: createdJourneys,
      touchpoints: createdTouchpoints
    };
  }

  /**
   * Run full journey generation
   */
  async run(options = {}) {
    logger.info(`Running journey generation for ${this.clientSlug}`);

    // Generate journeys
    const { journeys, summary } = await this.generateAllJourneys();

    // Save to files
    const savedFiles = await this.saveJourneysToFiles(journeys);

    // Create in Airtable if requested
    let airtableResults = null;
    if (options.createInAirtable) {
      airtableResults = await this.createJourneysInAirtable(journeys);
    }

    return {
      success: true,
      summary,
      savedFiles,
      airtable: airtableResults
    };
  }
}

export default JourneyGenerator;
