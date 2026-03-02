#!/bin/bash

# Promise Farm "Tour Reminders" Journey ID: 22b7fc5c-5de9-4ed7-bfe0-1fff22957410

# Touchpoint 1: Tour Confirmation - Immediate
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "22b7fc5c-5de9-4ed7-bfe0-1fff22957410",
    "name": "Tour Confirmation - Immediate",
    "type": "email",
    "order": 1,
    "delay": 0,
    "delayUnit": "hours",
    "content": {
      "subject": "You are all set! See you {{tour_date}}",
      "previewText": "Great news! Your tour at Promise Farm is confirmed.",
      "body": "Hi {{contact.first_name}}, great news! Your tour at Promise Farm is confirmed. DATE: {{tour_date}}, TIME: {{tour_time}}, LOCATION: Promise Farm, Lancaster County, PA. We are so excited to show you around and help you envision your wedding day here! During your tour, you will see: Our gorgeous ceremony spaces (both indoor and outdoor options), The climate-controlled reception barn with chandeliers, The bridal suite where you will get ready, All the photo-worthy spots throughout the property. WHAT TO EXPECT: Your tour will last about 60 minutes. We will walk the property together, discuss your vision, answer questions, and check date availability. Bring your partner, your parents, or come just the two of you - whoever needs to see the space! WHAT TO BRING: Any inspiration photos or Pinterest boards, Your approximate guest count, Questions! (We love questions). If you need to reschedule, just reply to this email or call us. Life happens, and we totally understand. Cannot wait to meet you! The Promise Farm Team"
    }
  }' | jq '.id'

# Touchpoint 2: Excitement Builder - 3 Days Before
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "22b7fc5c-5de9-4ed7-bfe0-1fff22957410",
    "name": "Excitement Builder - 3 Days Before",
    "type": "email",
    "order": 2,
    "delay": -3,
    "delayUnit": "days",
    "content": {
      "subject": "3 days until your Promise Farm tour!",
      "previewText": "Your tour is just around the corner, and we cannot wait to meet you!",
      "body": "Hi {{contact.first_name}}, your tour is just around the corner, and we cannot wait to meet you! As you prepare for your visit, here are a few things couples often tell us they appreciated most about Promise Farm: THE SETTING - There is something magical about standing on our ceremony lawn, feeling the breeze, and looking out at the rolling Lancaster County hills. It is the kind of moment that makes you say this is it. THE BARN - Our restored barn strikes that perfect balance - rustic enough to feel authentic, elegant enough to feel special. Those chandeliers! THE FLEXIBILITY - Every wedding here is unique because we let YOU make the choices. Your caterer, your style, your way. THE VALUE - Couples are consistently surprised (in a good way!) by our pricing. Beautiful weddings do not have to drain your savings. We recommend arriving about 5 minutes early so we can start right on time. And do not worry about the weather - if it is raining, we will adjust the tour route and show you how cozy the indoor spaces are! See you soon!"
    }
  }' | jq '.id'

# Touchpoint 3: Logistics & Day-Before Reminder
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "22b7fc5c-5de9-4ed7-bfe0-1fff22957410",
    "name": "Logistics & Day-Before Reminder",
    "type": "email",
    "order": 3,
    "delay": -1,
    "delayUnit": "days",
    "content": {
      "subject": "Tomorrow is the day! Final details for your tour",
      "previewText": "Just one more sleep until your Promise Farm tour!",
      "body": "Hi {{contact.first_name}}, just one more sleep until your Promise Farm tour! We wanted to send over a few final details to make tomorrow smooth and enjoyable. DIRECTIONS & PARKING - Promise Farm is located in Lancaster County, PA. When you arrive, you will see a gravel parking area on the right. Park anywhere that is convenient - we will meet you at the main entrance to the barn. TIMING - Your tour starts at {{tour_time}} and will last about an hour. We will walk the property together, so wear comfortable shoes you do not mind getting a little dusty (it is a farm, after all!). WEATHER - Current forecast: {{weather_forecast}}. If rain is expected, do not worry! We have umbrellas and we will show you how the indoor spaces work beautifully as backup options. BRINGING GUESTS? Totally fine! Just let us know how many people to expect so we can plan accordingly. QUESTIONS TO CONSIDER: What is your estimated guest count?, Do you have a preferred season or specific dates in mind?, Any must-haves for your venue? If you need to reach us tomorrow, call or text: {{phone_number}}. See you tomorrow! The Promise Farm Team"
    }
  }' | jq '.id'

# Touchpoint 4: Day-Of SMS Reminder
curl -s -X POST https://bloom-backend.zeabur.app/api/touchpoints \
  -H "Content-Type: application/json" \
  -d '{
    "journeyId": "22b7fc5c-5de9-4ed7-bfe0-1fff22957410",
    "name": "Day-Of SMS Reminder",
    "type": "sms",
    "order": 4,
    "delay": -2,
    "delayUnit": "hours",
    "content": {
      "body": "Hi {{contact.first_name}}! This is Promise Farm confirming your tour today at {{tour_time}}. We are excited to show you around! Drive safely - see you soon! Reply STOP to opt out."
    }
  }' | jq '.id'

echo "All Promise Farm Tour Reminders touchpoints created!"
