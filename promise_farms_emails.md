That is a very smart call! GoHighLevel does automatically append its own compliance footer, so having a duplicate unsubscribe link hardcoded in your template would look messy and confusing.

I have stripped the entire unsubscribe footer section (`<tr>...</tr>`) out of all four emails. They are now 100% ready to be pasted into the GHL HTML builder with `{{contact.first_name}}` in place and Judy's hardcoded info kept exactly as requested.

Here are all four, fully cleaned up and ready to go:

### 1. The Welcome Email

```html
    <title></title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
      #outlook a { padding:0; }
      body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
      p { display:block;margin:13px 0; }
    </style>
    <link href="https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700" rel="stylesheet" type="text/css">
        <style type="text/css">
          @import url(https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700);
        </style>
      <style type="text/css">
      @media only screen and (min-width:480px) {
        .mj-column-per-100 { width:100% !important; max-width: 100%; }
      }
    </style>
    <style media="screen and (min-width:480px)">
      .moz-text-html .mj-column-per-100 { width:100% !important; max-width: 100%; }
    </style>
    
    
  
    
    <style type="text/css">

    @media only screen and (max-width:480px) {
      table.mj-full-width-mobile { width: 100% !important; }
      td.mj-full-width-mobile { width: auto !important; }
    }
  
    </style>
     
    <style type="text/css">
/* custom styles */ @import url('https://fonts.bunny.net/css?family=');
@import url('https://fonts.bunny.net/css?family=:bold');
@media (min-width:481px) {
        .mj-desktop-hidden-element {
          display: none !important;
        }
      }
      li p {
        margin:0 !important;
      }
      p a, h1 a, h2 a, h3 a, h4 a, h5 a, li a {
        color: inherit!important;
        text-decoration-color: inherit!important;
        text-decoration: underline;
        font-weight: inherit;
        font-style:inherit;
      }
      a span {
        text-decoration: underline!important;
        color: inherit;
      }
      span.ellipsis-text {
        display: -webkit-box;
        height:5lh;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      h3.ellipsis-title-text {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        height: 1lh;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .mj-accordion-title td > * {
        margin: 0;
      }
      p {
        min-height:1lh;
      }
      @media (max-width:480px) {
       .mj-desktop-hidden-element {display:block !important;}.mj-small-device-hidden-element {display:none !important;}
      }
    </style>
    
  
  
    
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">A link to our wedding guide is inside...</div>
  
    
      <div class="email-content" style="background-color:#F8F8F8;background-image:url('');background-repeat:no-repeat;background-size:cover;background-position:center center;">
        
      
      <div style="overflow:hidden;">
      <div style="background:#ffffff;background-color:#ffffff;border-width:0px;margin:0px auto 0px auto;border-color:transparent;border-radius:0px;max-width:600px;">
        
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;border-radius:0px;">
          <tbody>
            <tr>
              <td style="padding:20px 0;padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;border-color:transparent;direction:ltr;font-size:0px;text-align:center;">
                <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
        
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
          <tbody>
            
                      
                    <tr>
                    <td align="center" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
        <tbody>
          <tr>
            <td style="width:200px;">
              
      <img height="auto" src="https://storage.googleapis.com/msgsndr/kajnEb8ZVVcK73tdq7XL/media/666cb0a4be9f7639ead47bc9.png" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="200" countdown-timer-hide-for-apple-mail="false">
    
            </td>
          </tr>
        </tbody>
      </table>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="left" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <div style="font-family:arial, helvetica, sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;"><p><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">Hi {{contact.first_name}}!</span></p><p><span style="font-family: arial, helvetica, sans-serif">Congratulations! You're getting married! 🎉 I’m so excited that you’re considering <strong data-start="391" data-end="407">Promise Farm</strong> for your wedding day. Choosing the right venue is one of the biggest decisions you’ll make, and my goal is to make that process as easy, enjoyable, and stress-free as possible.</span></p></div>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="center" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
        <tbody>
          <tr>
            <td style="width:348px;">
              
      <img height="348" src="https://storage.googleapis.com/msgsndr/kajnEb8ZVVcK73tdq7XL/media/666cad60ba45919ff5636032.gif" style="border:0;display:block;outline:none;text-decoration:none;height:348px;width:100%;font-size:13px;" width="348" countdown-timer-hide-for-apple-mail="false">
    
            </td>
          </tr>
        </tbody>
      </table>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="left" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <div style="font-family:arial, helvetica, sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;"><h3 data-start="587" data-end="622">Why Couples Love Promise Farm</h3><p data-start="624" data-end="906"><strong data-start="624" data-end="655">✨ Beautiful in Every Season</strong><br>Our charming, climate-controlled barn offers comfort year-round, so your guests stay cozy in winter and cool in summer. Spring and summer weddings are especially magical, with lush greenery and colorful blooms creating the perfect photo backdrop.</p><p data-start="908" data-end="1144"><strong data-start="908" data-end="933">💍 Your Day, Your Way</strong><br>We believe your wedding should reflect <em data-start="975" data-end="980">you</em>. That’s why we offer one of the area’s most flexible vendor policies. You can bring your favorite caterer, decorator, or any other vendor to make your day truly personal.</p><p data-start="1146" data-end="1262"><strong data-start="1146" data-end="1170">💰 Affordable Luxury</strong><br>Promise Farm is one of Lancaster’s most sought-after venues—without the high price tag.</p><ul data-start="1263" data-end="1381"><li data-start="1263" data-end="1310"><p data-start="1265" data-end="1310"><strong data-start="1265" data-end="1308">Friday and Sunday weddings are $3000</strong></p></li><li data-start="1311" data-end="1381"><p data-start="1313" data-end="1381"><strong data-start="1313" data-end="1349">Saturday weddings are $4000</strong></p></li></ul><p data-start="1495" data-end="1631"><strong data-start="1539" data-end="1583">💖 Everything You Need, All in One Place</strong><br>From a spacious bridal suite and on-site parking to a full list of amenities for up to 200 guests, Promise Farm makes planning easier.</p><br><h3 data-start="1779" data-end="1810">Come Experience the Magic</h3><p data-start="1812" data-end="1972">The best way to fall in love with Promise Farm is to visit in person. Schedule a tour today and see why so many couples choose us for their big day.</p><p data-start="1974" data-end="2131">If you have any questions or would like to chat about your vision, just reply to this email or call/text me directly. I’d love to help you start planning!</p></div>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="center" class="mj-small-device-button " style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
        <tbody>
          <tr>
            <td align="center" bgcolor="#0B5064" role="presentation" style="border:0px solid #00a4bd;border-radius:0px;cursor:auto;mso-padding-alt:10px 25px;background:#0B5064;" valign="middle">
              <a href="https://promise-farm.com/venue-tour/" style="display:inline-block;background:#0B5064;color:#ffffff;font-family:arial, helvetica, sans-serif;font-size:16px;font-weight:normal;line-height:1.25;margin:0;text-decoration:none;text-transform:none;padding:10px 25px;mso-padding-alt:0px;border-radius:0px;" target="_blank">
                Schedule a Tour
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="center" class="mj-small-device-button " style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
        <tbody>
          <tr>
            <td align="center" bgcolor="#0B5064" role="presentation" style="border:0px solid #00a4bd;border-radius:0px;cursor:auto;mso-padding-alt:10px 25px;background:#0B5064;" valign="middle">
              <a href="https://promise-farm.com/wp-content/uploads/2026/01/Promise-Farm-Pricing-Guide-01-2026.pdf" style="display:inline-block;background:#0B5064;color:#ffffff;font-family:arial, helvetica, sans-serif;font-size:16px;font-weight:normal;line-height:1.25;margin:0;text-decoration:none;text-transform:none;padding:10px 25px;mso-padding-alt:0px;border-radius:0px;" target="_blank">
                Download Our Brochure
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="left" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <div style="font-family:arial, helvetica, sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;"><p><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">Warm wishes,</span><span style="font-family: arial, helvetica, sans-serif"><br><br></span><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif"><strong>Judy</strong></span><span style="font-family: arial, helvetica, sans-serif"><br></span><a target="_blank" rel="noopener noreferrer nofollow" href="http://Promise-Farm.com"><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">Promise-Farm.com</span></a><span style="font-family: arial, helvetica, sans-serif"><br></span><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">p. 717-368-4109</span></p></div>
    
                    </td>
                  </tr>
                    
          </tbody>

        </table>
    
      </div>
    
          </td>
            </tr>
          </tbody>
        </table>
        
      </div>
    </div>
    
    
      
      </div>

```

---

### 2. The Second Touch

```html
    <title></title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
      #outlook a { padding:0; }
      body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
      p { display:block;margin:13px 0; }
    </style>
    <link href="https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700" rel="stylesheet" type="text/css">
        <style type="text/css">
          @import url(https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700);
        </style>
      <style type="text/css">
      @media only screen and (min-width:480px) {
        .mj-column-per-100 { width:100% !important; max-width: 100%; }
      }
    </style>
    <style media="screen and (min-width:480px)">
      .moz-text-html .mj-column-per-100 { width:100% !important; max-width: 100%; }
    </style>
    
    
  
    
    <style type="text/css">

    @media only screen and (max-width:480px) {
      table.mj-full-width-mobile { width: 100% !important; }
      td.mj-full-width-mobile { width: auto !important; }
    }
  
    </style>
     
    <style type="text/css">
/* custom styles */ @import url('https://fonts.bunny.net/css?family=');
@import url('https://fonts.bunny.net/css?family=:bold');
@media (min-width:481px) {
        .mj-desktop-hidden-element {
          display: none !important;
        }
      }
      li p {
        margin:0 !important;
      }
      p a, h1 a, h2 a, h3 a, h4 a, h5 a, li a {
        color: inherit!important;
        text-decoration-color: inherit!important;
        text-decoration: underline;
        font-weight: inherit;
        font-style:inherit;
      }
      a span {
        text-decoration: underline!important;
        color: inherit;
      }
      span.ellipsis-text {
        display: -webkit-box;
        height:5lh;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      h3.ellipsis-title-text {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        height: 1lh;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .mj-accordion-title td > * {
        margin: 0;
      }
      p {
        min-height:1lh;
      }
      @media (max-width:480px) {
       .mj-desktop-hidden-element {display:block !important;}.mj-small-device-hidden-element {display:none !important;}
      }
    </style>
    
  
  
    
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">A link to our wedding guide is inside...</div>
  
    
      <div class="email-content" style="background-color:#F8F8F8;background-image:url('');background-repeat:no-repeat;background-size:cover;background-position:center center;">
        
      
      <div style="overflow:hidden;">
      <div style="background:#ffffff;background-color:#ffffff;border-width:0px;margin:0px auto 0px auto;border-color:transparent;border-radius:0px;max-width:600px;">
        
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;border-radius:0px;">
          <tbody>
            <tr>
              <td style="padding:20px 0;padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;border-color:transparent;direction:ltr;font-size:0px;text-align:center;">
                <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
        
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
          <tbody>
            
                      
                    <tr>
                    <td align="center" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
        <tbody>
          <tr>
            <td style="width:200px;">
              
      <img height="auto" src="https://storage.googleapis.com/msgsndr/kajnEb8ZVVcK73tdq7XL/media/666cb0a4be9f7639ead47bc9.png" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="200" countdown-timer-hide-for-apple-mail="false">
    
            </td>
          </tr>
        </tbody>
      </table>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="left" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <div style="font-family:arial, helvetica, sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;"><p><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">Hi {{contact.first_name}}!</span></p><p>I wanted to follow up to see how your wedding planning is coming along and to make sure you don’t miss out on what Promise Farm has to offer!</p><p data-start="477" data-end="635">Finding the right venue sets the tone for your entire celebration, and Promise Farm was designed with that in mind — beautiful, flexible, and unforgettable.</p></div>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="center" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
        <tbody>
          <tr>
            <td style="width:348px;">
              
      <img height="348" src="https://storage.googleapis.com/msgsndr/kajnEb8ZVVcK73tdq7XL/media/666cad60ba45919ff5636032.gif" style="border:0;display:block;outline:none;text-decoration:none;height:348px;width:100%;font-size:13px;" width="348" countdown-timer-hide-for-apple-mail="false">
    
            </td>
          </tr>
        </tbody>
      </table>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="left" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <div style="font-family:arial, helvetica, sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;"><h3 data-start="637" data-end="681">Here’s What Makes Promise Farm Special</h3><p data-start="683" data-end="979"><strong data-start="683" data-end="724">🌿 Timeless Charm, Year-Round Comfort</strong><br>Our climate-controlled barn combines rustic elegance with modern convenience, so your guests are comfortable no matter the season. Picture spring gardens in full bloom, golden sunsets over the fields, and cozy winter celebrations by soft candlelight.</p><p data-start="981" data-end="1206"><strong data-start="981" data-end="1010">🎉 Freedom to Personalize</strong><br>Your wedding should reflect your unique story. That’s why we welcome your favorite caterers, florists, and decorators — giving you complete freedom to create a celebration that’s truly <em data-start="1198" data-end="1203">you</em>.</p><p data-start="1208" data-end="1297"><strong data-start="1208" data-end="1242">💸 Great Value, Gorgeous Venue</strong><br>Our pricing keeps your dream wedding within reach:</p><ul data-start="1298" data-end="1408"><li data-start="1298" data-end="1341"><p data-start="1300" data-end="1341"><strong data-start="1300" data-end="1339">Friday and Sunday weddings are $3000</strong></p></li><li data-start="1342" data-end="1408"><p data-start="1344" data-end="1408"><strong data-start="1344" data-end="1376">Saturday weddings are $4000</strong></p></li></ul><p data-start="1539" data-end="1777"><strong data-start="1539" data-end="1583">💖 Everything You Need, All in One Place</strong><br>From a spacious bridal suite and on-site parking to a full list of amenities for up to 200 guests, Promise Farm makes planning easier. </p><h3 data-start="1779" data-end="1810">Come Experience the Magic</h3><p data-start="1812" data-end="1972">The best way to fall in love with Promise Farm is to visit in person. Schedule a tour today and see firsthand why so many couples choose us for their big day.</p><p data-start="1974" data-end="2131">If you have any questions or would like to chat about your vision, just reply to this email or call/text me directly — I’d love to help you start planning!</p></div>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="center" class="mj-small-device-button " style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
        <tbody>
          <tr>
            <td align="center" bgcolor="#0B5064" role="presentation" style="border:0px solid #00a4bd;border-radius:0px;cursor:auto;mso-padding-alt:10px 25px;background:#0B5064;" valign="middle">
              <a href="https://promise-farm.com/venue-tour/" style="display:inline-block;background:#0B5064;color:#ffffff;font-family:arial, helvetica, sans-serif;font-size:16px;font-weight:normal;line-height:1.25;margin:0;text-decoration:none;text-transform:none;padding:10px 25px;mso-padding-alt:0px;border-radius:0px;" target="_blank">
                Schedule Venue Tour
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="center" class="mj-small-device-button " style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
        <tbody>
          <tr>
            <td align="center" bgcolor="#0B5064" role="presentation" style="border:0px solid #00a4bd;border-radius:0px;cursor:auto;mso-padding-alt:10px 25px;background:#0B5064;" valign="middle">
              <a href="https://promise-farm.com/wp-content/uploads/2026/01/Promise-Farm-Pricing-Guide-01-2026.pdf" style="display:inline-block;background:#0B5064;color:#ffffff;font-family:arial, helvetica, sans-serif;font-size:16px;font-weight:normal;line-height:1.25;margin:0;text-decoration:none;text-transform:none;padding:10px 25px;mso-padding-alt:0px;border-radius:0px;" target="_blank">
                Download Our Brochure
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="left" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <div style="font-family:arial, helvetica, sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;"><p><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">Warm wishes,</span><span style="font-family: arial, helvetica, sans-serif"><br><br></span><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif"><strong>Judy</strong></span><span style="font-family: arial, helvetica, sans-serif"><br></span><a target="_blank" rel="noopener noreferrer nofollow" href="http://Promise-Farm.com"><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">Promise-Farm.com</span></a><span style="font-family: arial, helvetica, sans-serif"><br></span><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">p. 717-368-4109</span></p></div>
    
                    </td>
                  </tr>
                    
          </tbody>

        </table>
    
      </div>
    
          </td>
            </tr>
          </tbody>
        </table>
        
      </div>
    </div>
    
    
      
      </div>

```

---

### 3. The Urgency Email

```html
    <title></title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
      #outlook a { padding:0; }
      body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
      p { display:block;margin:13px 0; }
    </style>
    <link href="https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700" rel="stylesheet" type="text/css">
        <style type="text/css">
          @import url(https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700);
        </style>
      <style type="text/css">
      @media only screen and (min-width:480px) {
        .mj-column-per-100 { width:100% !important; max-width: 100%; }
      }
    </style>
    <style media="screen and (min-width:480px)">
      .moz-text-html .mj-column-per-100 { width:100% !important; max-width: 100%; }
    </style>
    
    
  
    
    <style type="text/css">

    @media only screen and (max-width:480px) {
      table.mj-full-width-mobile { width: 100% !important; }
      td.mj-full-width-mobile { width: auto !important; }
    }
  
    </style>
     
    <style type="text/css">
/* custom styles */ @import url('https://fonts.bunny.net/css?family=');
@import url('https://fonts.bunny.net/css?family=:bold');
@media (min-width:481px) {
        .mj-desktop-hidden-element {
          display: none !important;
        }
      }
      li p {
        margin:0 !important;
      }
      p a, h1 a, h2 a, h3 a, h4 a, h5 a, li a {
        color: inherit!important;
        text-decoration-color: inherit!important;
        text-decoration: underline;
        font-weight: inherit;
        font-style:inherit;
      }
      a span {
        text-decoration: underline!important;
        color: inherit;
      }
      span.ellipsis-text {
        display: -webkit-box;
        height:5lh;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      h3.ellipsis-title-text {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        height: 1lh;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .mj-accordion-title td > * {
        margin: 0;
      }
      p {
        min-height:1lh;
      }
      @media (max-width:480px) {
       .mj-desktop-hidden-element {display:block !important;}.mj-small-device-hidden-element {display:none !important;}
      }
    </style>
    
  
  
    
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">Book a venue tour today</div>
  
    
      <div class="email-content" style="background-color:#F8F8F8;background-image:url('');background-repeat:no-repeat;background-size:cover;background-position:center center;">
        
      
      <div style="overflow:hidden;">
      <div style="background:#ffffff;background-color:#ffffff;border-width:0px;margin:0px auto 0px auto;border-color:transparent;border-radius:0px;max-width:600px;">
        
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;border-radius:0px;">
          <tbody>
            <tr>
              <td style="padding:20px 0;padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;border-color:transparent;direction:ltr;font-size:0px;text-align:center;">
                <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
        
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
          <tbody>
            
                      
                    <tr>
                    <td align="center" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
        <tbody>
          <tr>
            <td style="width:200px;">
              
      <img height="auto" src="https://storage.googleapis.com/msgsndr/kajnEb8ZVVcK73tdq7XL/media/666cb0a4be9f7639ead47bc9.png" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="200" countdown-timer-hide-for-apple-mail="false">
    
            </td>
          </tr>
        </tbody>
      </table>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="left" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <div style="font-family:arial, helvetica, sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;"><p><span style="font-family: arial, helvetica, sans-serif">Hi {{contact.first_name}}!</span></p><p>I just wanted to check in and see how your venue search is going! If you’re still looking for that perfect place to say “I do,” I’d love for you to experience everything <strong data-start="474" data-end="490">Promise Farm</strong> has to offer.</p><p data-start="508" data-end="672">Our goal is to make your wedding planning journey as joyful and stress-free as the celebration itself. Here’s what couples love most about hosting their day here:</p><h3 data-start="674" data-end="719">💐 A Beautiful Setting for Every Season</h3><p data-start="720" data-end="948">Whether surrounded by spring blooms, lush summer greens, or the cozy glow of fall, Promise Farm provides a stunning backdrop all year long. Our climate-controlled barn ensures your guests are comfortable no matter the weather.</p><h3 data-start="950" data-end="981">💍 Your Wedding, Your Way</h3><p data-start="982" data-end="1228">We believe every couple deserves a celebration that reflects their unique style. That’s why Promise Farm offers one of the most flexible vendor policies around — giving you the freedom to choose your favorite caterers, decorators, and planners.</p><h3 data-start="1230" data-end="1280">🏡 Thoughtful Details That Make a Difference</h3><p data-start="1281" data-end="1534">From a spacious bridal suite to beautiful outdoor photo spots, we’ve thought of every detail to make your day seamless and unforgettable. Our venue comfortably accommodates up to 200 guests, offering a perfect blend of charm, comfort, and convenience.</p><h3 data-start="1644" data-end="1671">Come See for Yourself</h3><p data-start="1672" data-end="1877">Photos don’t do Promise Farm justice — it’s truly something you have to experience in person. Schedule your visit today and picture yourself walking down the aisle surrounded by the people you love most.</p><p data-start="1879" data-end="2027">If you have any questions or want to set up a tour, just reply to this email or call/text me anytime. I’d love to help you find your perfect date!</p></div>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="center" class="mj-small-device-button " style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
        <tbody>
          <tr>
            <td align="center" bgcolor="#0B5064" role="presentation" style="border:0px solid #00a4bd;border-radius:0px;cursor:auto;mso-padding-alt:10px 25px;background:#0B5064;" valign="middle">
              <a href="https://promise-farm.com/venue-tour/" style="display:inline-block;background:#0B5064;color:#ffffff;font-family:arial, helvetica, sans-serif;font-size:16px;font-weight:normal;line-height:1.25;margin:0;text-decoration:none;text-transform:none;padding:10px 25px;mso-padding-alt:0px;border-radius:0px;" target="_blank">
                Schedule a Tour
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="left" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <div style="font-family:arial, helvetica, sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;"><p><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">Warm wishes,</span><span style="font-family: arial, helvetica, sans-serif"><br><br></span><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif"><strong>Judy</strong></span><span style="font-family: arial, helvetica, sans-serif"><br></span><a target="_blank" rel="noopener noreferrer nofollow" href="http://Promise-Farm.com"><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">Promise-Farm.com</span></a><span style="font-family: arial, helvetica, sans-serif"><br></span><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">p. 717-368-4109</span></p></div>
    
                    </td>
                  </tr>
                    
          </tbody>

        </table>
    
      </div>
    
          </td>
            </tr>
          </tbody>
        </table>
        
      </div>
    </div>
    
    
      
      </div>

```

---

### 4. The Final Check-In

```html
    <title></title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
      #outlook a { padding:0; }
      body { margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
      table, td { border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt; }
      img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none;-ms-interpolation-mode:bicubic; }
      p { display:block;margin:13px 0; }
    </style>
    <link href="https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700" rel="stylesheet" type="text/css">
        <style type="text/css">
          @import url(https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700);
        </style>
      <style type="text/css">
      @media only screen and (min-width:480px) {
        .mj-column-per-100 { width:100% !important; max-width: 100%; }
      }
    </style>
    <style media="screen and (min-width:480px)">
      .moz-text-html .mj-column-per-100 { width:100% !important; max-width: 100%; }
    </style>
    
    
  
    
    <style type="text/css">

    @media only screen and (max-width:480px) {
      table.mj-full-width-mobile { width: 100% !important; }
      td.mj-full-width-mobile { width: auto !important; }
    }
  
    </style>
     
    <style type="text/css">
/* custom styles */ @import url('https://fonts.bunny.net/css?family=');
@import url('https://fonts.bunny.net/css?family=:bold');
@media (min-width:481px) {
        .mj-desktop-hidden-element {
          display: none !important;
        }
      }
      li p {
        margin:0 !important;
      }
      p a, h1 a, h2 a, h3 a, h4 a, h5 a, li a {
        color: inherit!important;
        text-decoration-color: inherit!important;
        text-decoration: underline;
        font-weight: inherit;
        font-style:inherit;
      }
      a span {
        text-decoration: underline!important;
        color: inherit;
      }
      span.ellipsis-text {
        display: -webkit-box;
        height:5lh;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      h3.ellipsis-title-text {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        height: 1lh;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .mj-accordion-title td > * {
        margin: 0;
      }
      p {
        min-height:1lh;
      }
      @media (max-width:480px) {
       .mj-desktop-hidden-element {display:block !important;}.mj-small-device-hidden-element {display:none !important;}
      }
    </style>
    
  
  
    
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">Checking in to see if you're still interested</div>
  
    
      <div class="email-content" style="background-color:#F8F8F8;background-image:url('');background-repeat:no-repeat;background-size:cover;background-position:center center;">
        
      
      <div style="overflow:hidden;">
      <div style="background:#ffffff;background-color:#ffffff;border-width:0px;margin:0px auto 0px auto;border-color:transparent;border-radius:0px;max-width:600px;">
        
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;border-radius:0px;">
          <tbody>
            <tr>
              <td style="padding:20px 0;padding-bottom:10px;padding-left:20px;padding-right:20px;padding-top:10px;border-color:transparent;direction:ltr;font-size:0px;text-align:center;">
                <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
        
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
          <tbody>
            
                      
                    <tr>
                    <td align="center" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
        <tbody>
          <tr>
            <td style="width:200px;">
              
      <img height="auto" src="https://storage.googleapis.com/msgsndr/kajnEb8ZVVcK73tdq7XL/media/666cb0a4be9f7639ead47bc9.png" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="200" countdown-timer-hide-for-apple-mail="false">
    
            </td>
          </tr>
        </tbody>
      </table>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="left" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <div style="font-family:arial, helvetica, sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;"><p><span style="font-family: arial, helvetica, sans-serif">Hi {{contact.first_name}}!</span></p><p><span style="font-family: arial, helvetica, sans-serif">It’s been a while since we first connected, and we know wedding planning can feel like building your ultimate Pinterest board—full of excitement but sometimes a bit overwhelming! When you get a moment between pinning ideas and making decisions, could you let us know if Promise Farm is still in your wedding plans?</span></p><p><span style="font-family: arial, helvetica, sans-serif">If we’re still a favorite, fantastic! Save this email because it has all my contact info. </span></p><p><span style="font-family: arial, helvetica, sans-serif"><strong>Judy - </strong></span><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif"><strong>judy@promise-farm.com</strong></span></p><p><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif"><strong>717-368-4109 </strong></span></p><p><span style="font-family: arial, helvetica, sans-serif">I’m here and ready whenever you need me.</span></p><p><span style="font-family: arial, helvetica, sans-serif">But if you’ve found another venue that’s your new favorite pin, no worries! You can unsubscribe by clicking the link below (we promise not to take it personally). If you stick around, we’ll pop into your inbox occasionally with updates and some wedding inspiration.</span></p><p><span style="font-family: arial, helvetica, sans-serif">Wishing you all the best and happy pinning!</span></p></div>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="center" class="mj-small-device-button " style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
        <tbody>
          <tr>
            <td align="center" bgcolor="#0B5064" role="presentation" style="border:0px solid #00a4bd;border-radius:0px;cursor:auto;mso-padding-alt:10px 25px;background:#0B5064;" valign="middle">
              <a href="https://promise-farm.com/venue-tour/" style="display:inline-block;background:#0B5064;color:#ffffff;font-family:arial, helvetica, sans-serif;font-size:16px;font-weight:normal;line-height:1.25;margin:0;text-decoration:none;text-transform:none;padding:10px 25px;mso-padding-alt:0px;border-radius:0px;" target="_blank">
                Schedule a Tour
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    
                    </td>
                  </tr>
                    
                    
                      
                    <tr>
                    <td align="left" style="font-size:0px;padding:10px 25px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;word-break:break-word;">
                      
      <div style="font-family:arial, helvetica, sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;"><p><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">Warm wishes,</span><span style="font-family: arial, helvetica, sans-serif"><br><br></span><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif"><strong>Judy</strong></span><span style="font-family: arial, helvetica, sans-serif"><br></span><a target="_blank" rel="noopener noreferrer nofollow" href="http://Promise-Farm.com"><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">Promise-Farm.com</span></a><span style="font-family: arial, helvetica, sans-serif"><br></span><span style="color: rgb(0, 0, 0); color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-size: 14px; font-family: arial, helvetica, sans-serif">p. 717-368-4109 | e. judy@promise-farm.com</span></p></div>
    
                    </td>
                  </tr>
                    
          </tbody>

        </table>
    
      </div>
    
          </td>
            </tr>
          </tbody>
        </table>
        
      </div>
    </div>
    
    
      
      </div>
