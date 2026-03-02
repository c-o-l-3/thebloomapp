#!/bin/bash

# Promise Farm "New Leads → Book a Tour" Journey ID: a422da84-52dd-4427-827d-5a2139b92bf5

# Touchpoint 1: Welcome - Immediate
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "a422da84-52dd-4427-827d-5a2139b92bf5",
    "name": "Welcome - Immediate",
    "type": "email",
    "order": 1,
    "delay": 0,
    "delayUnit": "hours",
    "content": {
      "subject": "Welcome to Promise Farm!",
      "previewText": "Welcome to Promise Farm! We are absolutely thrilled that you are considering our Lancaster County barn venue.",
      "body": "Hi {{contact.first_name}}, welcome to Promise Farm! We are absolutely thrilled that you are considering our Lancaster County barn venue for your special day. Picture this: exchanging vows surrounded by rolling hills, celebrating under crystal chandeliers in our climate-controlled barn, and creating memories that last a lifetime. Here is what makes Promise Farm special: Flexible vendor policy - choose your own caterer, photographer, and more, Day-of coordination included with every package, Gorgeous bridal suite with plenty of getting-ready space, Both indoor and outdoor ceremony options, Affordable pricing without sacrificing elegance. We would love to show you around in person. Our tours typically last about an hour, and you will get to see all the spaces, ask questions, and start envisioning your day here."
    }
  }' | jq '.id'

# Touchpoint 2: Value Propositions - Day 2
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "a422da84-52dd-4427-827d-5a2139b92bf5",
    "name": "Value Propositions - Day 2",
    "type": "email",
    "order": 2,
    "delay": 2,
    "delayUnit": "days",
    "content": {
      "subject": "Why couples choose Promise Farm",
      "previewText": "Discover what makes our barn venue different from typical banquet halls.",
      "body": "Hi {{contact.first_name}}, as you explore wedding venues, we wanted to share what makes Promise Farm different from the typical banquet hall experience: AUTHENTIC RUSTIC CHARM - Our barn has been thoughtfully restored with modern amenities while keeping its historic character. Think exposed beams, warm wood tones, and that unmistakable cozy feeling. TRANSPARENT, AFFORDABLE PRICING - No hidden fees, no surprises. We believe beautiful weddings should not require breaking the bank. COMPLETE CREATIVE FREEDOM - Bring your own caterer (food trucks welcome!), choose your own florist, decorate however you would like. This is YOUR canvas. LANCASTER COUNTY LOCATION - Your guests will love the scenic drive through Pennsylvania Dutch Country. Have questions about any of these? Just hit reply."
    }
  }' | jq '.id'

# Touchpoint 3: Our Spaces - Day 4
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "a422da84-52dd-4427-827d-5a2139b92bf5",
    "name": "Our Spaces - Day 4",
    "type": "email",
    "order": 3,
    "delay": 4,
    "delayUnit": "days",
    "content": {
      "subject": "Take a peek at your ceremony options",
      "previewText": "From outdoor ceremonies with panoramic views to indoor barn elegance.",
      "body": "Hi {{contact.first_name}}, one of the things couples love most about Promise Farm is having choices for your ceremony. Here is what you will find: OUTDOOR CEREMONY AREA - Say I do with panoramic countryside views as your backdrop. Our outdoor space features natural landscaping, plenty of photo opportunities, and room for up to 200 guests. INDOOR CEREMONY OPTION - Our climate-controlled barn creates an intimate, romantic atmosphere with stunning architectural details, beautiful lighting, and that cozy barn feel - perfect year-round. COCKTAIL HOUR SPACES - Guests can mingle in multiple areas while you take photos. The wrap-around porch, landscaped gardens, and open lawn spaces give everyone room to relax. RECEPTION BARN - Dinner and dancing happen in our gorgeous main barn, complete with chandeliers, a spacious dance floor, and flexible layout options. Want to see it all in person?"
    }
  }' | jq '.id'

# Touchpoint 4: FAQ - Day 6
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "a422da84-52dd-4427-827d-5a2139b92bf5",
    "name": "FAQ - Day 6",
    "type": "email",
    "order": 4,
    "delay": 6,
    "delayUnit": "days",
    "content": {
      "subject": "Questions other couples ask",
      "previewText": "We know wedding planning comes with lots of questions. Here are the ones we hear most often.",
      "body": "Hi {{contact.first_name}}, we know wedding planning comes with lots of questions. Here are the ones we hear most often: CAN WE BRING OUR OWN CATERER? Absolutely! We have a flexible vendor policy. Bring your favorite caterer, food truck, or handle it yourself. WHAT IS INCLUDED IN THE PACKAGE? Day-of coordination, tables and chairs, bridal suite access, parking attendants, and use of our getting-ready spaces. IS THERE A GUEST MINIMUM OR MAXIMUM? Our space comfortably accommodates weddings from 50 to 200 guests. WHAT ABOUT WEATHER FOR OUTDOOR CEREMONIES? We always have a backup plan! Our indoor ceremony space is equally beautiful. HOW FAR IN ADVANCE SHOULD WE BOOK? Prime dates (Saturdays in spring and fall) book 12-18 months ahead. But do not worry - we often have Friday and Sunday availability with shorter notice. Have other questions? We are just an email away!"
    }
  }' | jq '.id'

# Touchpoint 5: Social Proof - Day 9
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "a422da84-52dd-4427-827d-5a2139b92bf5",
    "name": "Social Proof - Day 9",
    "type": "email",
    "order": 5,
    "delay": 9,
    "delayUnit": "days",
    "content": {
      "subject": "What Sarah & Michael loved about their Promise Farm wedding",
      "previewText": "Do not just take our word for it. Here is what recent couples shared...",
      "body": "Hi {{contact.first_name}}, do not just take our word for it. Here is what Sarah and Michael shared after their June wedding: From our first tour, we knew Promise Farm was perfect. The flexibility to bring our own food truck and decorate exactly how we wanted made it feel so personal. The team handled everything on the day-of, so we could actually enjoy our wedding! Our guests are still talking about how beautiful the venue was. The photos with the rolling hills in the background are absolutely stunning. Best decision we made! The value is incredible - we got the rustic barn wedding of our dreams without going over budget. Your love story deserves a setting this special. Ready to see it for yourself?"
    }
  }' | jq '.id'

# Touchpoint 6: Final CTA - Day 12
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "a422da84-52dd-4427-827d-5a2139b92bf5",
    "name": "Final CTA - Day 12",
    "type": "email",
    "order": 6,
    "delay": 12,
    "delayUnit": "days",
    "content": {
      "subject": "Let us make your wedding day unforgettable",
      "previewText": "If Promise Farm feels like it could be the one, we would love to show you around.",
      "body": "Hi {{contact.first_name}}, I hope you have enjoyed learning about Promise Farm over the past couple of weeks. Wedding planning is such an exciting journey, and choosing your venue is one of the most important decisions you will make. If Promise Farm feels like it could be the one, I would love to show you around. There is nothing quite like experiencing the space in person - feeling the breeze on the ceremony lawn, walking through the barn as the chandeliers glow, and picturing your first dance. During your tour, we will: Walk through all the ceremony and reception spaces, Discuss your vision and how we can bring it to life, Review available dates and packages, Answer all your questions. Tours are free, no-pressure, and typically last about an hour. Bring your partner, your parents, or just come solo - whatever works for you."
    }
  }' | jq '.id'

# Touchpoint 7: Soft Breakup - Day 16
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "a422da84-52dd-4427-827d-5a2139b92bf5",
    "name": "Soft Breakup - Day 16",
    "type": "email",
    "order": 7,
    "delay": 16,
    "delayUnit": "days",
    "content": {
      "subject": "One last hello from Promise Farm",
      "previewText": "I have not heard back, so I wanted to check in one final time.",
      "body": "Hi {{contact.first_name}}, I have not heard back, so I wanted to check in one final time. I know choosing a venue is a big decision, and Promise Farm might not be the right fit for everyone - and that is okay! If you are still considering us: Tours are always available - just reach out, I am happy to answer any lingering questions, We can check date availability anytime. If you have chosen another venue, congratulations! Wishing you a beautiful wedding and a lifetime of happiness. And if your plans change down the road, we will be here. Warmly, The Promise Farm Team. P.S. Follow us on Instagram @promisefarm to see real weddings and get inspired!"
    }
  }' | jq '.id'

echo "All Promise Farm New Leads touchpoints created!"
