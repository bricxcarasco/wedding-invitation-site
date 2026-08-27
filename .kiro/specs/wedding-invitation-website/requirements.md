# Requirements Document

## Introduction

A single-page wedding invitation website for the February 13, 2026 wedding of Bricx Carasco and Giohannah Mae Manambit in Pagsanjan, Laguna, Philippines. Guests arrive at a closed envelope that acts as a gate; opening the envelope reveals the full invitation as one continuous cinematic scroll containing the hero, a live countdown, ceremony and reception details, the couple's story, a photo gallery, venue links, a dress code guide, and an RSVP form.

The site is a static Vite + React 19 + Tailwind CSS v4 build deployed on the Netlify free tier. RSVP submissions are collected through Netlify Forms, so no backend service, database, paid tier, or environment variable is required. All wedding-specific data is centralized in one configuration module so the couple can edit names, dates, venues, map links, palette colors, and the countdown target without touching component code.

## Glossary

- **Invitation_Site**: The complete deployed static single-page website, including all React components and bundled assets.
- **Envelope_Gate**: The `InvitationEnvelope` component that renders the closed-envelope landing state and blocks visibility of the main invitation content until the visitor opens it.
- **Main_Invitation**: The scrollable body of the site revealed after the Envelope_Gate is opened, composed of the `Hero`, `Countdown`, `WeddingDetails`, `OurStory`, `Gallery`, `Venue`, `DressCode`, `Rsvp`, and `Footer` components.
- **Countdown_Timer**: The `Countdown` component that displays remaining time until the Ceremony_Datetime.
- **Ceremony_Datetime**: The fixed instant `2026-02-13T14:00:00+08:00`, being 2:00 PM Philippine Standard Time on February 13, 2026.
- **Post_Wedding_State**: The Countdown_Timer display shown once the current time is at or after the Ceremony_Datetime.
- **Wedding_Config**: The single configuration module exporting couple names, Ceremony_Datetime, ceremony and reception venue names and addresses, Google Maps URLs, calendar event fields, and palette color tokens.
- **Palette**: The four wedding colors — Sage `#55705f`, Light Sage `#a3b899`, Cream `#ede0cd`, Silver Gray `#c0c0c0`.
- **Gallery_Component**: The `Gallery` component displaying bundled placeholder wedding photographs.
- **Placeholder_Image**: A wedding-themed image file bundled in the repository under a single dedicated asset folder, intended to be replaced by a real photograph using the same filename.
- **Rsvp_Form**: The `Rsvp` component's HTML form wired to Netlify Forms for submission.
- **Rsvp_Success_State**: The confirmation view rendered in place of the Rsvp_Form fields after a successful submission.
- **Calendar_Download**: The client-side generated `.ics` calendar file describing the ceremony event.
- **Reduced_Motion_Preference**: The visitor's operating system or browser setting exposed by the CSS media query `prefers-reduced-motion: reduce`.
- **Scroll_Reveal**: An animation that plays when a target element first enters the browser viewport.
- **Breakpoint_Range**: Any viewport width in the mobile (320px–767px), tablet (768px–1023px), laptop (1024px–1439px), or desktop (1440px and wider) band.

## Requirements

### Requirement 1

**User Story:** As a wedding guest, I want to open a closed envelope before seeing the invitation, so that receiving the invitation feels like a personal, ceremonial moment rather than a web page.

#### Acceptance Criteria

1. WHEN a visitor loads the Invitation_Site, THE Envelope_Gate SHALL render a closed envelope horizontally and vertically centered in the viewport.
2. WHILE the Envelope_Gate is closed, THE Envelope_Gate SHALL render a background composed of Palette colors with at least one continuously moving ambient element selected from floating particles, soft moving light, or a drifting texture overlay.
3. WHILE the Envelope_Gate is closed, THE Envelope_Gate SHALL display invitation-opening instruction text reading "Tap to Open".
4. WHILE the Envelope_Gate is closed, THE Invitation_Site SHALL keep the Main_Invitation content absent from the rendered accessible content, such that no couple names, ceremony date, venue names, or RSVP fields are readable or focusable.
5. WHEN a visitor activates the envelope by pointer click, touch tap, `Enter` key, or `Space` key, THE Envelope_Gate SHALL play a single opening animation lasting between 1200ms and 2500ms and then reveal the Main_Invitation.
6. WHEN the Envelope_Gate opening animation completes, THE Invitation_Site SHALL position the visitor at the top of the Main_Invitation with the `Hero` component in view.
7. WHERE the viewport is in the mobile Breakpoint_Range, THE Envelope_Gate SHALL respond to a touch tap anywhere within the rendered envelope area.
8. IF the Reduced_Motion_Preference is set to reduce, THEN THE Envelope_Gate SHALL replace the opening animation with a cross-fade of 300ms or less and omit the continuously moving ambient element.

### Requirement 2

**User Story:** As a wedding guest, I want an elegant opening screen that names the couple and the wedding date, so that I immediately know whose wedding this is and when it happens.

#### Acceptance Criteria

1. THE `Hero` component SHALL display the couple names as "Bricx & Mae".
2. THE `Hero` component SHALL display the wedding date as "February 13, 2026" at a font size equal to or larger than every other text element in the `Hero` component except the couple names.
3. THE `Hero` component SHALL display a romantic tagline sourced from Wedding_Config.
4. WHEN the Main_Invitation is first revealed, THE `Hero` component SHALL play a staged entrance animation in which the couple names, tagline, and wedding date each animate into place in sequence.
5. IF the Reduced_Motion_Preference is set to reduce, THEN THE `Hero` component SHALL render all text in its final position with no entrance animation.

### Requirement 3

**User Story:** As a wedding guest, I want a live countdown to the ceremony, so that I can see exactly how much time remains before the wedding.

#### Acceptance Criteria

1. WHILE the current time is before the Ceremony_Datetime, THE Countdown_Timer SHALL display five labeled units: Months, Days, Hours, Minutes, and Seconds.
2. WHILE the Countdown_Timer is mounted and the current time is before the Ceremony_Datetime, THE Countdown_Timer SHALL recompute and re-render the remaining time at an interval of 1000ms or less without any visitor interaction and without a page reload.
3. THE Countdown_Timer SHALL compute remaining time against the Ceremony_Datetime as an absolute instant anchored to the `+08:00` offset, producing the same remaining duration for visitors in every device timezone.
4. WHEN the current time reaches or passes the Ceremony_Datetime, THE Countdown_Timer SHALL enter the Post_Wedding_State within 1000ms.
5. WHILE the Countdown_Timer is in the Post_Wedding_State, THE Countdown_Timer SHALL display the message "And so, our forever begins." in place of the five time units.
6. THE Countdown_Timer SHALL read the Ceremony_Datetime from Wedding_Config as a single editable value.
7. WHEN the Countdown_Timer unmounts, THE Countdown_Timer SHALL clear the recurring timer it created.

### Requirement 4

**User Story:** As a wedding guest, I want clear ceremony and reception details with map links, so that I know where to go and can navigate there.

#### Acceptance Criteria

1. THE `WeddingDetails` component SHALL display one card for the ceremony containing the label "Ceremony", the time "2:00 PM", and the venue "Our Lady of Guadalupe Parish Church, Pagsanjan, Laguna".
2. THE `WeddingDetails` component SHALL display one card for the reception containing the label "Reception" and the venue "La Revelacion Farm Resort, Brgy. Calusiche, Pagsanjan, Laguna".
3. WHEN a ceremony or reception card first enters the viewport, THE `WeddingDetails` component SHALL play a Scroll_Reveal animation on that card.
4. THE `Venue` component SHALL display a control labeled "View Ceremony Location" that opens the ceremony Google Maps URL from Wedding_Config in a new browser tab.
5. THE `Venue` component SHALL display a control labeled "View Reception Location" that opens the reception Google Maps URL from Wedding_Config in a new browser tab.
6. THE `Venue` component SHALL render every external map link with `rel="noopener noreferrer"`.
7. IF the Reduced_Motion_Preference is set to reduce, THEN THE `WeddingDetails` component SHALL render each card in its final position and opacity with no Scroll_Reveal animation.

### Requirement 5

**User Story:** As a wedding guest, I want to read the couple's own words about their relationship, so that the invitation feels personal to Bricx and Mae.

#### Acceptance Criteria

1. THE `OurStory` component SHALL display a narrative message of between 60 and 200 words describing the couple's relationship, sourced from Wedding_Config.
2. WHEN the `OurStory` component first enters the viewport, THE `OurStory` component SHALL play a Scroll_Reveal animation on the narrative message.
3. IF the Reduced_Motion_Preference is set to reduce, THEN THE `OurStory` component SHALL render the narrative message in its final position and opacity with no Scroll_Reveal animation.

### Requirement 6

**User Story:** As a wedding guest, I want to browse wedding photographs, so that I can share in the couple's anticipation.

#### Acceptance Criteria

1. THE Gallery_Component SHALL display at least seven Placeholder_Image files covering the subjects rings, couple portrait, ceremony, flowers, venue, outdoor scenery, and reception details.
2. THE Invitation_Site SHALL store every Placeholder_Image inside a single dedicated asset folder within the repository.
3. THE Invitation_Site SHALL serve every Placeholder_Image from the repository build output rather than from an external image host.
4. THE Gallery_Component SHALL set the `loading="lazy"` attribute and explicit `width` and `height` attributes on every gallery image element.
5. WHEN a gallery image first enters the viewport, THE Gallery_Component SHALL play a Scroll_Reveal animation on that image.
6. WHEN a visitor hovers a pointer over a gallery image, THE Gallery_Component SHALL apply a scale transform of between 1.02 and 1.10 to that image.
7. THE Invitation_Site SHALL document, in its README, the filename-for-filename replacement procedure for substituting a real photograph for each Placeholder_Image.
8. IF the Reduced_Motion_Preference is set to reduce, THEN THE Gallery_Component SHALL render every image in its final position, opacity, and scale with no Scroll_Reveal animation and no hover scale transform.

### Requirement 7

**User Story:** As a wedding guest, I want to know what to wear, so that my attire fits the wedding's colors and formality.

#### Acceptance Criteria

1. THE `DressCode` component SHALL display attire guidance text sourced from Wedding_Config.
2. THE `DressCode` component SHALL display four color swatches rendering the Palette values `#55705f`, `#a3b899`, `#ede0cd`, and `#c0c0c0`.
3. THE `DressCode` component SHALL display the name and hexadecimal value of each Palette color as text adjacent to its swatch.

### Requirement 8

**User Story:** As a wedding guest, I want to submit my RSVP on the invitation site, so that the couple receives my attendance response without a separate channel.

#### Acceptance Criteria

1. THE Rsvp_Form SHALL provide a required text input for the guest name, a required attendance selection offering an attending and a not-attending choice, a required numeric guest count input, and an optional multi-line message input.
2. THE Rsvp_Form SHALL carry the `data-netlify="true"` attribute and a hidden input named `form-name` whose value equals the form's `name` attribute.
3. THE Invitation_Site SHALL include a statically pre-rendered copy of the Rsvp_Form markup in the built `index.html` so that the Netlify build-time form detector registers the form.
4. WHEN a visitor submits the Rsvp_Form with the guest name empty, THE Rsvp_Form SHALL display a validation message identifying the guest name field and SHALL withhold the submission.
5. WHEN a visitor submits the Rsvp_Form with the attendance selection unset, THE Rsvp_Form SHALL display a validation message identifying the attendance field and SHALL withhold the submission.
6. WHEN a visitor submits the Rsvp_Form with a guest count outside the range 1 to 10 inclusive, THE Rsvp_Form SHALL display a validation message identifying the guest count field and SHALL withhold the submission.
7. WHEN the Rsvp_Form passes client-side validation, THE Rsvp_Form SHALL transmit the submission to Netlify Forms as a URL-encoded POST request.
8. WHEN Netlify Forms accepts the submission, THE `Rsvp` component SHALL render the Rsvp_Success_State containing a thank-you confirmation message.
9. IF the submission request fails, THEN THE `Rsvp` component SHALL display an error message, retain the values the visitor entered, and keep the submit control enabled.
10. WHILE a submission request is in flight, THE Rsvp_Form SHALL disable the submit control.
11. THE Invitation_Site SHALL document, in its README, the Netlify free tier limit of 100 form submissions per month.

### Requirement 9

**User Story:** As a wedding guest, I want to add the ceremony to my calendar, so that I do not forget the date.

#### Acceptance Criteria

1. THE Invitation_Site SHALL display a control labeled "Add to Calendar".
2. WHEN a visitor activates the "Add to Calendar" control, THE Invitation_Site SHALL generate an iCalendar file in the browser and trigger a file download with the `.ics` extension.
3. THE Calendar_Download SHALL contain the ceremony summary, the ceremony venue as the location, and a start time equal to the Ceremony_Datetime expressed in UTC.
4. THE Invitation_Site SHALL generate the Calendar_Download using only browser platform APIs, adding no third-party calendar dependency to `package.json`.
5. WHEN the Calendar_Download has been triggered, THE Invitation_Site SHALL revoke the object URL it created for the download.

### Requirement 10

**User Story:** As a wedding guest, I want the site to feel polished and cinematic, so that browsing the invitation is enjoyable.

#### Acceptance Criteria

1. THE Invitation_Site SHALL apply CSS `scroll-behavior: smooth` to document scrolling.
2. THE Invitation_Site SHALL apply Scroll_Reveal animations to the `WeddingDetails`, `OurStory`, `Gallery`, `Venue`, `DressCode`, and `Rsvp` sections.
3. THE Invitation_Site SHALL apply a parallax depth effect to at least one background layer.
4. THE Invitation_Site SHALL apply a visible hover state to every interactive control.
5. THE Invitation_Site SHALL limit each section to at most three concurrent animated properties so that motion supports rather than competes with the content.
6. IF the Reduced_Motion_Preference is set to reduce, THEN THE Invitation_Site SHALL disable Scroll_Reveal animations, parallax effects, particle motion, text reveal animations, and image zoom transitions across every section, and SHALL render all content in its final visual state.

### Requirement 11

**User Story:** As a wedding guest using any device, I want the invitation to be laid out for my screen, so that I can read and use it comfortably.

#### Acceptance Criteria

1. THE Invitation_Site SHALL render all sections with no horizontal document overflow at every viewport width from 320px to 2560px.
2. WHERE the viewport is in the mobile Breakpoint_Range, THE Invitation_Site SHALL render the `WeddingDetails` cards and Gallery_Component images in a single column.
3. WHERE the viewport is in the tablet Breakpoint_Range or wider, THE Invitation_Site SHALL render the Gallery_Component images in two or more columns.
4. THE Invitation_Site SHALL render every interactive control with a touch target measuring at least 44px by 44px in the mobile Breakpoint_Range.
5. THE Invitation_Site SHALL render body text at a computed font size of at least 16px in the mobile Breakpoint_Range.

### Requirement 12

**User Story:** As a wedding guest on a phone with a slow connection, I want the invitation to load and scroll smoothly, so that I can view it without waiting or stuttering.

#### Acceptance Criteria

1. THE Invitation_Site SHALL restrict the initial page load to the Envelope_Gate assets, deferring Gallery_Component image requests until those images approach the viewport.
2. THE Invitation_Site SHALL serve every Placeholder_Image at a file size of 300KB or less.
3. THE Invitation_Site SHALL produce a production JavaScript bundle of 300KB or less after gzip compression.
4. THE Invitation_Site SHALL drive continuous animations using CSS `transform` and `opacity` properties, or `requestAnimationFrame`, rather than per-frame React state updates.
5. THE Invitation_Site SHALL restrict scroll-driven work to `IntersectionObserver` callbacks or throttled scroll handlers firing at most once per animation frame.

### Requirement 13

**User Story:** As the couple, I want the site to deploy on the Netlify free tier, so that we pay nothing to host our invitation.

#### Acceptance Criteria

1. THE Invitation_Site SHALL build to static assets using the `npm run build` command.
2. THE Invitation_Site SHALL include a `netlify.toml` file declaring the build command `npm run build` and the publish directory `dist`.
3. THE Invitation_Site SHALL operate with no server-side runtime, no serverless function, and no database.
4. THE Invitation_Site SHALL operate without reading any environment variable at build time or at run time.
5. THE Invitation_Site SHALL declare only free and openly licensed dependencies in `package.json`.
6. THE Invitation_Site SHALL define the npm scripts `dev`, `build`, `lint`, and `preview`, and SHALL declare `"type": "module"` in `package.json`.
7. THE Invitation_Site SHALL complete `npm run build` and `npm run lint` with a zero exit status.
8. THE Invitation_Site SHALL document, in its README, the steps to deploy the repository to Netlify and to retrieve RSVP submissions from the Netlify dashboard.

### Requirement 14

**User Story:** As the couple, I want all wedding-specific details in one file, so that we can correct a venue, time, or color without reading component code.

#### Acceptance Criteria

1. THE Wedding_Config module SHALL export the groom name, the bride name, the display couple names, and the hero tagline.
2. THE Wedding_Config module SHALL export the Ceremony_Datetime, the display wedding date string, and the display ceremony time string.
3. THE Wedding_Config module SHALL export the ceremony venue name, the reception venue name, and one Google Maps URL for each venue.
4. THE Wedding_Config module SHALL export the four Palette color tokens with a name and hexadecimal value for each.
5. THE Wedding_Config module SHALL export the Gallery_Component image list, each entry pairing an image import with alternative text.
6. THE Invitation_Site SHALL read every wedding-specific value listed in this requirement from the Wedding_Config module, holding no duplicate copy of those values inside any component.
