/**
 * Cameron Estate Email Factory - Complete Email Configurations
 * 
 * All 8 emails for the 14-day nurture sequence
 * Configured to use a pool of ~10 curated assets + links
 * Full marketing content - not abbreviated
 */

// Asset Pool - configured for specific journey touchpoints
// TODO: Replace these placeholders with unique assets from the client
const assetPool = {
  hero: {
    main: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0a7fd1ecad41c546.jpg',      // Day 1
    grounds: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0a7fd1ecad41c546.jpg',   // Day 2
    twilight: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0a7fd1ecad41c546.jpg',  // Day 10
    seasonal: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0a7fd1ecad41c546.jpg',  // Day 12
    sunset: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0a7fd1ecad41c546.jpg'     // Day 14
  },
  ceremony: {
    garden: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0a7fd1cf9141c545.jpg',    // Day 1
    indoor: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0a7fd1cf9141c545.jpg',    // Day 1
    aisle_pov: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0a7fd1cf9141c545.jpg', // Day 5
    emotion: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0a7fd1cf9141c545.jpg'    // Day 3
  },
  reception: {
    ballroom: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0708e4880ea07007.jpg',  // Day 1
    carriage_house: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0708e4880ea07007.jpg', // Day 3
    atmosphere: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0708e4880ea07007.jpg', // Day 5
    cocktail: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0708e4880ea07007.jpg',  // Day 5
    dancing: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a0708e4880ea07007.jpg'    // Day 3
  },
  details: {
    table: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a38f77a2717eb4653.jpg',     // Day 2
    decor: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a38f77a2717eb4653.jpg',     // Day 7
    food: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a38f77a2717eb4653.jpg',      // Day 10
    couple_candid: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a38f77a2717eb4653.jpg', // Day 2
    family: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a38f77a2717eb4653.jpg',    // Day 3
    peace: 'https://storage.googleapis.com/msgsndr/G7APqyfJ6lyi4l28noZj/media/6989327a38f77a2717eb4653.jpg'      // Day 10
  },
  links: {
    book_tour: '{{ links.book_tour }}',
    instagram: 'https://www.instagram.com/cameronestateinn/',
    facebook: 'https://www.facebook.com/CameronEstateInn/',
    pinterest: '{{trigger_link.kI4aVPLShqovAveOSkbk}}',
    website: 'https://cameronestateinn.com',
    pricing: '{{ links.view_pricing }}',
    calendar: '{{ links.calendar }}'
  }
};

// Email configurations
export const emailConfigs = {
  /**
   * DAY 1 - TOUCHPOINT 1A: Initial Welcome Email
   * Send: Immediate (24/7)
   * Tone: Warm, personal, inviting - like a letter from a friend
   * Goal: Make them feel welcomed, introduce the brand aesthetic, invite conversation
   */
  '001_e_day1_welcome': {
    name: '001 E Day 1 - Welcome',
    subject: 'Your wedding story starts here, {{contact.first_name}}',
    previewText: 'A personal note from Lisa at Cameron Estate Inn',
    category: 'welcome',
    gallery: {
      layout: 'none'
    },
    content: `
      <!-- Personal Welcome -->
      <mj-section padding="50px 40px 30px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="0 0 25px" font-family="Cormorant Garamond, Georgia, serif" font-size="36px" color="#2C3E50" font-weight="500" line-height="1.2">
            Hi {{contact.first_name}},
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0" font-size="17px" line-height="1.7">
            I'm Lisa, and I wanted to be the first to welcome you to Cameron Estate. I know you're probably reaching out to a few venues right now (I remember what wedding planning felt like!), so I'll keep this short and sweet.
          </mj-text>
        </mj-column>
      </mj-section>

      <!-- The Story -->
      <mj-section padding="0 40px 30px" background-color="#FDFCFA">
        <mj-column>
          <mj-text css-class="body-text" align="left" padding="0" font-size="17px" line-height="1.7">
            Cameron Estate isn't just a venue — it's a 225-year-old historic inn where your entire wedding weekend unfolds in one beautiful place. Your ceremony, your reception, your closest family and friends staying overnight... all here, surrounded by mature trees, gardens, and the kind of peace that's hard to find these days.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="20px 0 0" font-size="17px" line-height="1.7">
            What couples tell us they love most? Not having to coordinate transportation between venues, not worrying about where guests will stay, and having one experienced team handle everything from your first tour to your last dance.
          </mj-text>
        </mj-column>
      </mj-section>

      <!-- First Image - The Estate -->
      <mj-section padding="0 40px 40px" background-color="#FDFCFA">
        <mj-column>
          <mj-image
            src="${assetPool.hero.main}"
            alt="Cameron Estate Inn - Your wedding weekend destination"
            width="520px"
            border-radius="6px"
            padding="0" />
        </mj-column>
      </mj-section>

      <!-- Second Image - Ceremony Space -->
      <mj-section padding="0 40px 40px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            Two Ceremony Spaces
          </mj-text>
          <mj-image
            src="${assetPool.ceremony.garden}"
            alt="Spring Garden ceremony at Cameron Estate"
            width="520px"
            border-radius="6px"
            padding="0 0 15px" />
          <mj-text css-class="body-text" align="left" padding="0" font-size="16px" line-height="1.6">
            <strong>The Spring Garden</strong> — outdoor beneath mature trees, overlooking our reflection pond.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0 0" font-size="16px" line-height="1.6">
            <strong>The Conservatory</strong> — elegant indoor with crystal chandeliers and a marble fireplace.
          </mj-text>
        </mj-column>
      </mj-section>

      <!-- Third Image - Reception -->
      <mj-section padding="0 40px 40px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            Reception Venues
          </mj-text>
          <mj-image
            src="${assetPool.reception.ballroom}"
            alt="Elegant reception setup at Cameron Estate"
            width="520px"
            border-radius="6px"
            padding="0 0 15px" />
          <mj-text css-class="body-text" align="left" padding="0" font-size="16px" line-height="1.6">
            <strong>Spring View Ballroom</strong> — intimate and refined for 50-150 guests.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0 0" font-size="16px" line-height="1.6">
            <strong>The Carriage House</strong> — dramatic and spacious for 150-250 guests.
          </mj-text>
        </mj-column>
      </mj-section>

      <!-- What's Included - Warm Tone -->
      <mj-section padding="40px" background-color="#F5F1EB">
        <mj-column>
          <mj-text align="center" padding="0 0 25px" font-family="Cormorant Garamond, Georgia, serif" font-size="28px" color="#2C3E50" font-weight="500">
            One Simple, Transparent Price
          </mj-text>
          <mj-text css-class="body-text" align="center" padding="0 0 20px" font-size="16px" line-height="1.6">
            Our per-person pricing includes everything — no hidden fees, no surprises:
          </mj-text>
          <mj-text css-class="body-text" align="center" padding="6px 0" font-size="15px" line-height="1.5">
            Ceremony space • Reception venue • Plated dinner catering
          </mj-text>
          <mj-text css-class="body-text" align="center" padding="6px 0" font-size="15px" line-height="1.5">
            Full premium open bar • All rentals (tables, linens, china, glassware)
          </mj-text>
          <mj-text css-class="body-text" align="center" padding="6px 0" font-size="15px" line-height="1.5">
            Day-of coordination team • Guest accommodations on-site
          </mj-text>
          <mj-text align="center" padding="25px 0 0" font-size="14px" color="#666" font-style="italic">
            No separate venue rental fee. Just one clear number.
          </mj-text>
        </mj-column>
      </mj-section>

      <!-- Fourth Image - The Celebration -->
      <mj-section padding="40px 40px 30px" background-color="#FDFCFA">
        <mj-column>
          <mj-image
            src="${assetPool.details.couple_candid}"
            alt="Celebrate your love at Cameron Estate Inn"
            width="520px"
            border-radius="6px"
            padding="0" />
        </mj-column>
      </mj-section>

      <!-- Personal Invitation -->
      <mj-section padding="0 40px 20px" background-color="#FDFCFA">
        <mj-column>
          <mj-text css-class="body-text" align="left" padding="0" font-size="17px" line-height="1.7">
            I'd love to show you around in person. There's something about standing in the garden at golden hour, or seeing the ballroom lit by candlelight, that helps you picture your own wedding day unfolding here.
          </mj-text>
        </mj-column>
      </mj-section>

      <!-- Prominent CTA -->
      <mj-section padding="0 40px 30px" background-color="#FDFCFA">
        <mj-column background-color="#F5F1EB" border-radius="4px" padding="25px">
           <mj-text align="center" padding="0 0 10px" font-family="Cormorant Garamond, Georgia, serif" font-size="22px" color="#2C3E50" font-weight="600">
             Ready for a tour?
           </mj-text>
           <mj-text align="center" padding="0" font-family="Poppins, Helvetica, Arial, sans-serif" font-size="16px" line-height="1.6" color="#4A4A4A">
             <strong>Just reply to this email with a few dates and times that work for you.</strong><br/><br/>
             Weekday or weekend, whatever fits your schedule. I'll bring the warm cookies and refreshments. You bring your questions and your vision.
           </mj-text>
        </mj-column>
      </mj-section>

      <!-- Signature -->
      <mj-section padding="0 40px 40px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="10px 0 0" font-family="Cormorant Garamond, Georgia, serif" font-size="22px" color="#2C3E50" font-weight="500">
            Talk soon,<br/>Lisa
          </mj-text>
        </mj-column>
      </mj-section>

      <!-- Soft CTAs -->
      <mj-section padding="30px 40px" background-color="#FFFFFF">
        <mj-column>
          <!--
          <mj-button
            href="${assetPool.links.book_tour}"
            background-color="#D4AF37"
            color="#FFFFFF"
            border-radius="4px"
            font-size="16px"
            font-weight="500"
            inner-padding="14px 35px">
            Schedule a Private Tour
          </mj-button>
          -->
        </mj-column>
      </mj-section>

      
    `
  },

  /**
   * DAY 2 - TOUCHPOINT 2B: Afternoon Email - What to Look For
   * Send: Day 2, 2pm
   */
  '001_e_day2_what_to_look_for': {
    name: '001 E Day 2 - What to Look For',
    subject: 'A few things I wish every couple knew before touring venues',
    previewText: "You're about to see a lot of beautiful spaces. Here's what to actually pay attention to...",
    category: 'education',
    gallery: {
      layout: 'none'
    },
    content: `
      <mj-section padding="40px 40px 20px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="0 0 25px" font-family="Cormorant Garamond, Georgia, serif" font-size="28px" color="#2C3E50" font-weight="500">
            {{contact.first_name}},
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            You're probably about to visit several venues over the next few weeks, and honestly? They're all going to look gorgeous in their listing photos and during your tours. That's the easy part — every venue has beautiful images.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0" font-size="16px" line-height="1.7">
            Here's what I encourage couples to focus on instead — the stuff that actually affects your wedding day experience and the months of planning leading up to it.
          </mj-text>
        </mj-column>
      </mj-section>

      <!-- Visual Break 1 -->
      <!-- IMAGE PLACEHOLDER: Cameron Estate Inn - Historic Venue -->
      <!--
      <mj-section padding="0 40px 40px" background-color="#FDFCFA">
        <mj-column>
          <mj-image
            src="${assetPool.hero.grounds}"
            alt="Cameron Estate Inn - Historic Venue"
            width="520px"
            border-radius="6px"
            padding="0" />
        </mj-column>
      </mj-section>
      -->
      
      <mj-section padding="30px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#D4AF37" font-weight="500">
            #1: Trust Your Gut When You Walk In
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            Photos only tell you so much. When you visit a venue in person, pay attention to:
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Can you actually see YOUR wedding happening here?</strong><br/>
            Not someone else's Pinterest-perfect wedding — <em>yours</em>. The flowers you choose, the people you love gathered around you, your dad giving his toast, your first dance.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Does the space feel right for your guest count?</strong><br/>
            A venue that feels perfect for 100 guests might feel empty for 200, or cramped for 250. Ask to see the space set up for a guest count similar to yours.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Do you feel welcomed, or like you're being sold to?</strong><br/>
            You'll be working with this team for a year or more. Do they seem genuinely excited about your vision, or just going through the motions?
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="10px 0 0" font-size="16px" line-height="1.7" font-style="italic" color="#666">
            That last one matters more than you'd think. Your venue coordinator becomes part of your wedding planning team — you want someone you're excited to work with.
          </mj-text>
        </mj-column>
      </mj-section>

      <!-- Visual Break 2 -->
      <!-- IMAGE PLACEHOLDER: Elegant details -->
      <!--
      <mj-section padding="0 40px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-image
            src="${assetPool.details.table}"
            alt="Elegant details included in your package"
            width="520px"
            border-radius="6px"
            padding="0" />
        </mj-column>
      </mj-section>
      -->
      
      <mj-section padding="35px 40px" background-color="#F5F1EB">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            #2: Get Crystal Clear on "All-Inclusive"
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            Every venue defines "all-inclusive" differently, and this is exactly where hidden costs love to hide. When you're touring venues (including ours!), worth asking specifically:
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="6px 0" font-size="16px" line-height="1.7">
            • <strong>What's included in your base price vs. what costs extra?</strong>
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="6px 0" font-size="16px" line-height="1.7">
            • <strong>Are linens included, or do you rent them separately?</strong>
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="6px 0" font-size="16px" line-height="1.7">
            • <strong>Is there a day-of coordinator included?</strong>
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="6px 0" font-size="16px" line-height="1.7">
            • <strong>Will there be any surprise charges?</strong> (Service fees, admin fees, etc.)
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="15px 0 0" font-size="16px" line-height="1.7">
            At Cameron Estate, our per-person price covers all of the above. No separate venue rental fee. No gotchas. One clear number.
          </mj-text>
        </mj-column>
      </mj-section>

      <!-- Visual Break 3 -->
      <!-- IMAGE PLACEHOLDER: Enjoying the moment -->
      <!--
      <mj-section padding="0 40px 40px" background-color="#F5F1EB">
        <mj-column>
          <mj-image
            src="${assetPool.details.peace}"
            alt="Enjoying the moment without stress"
            width="520px"
            border-radius="6px"
            padding="0" />
        </mj-column>
      </mj-section>
      -->
      
      <mj-section padding="30px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#D4AF37" font-weight="500">
            #3: Think About the Planning Process
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            Your venue choice determines how you'll spend the next year of your life:
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Will you be coordinating with five different vendors?</strong><br/>
            When you book separate venues, caterers, rental companies, bar services, and coordinators, you become the project manager of your own wedding.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Who's managing your timeline and setup?</strong><br/>
            Things go wrong at every wedding — it's how they're handled that matters.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>If something goes sideways, who fixes it?</strong><br/>
            The answer should be "we do" — not "that's between you and your vendors."
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="15px 0 0" font-size="16px" line-height="1.7">
            When one experienced team manages everything in one location — as we do at Cameron Estate — planning gets significantly easier. And your wedding day runs significantly smoother.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <mj-section padding="30px 40px" background-color="#FDFCFA">
        <mj-column>
          <!--
          <mj-button 
            href="${assetPool.links.book_tour}" 
            background-color="#2C3E50" 
            color="#FFFFFF"
            border-radius="4px"
            font-size="16px"
            font-weight="500"
            inner-padding="14px 35px"
            align="left">
            Schedule Your Tour
          </mj-button>
          -->
          <mj-text css-class="body-text" align="left" padding="25px 0 0" font-size="16px" line-height="1.7">
            I'd love to show you around Cameron Estate and answer any questions you have about how we compare to other places you're visiting. We have warm cookies and refreshments ready for you!
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="15px 0 0" font-size="16px" line-height="1.7">
            Just reply with a few dates that work for a tour, or email me anytime with questions.
          </mj-text>
          <mj-text align="left" padding="30px 0 0" font-family="Cormorant Garamond, Georgia, serif" font-size="22px" color="#2C3E50" font-weight="500">
            Talk soon,<br/>Lisa
          </mj-text>
        </mj-column>
      </mj-section>

      
    `
  },

  /**
   * DAY 3 - TOUCHPOINT 3A: Decision Stories Email
   * Send: Day 3, 10am
   */
  '001_e_day3_stories': {
    name: '001 E Day 3 - Stories',
    subject: '"We knew within minutes"',
    previewText: 'Three couples share what made them choose Cameron Estate. Their stories might help you decide...',
    category: 'social_proof',
    gallery: {
      layout: 'none'
    },
    content: `
      <mj-section padding="40px 40px 20px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="0 0 25px" font-family="Cormorant Garamond, Georgia, serif" font-size="28px" color="#2C3E50" font-weight="500">
            {{contact.first_name}},
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            I wanted to share something with you that I think might help as you continue exploring venues.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            When couples tour Cameron Estate — people just like you — they often tell me something interesting: they knew within the first few minutes whether it was right for them. Not because we have the fanciest ballroom in Lancaster County, or the most acres, or the highest search ranking.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0" font-size="16px" line-height="1.7">
            They knew because they could genuinely picture their wedding happening here. They weren't looking at <em>a</em> wedding anymore — they were seeing <em>their</em> wedding.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <mj-section padding="30px 40px 10px" background-color="#FFFFFF">
        <mj-column>
          <mj-text align="left" padding="0 0 20px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#D4AF37" font-weight="500">
            What Recent Couples Are Saying
          </mj-text>
        </mj-column>
      </mj-section>
      
      <!-- Testimonial 1 -->
      <mj-section padding="0 40px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text css-class="testimonial-quote" align="left" padding="0 0 15px" font-size="16px" line-height="1.7" font-style="italic" color="#555">
            "We looked at five venues over two weekends. Cameron Estate was the only one where we could actually see our day unfolding. The all-inclusive approach meant we weren't stressed about coordinating vendors, arguing about chair rental fees, or hiring a day-of coordinator. We could just enjoy planning our wedding instead of managing a construction project."
          </mj-text>
          <mj-text css-class="testimonial-attribution" align="left" padding="0 0 25px" font-size="15px" font-weight="bold" color="#2C3E50">
            — Jennifer & Michael, October 2025
          </mj-text>
          <!-- IMAGE PLACEHOLDER: Cameron Estate Grounds -->
          <!--
          <mj-image
            src="${assetPool.ceremony.emotion}"
            alt="Cameron Estate Grounds"
            width="520px"
            border-radius="6px"
            padding="0" />
          -->
        </mj-column>
      </mj-section>
      
      <!-- Testimonial 2 -->
      <mj-section padding="40px" background-color="#F5F1EB">
        <mj-column>
          <mj-text css-class="testimonial-quote" align="left" padding="0 0 15px" font-size="16px" line-height="1.7" font-style="italic" color="#555">
            "Our families loved Cameron Estate as much as we did. Having everyone stay on-site for the weekend — gathering Friday night, celebrating all day Saturday, brunching together Sunday — made our wedding feel less like a stressful event and more like a celebration with the people we love most. Our parents still talk about how special that made the whole experience."
          </mj-text>
          <mj-text css-class="testimonial-attribution" align="left" padding="0 0 25px" font-size="15px" font-weight="bold" color="#2C3E50">
            — Rachel & David, June 2025
          </mj-text>
          <!-- IMAGE PLACEHOLDER: Celebrating with family -->
          <!--
          <mj-image
            src="${assetPool.details.family}"
            alt="Celebrating with family"
            width="520px"
            border-radius="6px"
            padding="0" />
          -->
        </mj-column>
      </mj-section>
      
      <!-- Testimonial 3 -->
      <mj-section padding="40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text css-class="testimonial-quote" align="left" padding="0 0 15px" font-size="16px" line-height="1.7" font-style="italic" color="#555">
            "The pricing was crystal clear from our first conversation with Lisa. No surprises, no hidden fees, no 'oh by the way this costs extra' showing up three months before the wedding. That peace of mind — knowing exactly what we were paying for and what it included — was worth absolutely everything. We could focus on the fun parts of planning instead of worrying about the budget."
          </mj-text>
          <mj-text css-class="testimonial-attribution" align="left" padding="0 0 25px" font-size="15px" font-weight="bold" color="#2C3E50">
            — Amanda & Chris, September 2024
          </mj-text>
          <!-- IMAGE PLACEHOLDER: Elegant details -->
          <!--
          <mj-image
            src="${assetPool.reception.dancing}"
            alt="Elegant details"
            width="520px"
            border-radius="6px"
            padding="0" />
          -->
        </mj-column>
      </mj-section>
      
      <mj-section padding="30px 40px" background-color="#FDFCFA">
        <mj-column>
          <mj-text css-class="body-text" align="left" padding="0 0 20px" font-size="16px" line-height="1.7">
            I don't know if Cameron Estate is the right fit for your celebration — truly, only you can decide that. But if you're still exploring your options and haven't found that moment of clarity yet, I'd love to give you the same experience these couples had: a chance to walk the grounds, see the spaces, and envision your own wedding day here.
          </mj-text>
          <!--
          <mj-button 
            href="${assetPool.links.book_tour}" 
            background-color="#D4AF37" 
            color="#FFFFFF"
            border-radius="4px"
            font-size="16px"
            font-weight="500"
            inner-padding="14px 35px"
            align="left"
            padding-bottom="25px">
            Schedule Your Private Tour
          </mj-button>
          -->
          <mj-text css-class="body-text" align="left" padding="0" font-size="16px" line-height="1.7">
            Ready to see Cameron Estate in person? Just reply with a few dates that work for you, and I'll get you on the calendar. I'm here whenever you're ready. And honestly? I would genuinely love to hear your love story — how you met, what you're envisioning, what matters most to you about your wedding day.
          </mj-text>
          <mj-text align="left" padding="30px 0 0" font-family="Cormorant Garamond, Georgia, serif" font-size="22px" color="#2C3E50" font-weight="500">
            Talk soon,<br/>Lisa
          </mj-text>
        </mj-column>
      </mj-section>

      
    `
  },

  /**
   * DAY 5 - TOUCHPOINT 5: Vision Email
   * Send: Day 5, 10am
   */
  '001_e_day5_vision': {
    name: '001 E Day 5 - Vision',
    subject: '{{contact.first_name}}, can you see it?',
    previewText: 'Close your eyes. Picture your wedding day. Where are you standing?',
    category: 'emotional',
    gallery: {
      layout: 'none'
    },
    content: `
      <mj-section padding="40px 40px 20px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="0 0 25px" font-family="Cormorant Garamond, Georgia, serif" font-size="28px" color="#2C3E50" font-weight="500">
            {{contact.first_name}},
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            Here's a question worth sitting with for a minute — maybe with your coffee this morning, or as you're winding down this evening:
          </mj-text>
          <mj-text align="center" padding="25px 0" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#D4AF37" font-weight="500" font-style="italic">
            When you picture your wedding day — really picture it, in vivid detail — where are you?
          </mj-text>
        </mj-column>
      </mj-section>
      
      <!-- Vision 1: Ceremony -->
      <mj-section padding="30px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text css-class="body-text" align="left" padding="0 0 20px" font-size="16px" line-height="1.7">
            <strong>Can you see yourself</strong> walking down an aisle surrounded by ancient trees, with golden sunlight filtering through the branches, your closest people seated on either side as you make your way toward the person you love?
          </mj-text>
          <!-- IMAGE PLACEHOLDER: Garden Ceremony -->
          <!--
          <mj-image
            src="${assetPool.ceremony.aisle_pov}"
            alt="Garden Ceremony"
            width="520px"
            border-radius="6px"
            padding="0" />
          -->
        </mj-column>
      </mj-section>

      <!-- Vision 2: Cocktail Hour -->
      <mj-section padding="30px 40px" background-color="#F5F1EB">
        <mj-column>
          <mj-text css-class="body-text" align="left" padding="0 0 20px" font-size="16px" line-height="1.7">
            <strong>Can you hear</strong> the sound of your guests' laughter floating across the lawn during cocktail hour, the clink of glasses as people toast to your future, the murmur of conversation as everyone enjoys being together?
          </mj-text>
          <!-- IMAGE PLACEHOLDER: Cocktail hour on the lawn -->
          <!--
          <mj-image
            src="${assetPool.reception.cocktail}"
            alt="Cocktail hour on the lawn"
            width="520px"
            border-radius="6px"
            padding="0" />
          -->
        </mj-column>
      </mj-section>

      <!-- Vision 3: Reception -->
      <mj-section padding="30px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text css-class="body-text" align="left" padding="0 0 20px" font-size="16px" line-height="1.7">
            <strong>Can you feel</strong> what it's like to step into your reception space, look around, and see everyone you love in one room — your families, your friends, the people who've shaped who you are as a couple — all gathered here to celebrate you?
          </mj-text>
          <!-- IMAGE PLACEHOLDER: Reception details -->
          <!--
          <mj-image
            src="${assetPool.reception.atmosphere}"
            alt="Reception details"
            width="520px"
            border-radius="6px"
            padding="0" />
          -->
        </mj-column>
      </mj-section>
      
      <mj-section padding="40px" background-color="#2C3E50">
        <mj-column>
          <mj-text align="center" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="22px" color="#D4AF37" font-style="italic" line-height="1.5">
            "That feeling — that moment of clarity when you can actually see your memories happening — that's what matters."
          </mj-text>
          <mj-text css-class="body-text" padding="10px 0 0" align="center" color="#E8E8E8" font-size="16px" line-height="1.7">
            The venue you choose should be the place where you can genuinely see your memories happening. Where you can imagine your dad's toast, your first dance, the moment you look around the room and think, 'We did this. This is ours.'
          </mj-text>
        </mj-column>
      </mj-section>
      
      <mj-section padding="40px 40px 20px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            Is That Cameron Estate for You?
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            I don't know the answer to that question yet. But I'd love to give you the chance to find out.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            I've watched hundreds of couples tour Cameron Estate over the years, and here's what I've noticed: the ones who book with us — the couples who decide "yes, this is it" — they usually get quiet for a second during the tour. They're not looking at the chandeliers anymore.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 25px" font-size="16px" line-height="1.7">
            They're looking at each other. And you can see it click. They're not seeing <em>a</em> wedding anymore. They're seeing <em>their</em> wedding.
          </mj-text>
          
          <!--
          <mj-button 
            href="${assetPool.links.book_tour}" 
            background-color="#D4AF37" 
            color="#FFFFFF"
            border-radius="4px"
            font-size="16px"
            font-weight="500"
            inner-padding="14px 35px"
            align="left"
            padding-bottom="25px">
            Schedule Your Private Tour
          </mj-button>
          -->
          
          <mj-text css-class="body-text" align="left" padding="10px 0 0" font-size="16px" line-height="1.7">
            Our calendar is filling up nicely for the upcoming seasons. Just reply with 2-3 dates that work for you, and I'll get you on the calendar. Warm cookies and good conversation await!
          </mj-text>
          <mj-text align="left" padding="30px 0 0" font-family="Cormorant Garamond, Georgia, serif" font-size="22px" color="#2C3E50" font-weight="500">
            Talk soon,<br/>Lisa
          </mj-text>
        </mj-column>
      </mj-section>

      
    `
  },

  /**
   * DAY 7 - TOUCHPOINT 6: Pinterest Inspiration Email
   * Send: Day 7, 2pm
   */
  '001_e_day7_pinterest': {
    name: '001 E Day 7 - Pinterest',
    subject: 'We made you a Pinterest board',
    previewText: 'Romantic garden party? Moody autumnal vibes? Black-tie elegance? Yes, yes, and yes...',
    category: 'inspiration',
    gallery: {
      layout: 'none'
    },
    content: `
      <mj-section padding="40px 40px 20px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="0 0 25px" font-family="Cormorant Garamond, Georgia, serif" font-size="28px" color="#2C3E50" font-weight="500">
            {{contact.first_name}},
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            Quick question for you: What does your dream wedding actually look like?
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            When you think about your wedding day — not what you're "supposed to" want, but what you actually envision — what do you see?
          </mj-text>
        </mj-column>
      </mj-section>
      
      <mj-section padding="30px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Soft and romantic</strong> with lots of candlelight, fresh flowers everywhere, an intimate gathering of your closest people?
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Bold and dramatic</strong> with rich, moody colors, a dramatic black-tie affair, making a statement with every detail?
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Classic elegance</strong> — timeless, sophisticated, the kind of wedding that could have been in any era and still looks perfect?
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>A boho garden party</strong> — relaxed, organic, nature-inspired, completely you?
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Something totally unexpected</strong> that perfectly captures you two as a couple, whatever that looks like?
          </mj-text>
        </mj-column>
      </mj-section>
      
      <mj-section padding="35px 40px" background-color="#F5F1EB">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            Here's the Thing About Cameron Estate...
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            We've hosted all of these weddings. And then some.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 20px" font-size="16px" line-height="1.7">
            The estate doesn't dictate your style — it adapts to it. The brick and the trees and the chandeliers provide a beautiful backdrop, but what you create here is completely yours. Cameron Estate is a canvas for your vision, not a template that everything has to fit into.
          </mj-text>
          <!-- IMAGE PLACEHOLDER: Reception Styling -->
          <!--
          <mj-image
            src="${assetPool.details.decor}"
            alt="Reception Styling"
            width="520px"
            border-radius="6px"
            padding="0" />
          -->
        </mj-column>
      </mj-section>
      
      <mj-section padding="30px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#D4AF37" font-weight="500">
            That's Why We Created a Pinterest Board for You
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            I put together a collection of real weddings from Cameron Estate — couples who trusted us with their day and created something beautiful. It shows just how versatile this space is:
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="6px 0" font-size="16px" line-height="1.7">
            ✓ Romantic spring garden ceremonies under the trees<br/>
            ✓ Elegant candlelit receptions in the Spring View Ballroom<br/>
            ✓ Dramatic fall weddings with rich burgundy and gold<br/>
            ✓ Intimate winter celebrations by the fireplace<br/>
            ✓ Bold, modern designs that felt totally fresh and unexpected
          </mj-text>
          <mj-button 
            href="${assetPool.links.pinterest}" 
            background-color="#D4AF37" 
            color="#FFFFFF"
            border-radius="4px"
            font-size="16px"
            font-weight="500"
            inner-padding="14px 35px"
            align="left"
            padding-top="20px"
            padding-bottom="10px">
            Browse Our Pinterest Board →
          </mj-button>
        </mj-column>
      </mj-section>
      
      <mj-section padding="30px 40px" background-color="#FDFCFA">
        <mj-column>
          <mj-text css-class="body-text" align="left" padding="0 0 20px" font-size="16px" line-height="1.7">
            Grab a coffee, open Pinterest, and spend a few minutes scrolling through. See what makes you say "oh, <strong>that's</strong> us." That's the fun part of wedding planning — discovering what really resonates with you.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0" font-size="16px" line-height="1.7">
            And if something catches your eye, or if you want to talk through how your vision would work here at Cameron Estate, just hit reply. I genuinely love these conversations — talking about wedding design and what makes a day feel special is literally my favorite thing.
          </mj-text>
          <mj-text align="left" padding="30px 0 0" font-family="Cormorant Garamond, Georgia, serif" font-size="22px" color="#2C3E50" font-weight="500">
            Talk soon,<br/>Lisa
          </mj-text>
        </mj-column>
      </mj-section>

      
    `
  },

  /**
   * DAY 10 - TOUCHPOINT 6: Inclusions Email
   * Send: Day 10, 2pm
   */
  '001_e_day10_inclusions': {
    name: '001 E Day 10 - Inclusions',
    subject: 'What "all-inclusive" really means at Cameron Estate',
    previewText: 'Not all all-inclusive packages are created equal. Here is exactly what is included in ours — and what you handle elsewhere...',
    category: 'value',
    gallery: {
      layout: 'none'
    },
    content: `
      <mj-section padding="40px 40px 20px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="0 0 25px" font-family="Cormorant Garamond, Georgia, serif" font-size="28px" color="#2C3E50" font-weight="500">
            {{contact.first_name}},
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            You're probably seeing "all-inclusive" at every venue you research right now. Venue websites, wedding planning blogs, Instagram ads — everyone's using that term.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            But here's what I've learned after years in this industry: "all-inclusive" means something completely different at every single venue. There's no standard definition. It's a marketing term that gets thrown around without any real meaning behind it.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0" font-size="16px" line-height="1.7">
            Let me show you exactly what it means at Cameron Estate. No marketing spin, no fine print hidden on page 12 of the contract — just a straightforward list of what's included when you book your wedding with us.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <!-- IMAGE PLACEHOLDER: Cameron Estate Exterior -->
      <!--
      <mj-section padding="0 40px 40px" background-color="#FDFCFA">
        <mj-column>
          <mj-image
            src="${assetPool.hero.twilight}"
            alt="Cameron Estate Exterior"
            width="520px"
            border-radius="6px"
            padding="0" />
        </mj-column>
      </mj-section>
      -->
      
      <mj-section padding="35px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            What's Included: The Essentials
          </mj-text>
          
          <mj-text css-class="body-text" align="left" padding="10px 0" font-size="16px" line-height="1.7">
            <strong>Your Venue & Ceremony Spaces:</strong><br/>
            Your choice of ceremony location — Spring Garden or Conservatory — is included. Cocktail hour space. Your reception ballroom — Spring View Ballroom or Carriage House, depending on your guest count. No separate venue rental fee. No "facility charge." You pay one per-person price that includes the spaces.
          </mj-text>
          
          <mj-text css-class="body-text" align="left" padding="10px 0" font-size="16px" line-height="1.7">
            <strong>Event Essentials:</strong><br/>
            Tables and chairs for both ceremony and reception — included. Premium linens (tablecloths and napkins) in your choice of colors — included. Centerpiece vases and table decor elements — included. Cake cutting and service — included. Setup crew to transform the spaces according to your vision. Cleanup crew to handle everything after.
          </mj-text>
          
          <mj-text css-class="body-text" align="left" padding="10px 0" font-size="16px" line-height="1.7">
            <strong>Getting Ready Spaces:</strong><br/>
            Two private changing spaces provided for the couple to prepare before the ceremony. No need to book a hotel room just for getting ready — we have you covered right here on the estate.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <mj-section padding="35px 40px" background-color="#F5F1EB">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            Food, Beverage & Staff
          </mj-text>
          
          <mj-text css-class="body-text" align="left" padding="10px 0" font-size="16px" line-height="1.7">
            <strong>Food & Beverage:</strong><br/>
            Full plated dinner service with our experienced culinary team. <strong>Champagne toast</strong> (included in select packages). Premium open bar featuring beer, wine, liquor, and all the mixers. Professional bartender services throughout your reception. All glassware, china, and flatware — nothing extra to rent, nothing to coordinate.
          </mj-text>
          
          <mj-text css-class="body-text" align="left" padding="10px 0" font-size="16px" line-height="1.7">
            <strong>Staffing & Coordination:</strong><br/>
            Your dedicated event coordinator who handles timeline planning, vendor coordination, and day-of management from contract signing to cake cutting. Professional wait staff for your plated dinner service. Bar staff throughout your reception. Setup and cleanup crew.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <!-- IMAGE PLACEHOLDER: Table Setting Details -->
      <!--
      <mj-section padding="0 40px 40px" background-color="#F5F1EB">
        <mj-column>
          <mj-image
            src="${assetPool.details[1]}"
            alt="Table Setting Details"
            width="520px"
            border-radius="6px"
            padding="0" />
        </mj-column>
      </mj-section>
      -->
      
      <mj-section padding="35px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#D4AF37" font-weight="500">
            What You Handle Separately
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7" font-style="italic">
            (But We Have Great Recommendations!)
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="5px 0" font-size="16px" line-height="1.7">
            • Flowers and floral design
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="5px 0" font-size="16px" line-height="1.7">
            • Photography and videography
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="5px 0" font-size="16px" line-height="1.7">
            • Music, DJ, or band
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="5px 0" font-size="16px" line-height="1.7">
            • Wedding cake (from local bakeries)
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="5px 0" font-size="16px" line-height="1.7">
            • Invitations and paper goods
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="5px 0" font-size="16px" line-height="1.7">
            • Your dress, attire, rings
          </mj-text>
        </mj-column>
      </mj-section>
      
      <mj-section padding="30px 40px" background-color="#2C3E50">
        <mj-column>
          <mj-text align="center" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="22px" color="#D4AF37" font-style="italic" line-height="1.5">
            "The difference this makes in your planning experience is hard to overstate."
          </mj-text>
          <mj-text css-class="body-text" align="center" padding="10px 0 0" color="#E8E8E8" font-size="16px" line-height="1.7">
            Instead of coordinating with a venue, caterer, rental company, bar service, day-of coordinator, and cleanup crew — you coordinate with one person at one place. Your planning becomes simpler. Your costs become clearer. Your wedding day becomes smoother.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <mj-section padding="30px 40px" background-color="#FDFCFA">
        <mj-column>
          <mj-text css-class="body-text" align="left" padding="0 0 20px" font-size="16px" line-height="1.7">
            I encourage you to compare this to other venues you're considering. Ask them specifically: "What's included in your per-person price, and what costs extra?" The details matter. The answers will be very revealing.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 25px" font-size="16px" line-height="1.7">
            Want to see how this all comes together at Cameron Estate? Reply with a few dates for your tour, and I'll show you every space, explain every detail, and answer every question you have.
          </mj-text>
          
          <!--
          <mj-button 
            href="${assetPool.links.book_tour}" 
            background-color="#D4AF37" 
            color="#FFFFFF"
            border-radius="4px"
            font-size="16px"
            font-weight="500"
            inner-padding="14px 35px"
            align="left">
            See It In Person
          </mj-button>
          -->
          <mj-text align="left" padding="30px 0 0" font-family="Cormorant Garamond, Georgia, serif" font-size="22px" color="#2C3E50" font-weight="500">
            Talk soon,<br/>Lisa
          </mj-text>
        </mj-column>
      </mj-section>

      
    `
  },

  /**
   * DAY 12 - TOUCHPOINT 8: FAQ Email
   * Send: Day 12, 10am
   */
  '001_e_day12_faq': {
    name: '001 E Day 12 - FAQ',
    subject: 'Questions couples ask at this stage',
    previewText: "You're probably wondering about deposits, cancellations, and what-ifs. Let me answer those now...",
    category: 'objection_handling',
    gallery: {
      layout: 'none'
    },
    content: `
      <mj-section padding="40px 40px 20px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="0 0 25px" font-family="Cormorant Garamond, Georgia, serif" font-size="28px" color="#2C3E50" font-weight="500">
            {{contact.first_name}},
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            Twelve days into your venue search, and you're probably asking yourself a lot of the same questions that every couple asks at this stage. Let me address what I hear most often — directly and honestly.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <mj-section padding="30px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            "What if we find something better after we book?"
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            You might. That's the nature of exploring — you never know what you might find around the next corner.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            But here's what I want you to consider: you've now seen Cameron Estate. You know what we offer, what our spaces look like, what's included in our pricing, and how we work with couples. You've developed clarity on what matters to you by seeing what's available.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            If another venue offers something significantly different — a feature you genuinely need that we don't have, a date we don't have available, a price point that works better for your budget — then you'll know. And you can make an informed decision. But that clarity only comes from seeing what's actually out there, which you're doing.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <!-- Visual Break 1 -->
      <!-- IMAGE PLACEHOLDER: Cameron Estate Inn Exterior -->
      <!--
      <mj-section padding="0 40px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-image
            src="${assetPool.hero.seasonal}"
            alt="Cameron Estate Inn Exterior"
            width="520px"
            border-radius="6px"
            padding="0" />
        </mj-column>
      </mj-section>
      -->
      
      <mj-section padding="35px 40px" background-color="#F5F1EB">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            "Is the pricing really final? Are there hidden fees?"
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            Yes. Your proposal includes exactly what we discussed — the per-person price for your estimated guest count, covering all food, beverage, venue access, rentals, and coordination services. No surprises. No hidden fees. No add-ons that you didn't expect showing up three months before your wedding.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            If your guest count changes significantly, we'll adjust accordingly. But there are no secret "service fees," no "admin charges," no "setup costs" that appear later. The number we quote is the number you pay.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <!-- Visual Break 2 -->
      <!-- IMAGE PLACEHOLDER: No hidden fees -->
      <!--
      <mj-section padding="0 40px 40px" background-color="#F5F1EB">
        <mj-column>
          <mj-image
            src="${assetPool.details.table}"
            alt="No hidden fees"
            width="520px"
            border-radius="6px"
            padding="0" />
        </mj-column>
      </mj-section>
      -->
      
      <mj-section padding="30px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            "What if we need to cancel or postpone?"
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            Life happens. People's circumstances change. Even the best-laid plans sometimes need to shift. We understand that, and our policies reflect that reality.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            Here's how our deposit and payment structure works:
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Initial deposit</strong> — This holds your date on our calendar. It's non-refundable, as is standard in the industry (because when we hold your date, we turn away other couples who might want it).
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Payment schedule</strong> — Your remaining balance is spread out over the course of your engagement, making it manageable rather than one large payment.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Cancellation terms</strong> — Clear and fair, outlined in your contract. If you need to cancel, you won't be on the hook for the full amount. If you need to postpone to a future date, we work with you to find a new date that works.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="10px 0 0" font-size="16px" line-height="1.7">
            I'm happy to walk through the specific terms with you — just ask. Transparency is important to us.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <mj-section padding="35px 40px" background-color="#F5F1EB">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            "How do we actually know it's the right choice?"
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            Honestly? You won't know completely until your wedding day. That's the honest truth about planning a celebration this important — you're making decisions years in advance about something you can't fully experience until it happens.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            But here's what couples tell us: they felt <strong>relief</strong>, not anxiety, when they made their decision. They felt ready to stop searching and start planning. They could picture their day here, and that picture felt right.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0" font-size="16px" line-height="1.7">
            If you're feeling anxious or uncertain, keep exploring. If you're feeling relief and excitement when you think about Cameron Estate, that's worth paying attention to.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <mj-section padding="30px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text align="left" padding="0 0 15px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            "What happens next if we book?"
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            Here's what the rest of your wedding planning journey looks like with Cameron Estate:
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Step 1:</strong> You select your date and secure it with your deposit. The date is officially yours.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Step 2:</strong> We schedule a comprehensive planning meeting — either in person or virtual, whatever works for you — to discuss your vision in detail. Colors, flowers, menu preferences, timeline, all of it.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Step 3:</strong> You receive your dedicated coordinator — the person who will guide you through every step of the planning process, answer your questions, help you make decisions, and manage all the details.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Step 4:</strong> We handle all vendor coordination. Your coordinator works with your florist, photographer, DJ, and any other vendors to make sure everyone is on the same page.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="8px 0" font-size="16px" line-height="1.7">
            <strong>Step 5:</strong> We manage timeline planning, setup, and day-of execution. You show up on your wedding day, and we handle everything.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="10px 0 0" font-size="16px" line-height="1.7">
            That's the beauty of having one team manage everything: you get to actually enjoy your wedding day instead of managing it.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <!-- Visual Break 3 -->
      <!-- IMAGE PLACEHOLDER: Enjoying your wedding day -->
      <!--
      <mj-section padding="0 40px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-image
            src="${assetPool.details.peace}"
            alt="Enjoying your wedding day"
            width="520px"
            border-radius="6px"
            padding="0" />
        </mj-column>
      </mj-section>
      -->
      
      <mj-section padding="30px 40px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="0 0 20px" font-family="Cormorant Garamond, Georgia, serif" font-size="24px" color="#2C3E50" font-weight="500">
            Questions I Didn't Anticipate?
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 25px" font-size="16px" line-height="1.7">
            Let's talk. I'm here to answer anything I haven't covered.
          </mj-text>
          
          <!--
          <mj-button 
            href="${assetPool.links.calendar}" 
            background-color="#D4AF37" 
            color="#FFFFFF"
            border-radius="4px"
            font-size="16px"
            font-weight="500"
            inner-padding="14px 35px"
            align="left">
            Schedule a Call
          </mj-button>
          -->
          
          <mj-text css-class="body-text" align="left" padding="25px 0 0" font-size="16px" line-height="1.7">
            Or reach out however works best for you:
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="5px 0" font-size="16px" line-height="1.7">
            Email: <span class="responsive-link"><a href="mailto:ceiweddings@cameronestateinn.com" style="color: #2C3E50;">ceiweddings@cameronestateinn.com</a></span><br/>
            Phone: 717-725-4831
          </mj-text>
          
          <mj-text css-class="body-text" align="left" padding="20px 0 0" font-size="16px" line-height="1.7">
            Take your time. Good decisions aren't rushed — but our calendar is real, and availability does shift as couples make decisions. If you've been thinking about Cameron Estate, I hope you'll give us the chance to show you around.
          </mj-text>
        </mj-column>
      </mj-section>

      
    `
  },

  /**
   * DAY 14 - TOUCHPOINT 10: Close Email
   * Send: Day 14, 10am
   */
  '001_e_day14_close': {
    name: '001 E Day 14 - Close',
    subject: 'Wishing you the best, {{contact.first_name}}',
    previewText: "I haven't heard from you, which tells me you've likely found your venue. Congratulations, and best wishes...",
    category: 'close',
    gallery: {
      layout: 'none'
    },
    content: `
      <mj-section padding="40px 40px 20px" background-color="#FDFCFA">
        <mj-column>
          <mj-text align="left" padding="0 0 25px" font-family="Cormorant Garamond, Georgia, serif" font-size="28px" color="#2C3E50" font-weight="500">
            {{contact.first_name}},
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            I haven't heard from you in a bit, so I'm assuming you've likely found your wedding venue or decided to go in a different direction.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 15px" font-size="16px" line-height="1.7">
            I just wanted to send one last note to say: <strong>congratulations</strong>.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0" font-size="16px" line-height="1.7">
            Planning a wedding is a big journey. Wherever you've chosen to celebrate, I truly hope it's everything you've envisioned. I hope the day is full of joy, that the weather is perfect, and that you're surrounded by people who love you.
          </mj-text>
        </mj-column>
      </mj-section>
      
      <!-- Visual Break -->
      <!-- IMAGE PLACEHOLDER: Best wishes from Cameron Estate -->
      <!--
      <mj-section padding="0 40px 40px" background-color="#FDFCFA">
        <mj-column>
          <mj-image
            src="${assetPool.hero[2]}"
            alt="Best wishes from Cameron Estate"
            width="520px"
            border-radius="6px"
            padding="0" />
        </mj-column>
      </mj-section>
      -->
      
      <mj-section padding="30px 40px" background-color="#FFFFFF">
        <mj-column>
          <mj-text css-class="body-text" align="left" padding="0 0 20px" font-size="16px" line-height="1.7">
            If you <em>are</em> still looking and just haven't had a chance to reply — life gets busy! — I'm still here. You can always reach back out to me, even months from now. If we have the date available, we'd love to host you.
          </mj-text>
          <mj-text css-class="body-text" align="left" padding="0 0 20px" font-size="16px" line-height="1.7">
            But for now, I'll take you off my follow-up list so I'm not clogging your inbox.
          </mj-text>
          <mj-text align="left" padding="10px 0 0" font-family="Cormorant Garamond, Georgia, serif" font-size="22px" color="#2C3E50" font-weight="500">
            All the best,<br/>Lisa
          </mj-text>
        </mj-column>
      </mj-section>
      
      
    `
  }
};
