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

  // Short description of where the business works — shown in the hero, footer and FAQ.
  serviceAreaSummary: 'Johannesburg and surrounding areas',

  // Areas customers can pick in the quote form, grouped by region.
  // Add, remove or move places freely. Customers can always choose "Other area" and type their own.
  serviceAreas: [
    { region: 'Soweto', places: ['Orlando', 'Diepkloof', 'Meadowlands', 'Dobsonville', 'Protea Glen', 'Pimville', 'Jabulani', 'Naledi', 'Zola', 'Chiawelo', 'Other Soweto area'] },
    { region: 'Johannesburg Central & South', places: ['Johannesburg CBD', 'Braamfontein', 'Auckland Park', 'Melville', 'Rosettenville', 'Turffontein', 'Mondeor', 'Glenvista', 'Naturena', 'Eldorado Park', 'Lenasia', 'Ennerdale', 'Orange Farm'] },
    { region: 'Johannesburg North', places: ['Sandton', 'Rosebank', 'Randburg', 'Northcliff', 'Fourways', 'Bryanston', 'Sunninghill', 'Midrand', 'Alexandra', 'Diepsloot', 'Cosmo City'] },
    { region: 'West Rand', places: ['Roodepoort', 'Florida', 'Honeydew', 'Krugersdorp', 'Randfontein'] },
    { region: 'East Rand (Ekurhuleni)', places: ['Bedfordview', 'Edenvale', 'Germiston', 'Alberton', 'Kempton Park', 'Tembisa', 'Boksburg', 'Benoni', 'Brakpan', 'Springs', 'Katlehong', 'Thokoza', 'Vosloorus'] }
  ],

  // Confirmed operating hours, e.g. 'Mon–Sat, 08:00–17:00'. Leave '' to hide.
  businessHours: '',

  // Live site address — set this once the domain is registered and the site is live on it.
  // Planned: 'https://www.palesavisuals.co.za/' (not registered yet, so left empty for now).
  // Used for the canonical URL and Open Graph links.
  siteUrl: '',

  // Message pre-filled when a customer taps a general "Chat on WhatsApp" button.
  whatsappGreeting: "Hi Palesa Visuals, I'd like to ask about a DStv installation.",

  // Set to true once the business has checked the service list below.
  servicesConfirmed: true,

  /*
   * SERVICES
   * Edit, reorder or delete entries to match what the business offers.
   *  id          – used in links and the form; keep it short, lowercase, hyphenated
   *  name        – heading shown on the site
   *  formLabel   – wording in the quote form's "Service required" dropdown
   *  description – one or two plain sentences
   *  questions   – extra form questions: 'new' | 'signal' | 'multiroom' | 'mount' | 'commercial' | null
   *  photo       – shown for featured services; file lives in assets/photos/
   *  featured    – featured services get a large photo card on the Services page (up to four; needs a photo)
   *  showcase    – short name for the big hover list on the home page (leave out to skip)
   *  showcasePhoto – photo revealed on hover in that list (defaults to the service photo)
   */
  services: [
    {
      id: 'new-installation',
      name: 'New DStv Installation',
      showcase: 'DStv Installation',
      formLabel: 'New DStv Installation',
      description: 'New dish and decoder, installed and tested.',
      questions: 'new',
      featured: true,
      photo: { src: 'assets/photos/new-installation.jpg', srcset: 'assets/photos/new-installation-800.jpg 800w, assets/photos/new-installation.jpg 1400w', width: 1400, height: 933, position: '62% 50%', alt: 'Installer setting up a wall-mounted DStv satellite dish with a signal meter' }
    },
    {
      id: 'signal-problems',
      name: 'DStv Signal Problems',
      showcase: 'Signal Repairs',
      showcasePhoto: 'assets/photos/hero-960.jpg',
      formLabel: 'Signal Problem / No Signal',
      description: 'No signal or channels dropping? We find the fault.',
      questions: 'signal',
      featured: false
    },
    {
      id: 'extra-view',
      name: 'Extra View Installation',
      showcase: 'Extra View',
      formLabel: 'Extra View',
      description: 'Watch DStv in more than one room.',
      questions: 'multiroom',
      featured: true,
      photo: { src: 'assets/photos/tv-room.jpg', srcset: 'assets/photos/tv-room-800.jpg 800w, assets/photos/tv-room.jpg 1400w', width: 1400, height: 1050, position: '60% 45%', alt: 'Wall-mounted television above a TV cabinet in a living room' }
    },
    {
      id: 'extra-tv-points',
      name: 'Extra TV Points',
      formLabel: 'Extra TV Point',
      description: 'Add DStv to another room.',
      questions: 'multiroom'
    },
    {
      id: 'dish-alignment',
      name: 'Satellite Dish Alignment',
      formLabel: 'Dish Alignment',
      description: 'Dish moved? We realign it.',
      questions: null
    },
    {
      id: 'dish-relocation',
      name: 'Dish Relocation',
      formLabel: 'Dish Relocation',
      description: 'Move your dish to a better spot.',
      questions: null
    },
    {
      id: 'decoder-setup',
      name: 'Decoder Setup and Replacement',
      formLabel: 'Decoder Setup / Replacement',
      description: 'Connect or swap your decoder.',
      questions: null
    },
    {
      id: 'cable-repairs',
      name: 'Cable Repairs and Replacement',
      formLabel: 'Cable Repair / Replacement',
      description: 'Fix damaged or loose cables.',
      questions: null
    },
    {
      id: 'cctv',
      name: 'CCTV Installation',
      showcase: 'CCTV',
      formLabel: 'CCTV Installation',
      description: 'Cameras installed, wired and on your phone.',
      questions: 'cctv',
      featured: true,
      photo: { src: 'assets/photos/cctv.jpg', srcset: 'assets/photos/cctv-800.jpg 800w, assets/photos/cctv.jpg 1400w', width: 1400, height: 1050, position: '50% 45%', alt: 'Outdoor CCTV camera mounted below the roofline of a house' }
    },
    {
      id: 'projector',
      name: 'Projector and Screen Installation',
      showcase: 'Projectors',
      formLabel: 'Projector Installation',
      description: 'Projector and screen, mounted and connected.',
      questions: 'projector',
      featured: true,
      photo: { src: 'assets/photos/projector.jpg', srcset: 'assets/photos/projector-800.jpg 800w, assets/photos/projector.jpg 1400w', width: 1400, height: 1050, position: '50% 50%', alt: 'Ceiling-mounted projector and pull-down screen in a lounge' }
    },
    {
      id: 'home-sound',
      name: 'Home Sound Installation',
      formLabel: 'Home Sound Installation',
      description: 'Soundbars, surround sound and speakers.',
      questions: 'sound'
    },
    {
      id: 'tv-wall-mounting',
      name: 'TV Installation and Wall Mounting',
      showcase: 'TV Mounting',
      showcasePhoto: 'assets/photos/cabling-640.jpg',
      formLabel: 'TV Installation / Wall Mounting',
      description: 'TV mounted, connected and cables hidden.',
      questions: 'mount'
    },
    {
      id: 'commercial',
      name: 'Commercial Installations',
      formLabel: 'Commercial Installation',
      description: 'Offices, guesthouses and rentals.',
      questions: 'commercial'
    }
  ]
};
