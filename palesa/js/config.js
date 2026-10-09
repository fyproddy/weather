/*
 * PALESA VISUALS — SITE CONFIGURATION
 * ------------------------------------------------------------------
 * This is the ONLY place business details live. Every WhatsApp button,
 * contact detail, service-area mention and the quote form read from here.
 *
 * Until a value is filled in, the site hides it (or shows a setup notice)
 * instead of displaying something made up.
 */
window.PALESA_CONFIG = {
  businessName: 'Palesa Visuals',

  // WhatsApp number in international format, digits only — no "+", spaces or dashes.
  // Example format: South African mobile 082 123 4567 becomes '27821234567'.
  whatsappNumber: '27684987944',

  // Telephone number exactly as it should be displayed, e.g. '082 123 4567'. Leave '' to hide.
  phoneNumber: '068 498 7944',

  // Business email address. Leave '' to hide.
  email: 'info@palesavisuals.co.za',

  // Confirmed service areas, e.g. ['Soweto', 'Johannesburg South', 'Roodepoort'].
  // Leave empty until confirmed — the site will ask customers for their area instead.
  serviceAreas: [],

  // Confirmed operating hours, e.g. 'Mon–Sat, 08:00–17:00'. Leave '' to hide.
  businessHours: '',

  // Live site address once the domain is known, e.g. 'https://www.palesavisuals.co.za/'.
  // Used for the canonical URL and Open Graph links.
  siteUrl: '',

  // Message pre-filled when a customer taps a general "Chat on WhatsApp" button.
  whatsappGreeting: "Hi Palesa Visuals, I'd like to ask about a DStv installation.",

  // Set to true once the business has checked the service list below.
  servicesConfirmed: false,

  /*
   * SERVICES
   * Edit, reorder or delete entries to match what the business offers.
   *  id          – used in links and the form; keep it short, lowercase, hyphenated
   *  name        – heading shown on the site
   *  formLabel   – wording in the quote form's "Service required" dropdown
   *  description – one or two plain sentences
   *  questions   – extra form questions: 'new' | 'signal' | 'multiroom' | 'mount' | 'commercial' | null
   *  photo       – shown for featured services; file lives in assets/photos/
   *  featured    – featured services get a large photo block (the first three are used)
   */
  services: [
    {
      id: 'new-installation',
      name: 'New DStv Installation',
      formLabel: 'New DStv Installation',
      description: 'A new satellite dish and decoder set up for your home or business, with the dish positioned, cabling routed and the system tested before we leave.',
      questions: 'new',
      featured: true,
      photo: { src: 'assets/photos/new-installation.jpg', alt: 'Satellite dish mounted on the roof of a house' }
    },
    {
      id: 'signal-problems',
      name: 'DStv Signal Problems',
      formLabel: 'Signal Problem / No Signal',
      description: 'Lost signal, poor reception or channels dropping out. We check the dish alignment, LNB and cabling to find where the fault is.',
      questions: 'signal',
      featured: true,
      photo: { src: 'assets/photos/signal-check.jpg', alt: 'Technician checking satellite signal strength with a meter' }
    },
    {
      id: 'extra-view',
      name: 'Extra View Installation',
      formLabel: 'Extra View',
      description: 'Setting up compatible decoders so you can watch in more than one room, depending on your equipment and configuration.',
      questions: 'multiroom',
      featured: true,
      photo: { src: 'assets/photos/tv-room.jpg', alt: 'Television neatly installed in a living room' }
    },
    {
      id: 'extra-tv-points',
      name: 'Extra TV Points',
      formLabel: 'Extra TV Point',
      description: 'Extending an existing installation to another room or television location.',
      questions: 'multiroom'
    },
    {
      id: 'dish-alignment',
      name: 'Satellite Dish Alignment',
      formLabel: 'Dish Alignment',
      description: 'Checking the dish position and correcting it where wind, building work or a loose bracket has moved it.',
      questions: null
    },
    {
      id: 'dish-relocation',
      name: 'Dish Relocation',
      formLabel: 'Dish Relocation',
      description: 'Moving an existing dish when you renovate, move rooms around or need a clearer line of sight.',
      questions: null
    },
    {
      id: 'decoder-setup',
      name: 'Decoder Setup and Replacement',
      formLabel: 'Decoder Setup / Replacement',
      description: 'Connecting and configuring compatible decoders and associated equipment.',
      questions: null
    },
    {
      id: 'cable-repairs',
      name: 'Cable Repairs and Replacement',
      formLabel: 'Cable Repair / Replacement',
      description: 'Finding and fixing damaged, loose or poorly installed cabling and connectors.',
      questions: null
    },
    {
      id: 'tv-wall-mounting',
      name: 'TV Wall Mounting',
      formLabel: 'TV Wall Mounting',
      description: 'Mounting your television securely on a suitable wall, with cables kept tidy.',
      questions: 'mount'
    },
    {
      id: 'commercial',
      name: 'Commercial Installations',
      formLabel: 'Commercial Installation',
      description: 'Installations for offices, guesthouses, rental properties and other commercial premises.',
      questions: 'commercial'
    }
  ]
};
