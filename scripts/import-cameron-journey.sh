#!/bin/bash

# Cameron Estate Journey ID: 882912c9-a942-4766-8c60-0c6f7d91c303
# Promise Farm Journey 1: client_promise_farm

# Touchpoint 1: Welcome Email - Immediate
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Welcome Email - Immediate",
    "type": "email",
    "order": 1,
    "delay": 0,
    "delayUnit": "hours",
    "content": {
      "subject": "Inside your Cameron Estate wedding, {{first_name}}",
      "previewText": "Your fairy tale has a home at Cameron Estate.",
      "body": "Hi there {{first_name}}, congratulations! I imagine you are hearing from quite a few venues right now, so let me share what makes Cameron Estate different. We are a historic inn (more than 225 years old!) where your entire wedding unfolds in one place. Your ceremony, reception, and guest accommodations—all here on the estate. Ready to visit? Most couples tell us they know within the first few minutes whether Cameron Estate feels right. I would love to give you that experience. View our complete details and pricing: https://cameronestateinn.com. To schedule your private tour, simply reply with 2-3 dates and times that work for you, and I will get you on the calendar. Warmly, Lisa, Wedding Specialist, Cameron Estate Inn, 717-725-4831, cameronsstateinn.com"
    }
  }' | jq '.id'

# Touchpoint 2: Initial Text - Immediate
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Initial Text - Immediate",
    "type": "sms",
    "order": 2,
    "delay": 0,
    "delayUnit": "hours",
    "content": {
      "body": "{{first_name}}, Hi! This is Lisa from Cameron Estate Inn. I just sent over our wedding information and pricing—everything should be in your inbox now. If texting is easier for questions, I am happy to answer here. Congratulations again on your engagement! - Lisa"
    }
  }' | jq '.id'

# Touchpoint 3: Morning Text - Day 2
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Morning Text - Day 2",
    "type": "sms",
    "order": 3,
    "delay": 1,
    "delayUnit": "days",
    "content": {
      "body": "Hi {{first_name}}, what questions can I answer about Cameron Estate? Most couples want to know about pricing, availability, or what is included in our all-inclusive packages. I am here to help! - Lisa"
    }
  }' | jq '.id'

# Touchpoint 4: Afternoon Email - Day 2
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Afternoon Email - Day 2",
    "type": "email",
    "order": 4,
    "delay": 1,
    "delayUnit": "days",
    "content": {
      "subject": "A few things I wish every couple knew before touring venues",
      "previewText": "You are about to see a lot of beautiful spaces. Here is what to actually pay attention to...",
      "body": "{{first_name}}, you are probably about to visit several venues over the next few weeks, and honestly? They are all going to look gorgeous. That is the easy part. Here is what I encourage couples to focus on instead—the stuff that actually affects your wedding day and the months leading up to it. Trust your gut when you walk in - Photos only tell you so much. When you visit in person, pay attention to: Can you actually see your wedding happening here? Does the space feel right for your vibe and guest count? Do you feel welcomed, or like you are being sold to? That last one matters more than you would think. Get clarity on what all-inclusive actually means - Every venue defines this differently, and it is where hidden costs love to hide. Worth asking everywhere you visit: What is included in your base price vs. what costs extra? At Cameron Estate, our per-person price covers everything—venue, catering, full bar, all rentals, and our team managing the details. Want to see how this works at Cameron Estate? I would love to show you around. Best, Lisa, Wedding Specialist, Cameron Estate Inn, 717-725-4831"
    }
  }' | jq '.id'

# Touchpoint 5: Morning Email - Day 3
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Morning Email - Day 3",
    "type": "email",
    "order": 5,
    "delay": 2,
    "delayUnit": "days",
    "content": {
      "subject": "We knew within minutes",
      "previewText": "Three couples share what made them choose Cameron Estate. Their stories might help you decide...",
      "body": "{{first_name}}, when couples tour Cameron Estate, they often tell me they knew within the first few minutes whether it was right for them. Not because we have the fanciest ballroom or the most acres—but because they could genuinely picture their wedding happening here. Here is what three recent couples told me about their decision: Jennifer & Michael said: We looked at five venues. Cameron Estate was the only one where we could actually see our day unfolding. The all-inclusive approach meant we were not stressed about coordinating vendors—we could just enjoy planning. Rachel & David said: Our families loved it as much as we did. Having everyone stay on-site for the weekend made our wedding feel less like an event and more like a celebration with the people we love most. Amanda & Chris said: The pricing was crystal clear from our first conversation. No surprises, no hidden fees. That peace of mind was worth everything. I do not know if Cameron Estate is the right fit for your celebration—only you can decide that. But if you are still exploring options, I would love to give you the same experience these couples had. Warmly, Lisa, Wedding Specialist, Cameron Estate Inn, 717-725-4831"
    }
  }' | jq '.id'

# Touchpoint 6: Evening Text - Day 3
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Evening Text - Day 3",
    "type": "sms",
    "order": 6,
    "delay": 2,
    "delayUnit": "days",
    "content": {
      "body": "{{first_name}}, I know you are probably looking at several venues right now. If Cameron Estate should be on your tour list, I would love to find a time that works. - Lisa"
    }
  }' | jq '.id'

# Touchpoint 7: Text - Day 4
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Text - Day 4",
    "type": "sms",
    "order": 7,
    "delay": 3,
    "delayUnit": "days",
    "content": {
      "body": "Hi {{first_name}}, what would make touring Cameron Estate easier for you? Weekend availability? Evening tours? Virtual walkthrough first? I will drop the link to book your perfect time below. Let me know how I can help. - Lisa"
    }
  }' | jq '.id'

# Touchpoint 8: Email - Day 5
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Email - Day 5",
    "type": "email",
    "order": 8,
    "delay": 4,
    "delayUnit": "days",
    "content": {
      "subject": "{{first_name}}, can you see it?",
      "previewText": "Close your eyes. Picture your wedding day. Where are you standing?",
      "body": "{{first_name}}, here is a question worth sitting with for a minute: When you picture your wedding day—really picture it—where are you? Can you see yourself walking down an aisle surrounded by trees? Hear the sound of your guests laughter floating across the lawn during cocktail hour? Feel what it is like to step into your reception and see everyone you love in one room? That feeling—that is what matters. Not the features list. Not the price comparison spreadsheet. Not even the logistics. The venue you choose should be the place where you can actually see your memories happening. I have watched hundreds of couples tour Cameron Estate, and the ones who book? They usually get quiet for a second during the tour. They look at each other. And you can see it click—they are not seeing a wedding anymore. They are seeing their wedding. Is that Cameron Estate for you? I do not know yet. But I would love to give you the chance to find out. Our calendar is filling up—a few couples who toured recently are making their final decisions this week. If you have been thinking about visiting, now is a good time. Just reply with 2-3 dates that work for you, and I will get you on the calendar. Warmly, Lisa, Wedding Specialist, Cameron Estate Inn, 717-725-4831"
    }
  }' | jq '.id'

# Touchpoint 9: Email - Day 7
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Email - Day 7",
    "type": "email",
    "order": 9,
    "delay": 6,
    "delayUnit": "days",
    "content": {
      "subject": "We made you a Pinterest board",
      "previewText": "Romantic garden party? Moody autumnal vibes? Black-tie elegance? Yes, yes, and yes...",
      "body": "{{first_name}}, quick question: What does your dream wedding look like? Soft and romantic with lots of candlelight? Bold and dramatic with rich, moody colors? Classic elegance? Boho garden party? Something totally unexpected that perfectly captures you two? Here is the thing about Cameron Estate—it works for all of it. We have hosted intimate garden ceremonies with 50 guests and grand ballroom celebrations with 200. That is why we created a Pinterest board for you. It is packed with real weddings from Cameron Estate showing just how versatile this space is: Romantic spring garden ceremonies under the trees, Elegant candlelit receptions in the Spring View Ballroom, Dramatic fall weddings with rich burgundy and gold, Intimate winter celebrations by the fireplace. Browse our Pinterest board here: https://www.pinterest.com/search/pins/?q=the%20cameron%20estate Happy pinning! Lisa, Wedding Specialist, Cameron Estate Inn, 717-725-4831"
    }
  }' | jq '.id'

# Touchpoint 10: Text - Day 9
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Text - Day 9",
    "type": "sms",
    "order": 10,
    "delay": 8,
    "delayUnit": "days",
    "content": {
      "body": "{{first_name}}, have you had a chance to check out our Pinterest board yet? I would love to hear more about your color palette! - Lisa"
    }
  }' | jq '.id'

# Touchpoint 11: Email - Day 10
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Email - Day 10",
    "type": "email",
    "order": 11,
    "delay": 9,
    "delayUnit": "days",
    "content": {
      "subject": "What all-inclusive really means at Cameron Estate",
      "previewText": "Not all all-inclusive packages are created equal. Here is exactly what is included in ours...",
      "body": "{{first_name}}, you are probably seeing all-inclusive at every venue you research. But here is what I have learned after years in this industry: that term means something different at every venue. Let me show you exactly what it means at Cameron Estate. WHAT IS INCLUDED: Venue & Spaces - Ceremony location, Cocktail hour space, Reception ballroom, No separate venue rental fee. Food & Beverage - Full plated dinner service, Champagne toast, Premium open bar, Bartender services, All glassware, china, flatware. Rentals & Decor - Tables and chairs, Linens, Centerpiece vases, Cake cutting. Staffing & Coordination - Event coordinator, Professional wait staff, Bar staff, Setup and cleanup crew. Instead of coordinating with a venue, caterer, rental company, bar service, day-of coordinator, and setup crew—you coordinate with one person at one place. Want to see how this works in person? Reply with a few dates for your tour. Best, Lisa, Wedding Specialist, Cameron Estate Inn, 717-725-4831"
    }
  }' | jq '.id'

# Touchpoint 12: Email - Day 12
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Email - Day 12",
    "type": "email",
    "order": 12,
    "delay": 11,
    "delayUnit": "days",
    "content": {
      "subject": "Questions couples ask at this stage",
      "previewText": "You are probably wondering about deposits, cancellations, and what-ifs. Let me answer those now...",
      "body": "{{first_name}}, twelve days into your venue search, most couples are asking themselves similar questions. Let me address what I hear most often: WHAT IF WE FIND SOMETHING BETTER? You might. But you have now seen Cameron Estate and know what matters to you. IS THE PRICING REALLY FINAL? Yes. Your proposal includes everything we discussed. No surprises, no hidden fees. WHAT IF WE NEED TO CANCEL? Life happens, and we understand that. Our deposit structure: Initial deposit holds your date, Payment schedule spreads remaining balance over your engagement, Cancellation and postponement terms are clear and fair. HOW DO WE KNOW IT IS THE RIGHT CHOICE? Honestly? You will not know completely until your wedding day. But most couples tell us they felt relief, not anxiety, when they made their decision. Take your time. Good decisions are not rushed—but our calendar is real, and availability does shift. Best, Lisa, Wedding Specialist, Cameron Estate Inn"
    }
  }' | jq '.id'

# Touchpoint 13: Text - Day 12
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Text - Day 12",
    "type": "sms",
    "order": 13,
    "delay": 11,
    "delayUnit": "days",
    "content": {
      "body": "{{first_name}}, this is my last note. If you would like to see Cameron Estate, I am here anytime. If you have chosen another direction, I wish you the very best. Congratulations on your wedding! - Lisa"
    }
  }' | jq '.id'

# Touchpoint 14: Email - Day 14
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "882912c9-a942-4766-8c60-0c6f7d91c303",
    "name": "Email - Day 14",
    "type": "email",
    "order": 14,
    "delay": 13,
    "delayUnit": "days",
    "content": {
      "subject": "Wishing you the best, {{first_name}}",
      "previewText": "I have not heard from you, which tells me you have likely found your venue. Congratulations, and best wishes...",
      "body": "{{first_name}}, I have not heard from you over the past two weeks, which tells me you have likely found your perfect venue or are exploring other directions. I wanted to close our conversation properly, with genuine best wishes for your wedding celebration—wherever it takes place. If Cameron Estate becomes relevant to your planning again at any point, I am here: Schedule a tour: https://cameronestateinn.com, Call me directly: 717-725-4831, Email anytime: lisa@cameronestateinn.com. Thank you for considering Cameron Estate for your special day. I hope your wedding is everything you are dreaming of. Warmly, Lisa, Wedding Specialist, Cameron Estate Inn, 717-725-4831, cameronsstateinn.com"
    }
  }' | jq '.id'

echo "All Cameron Estate touchpoints created!"
