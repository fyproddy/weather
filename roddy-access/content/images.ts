// Every photograph on the site is chosen here, by role.
// To swap a photo: add it to /photos-src, run `npm run images`, and point the
// role below at the new file name.
//
// `src` is a photo name from /photos-src. Only RODDY ACCESS's own photography
// is used — no stock images.

export type PhotoRef = {
  src: string;
  alt: string;
  position?: string; // CSS object-position, for art-directing crops
};

export const photos = {
  // Home
  heroLeft: { src: "stay-villa-garden", alt: "Loungers on the lawn of a modern villa in the afternoon sun", position: "55% 60%" },
  heroRight: { src: "dine-villa-table", alt: "A long table laid for lunch on a villa terrace at golden hour", position: "50% 70%" },

  // Stay
  stay: { src: "stay-villa-interior", alt: "Double-volume living and dining space in a modern villa", position: "50% 55%" },
  stayVilla: { src: "stay-villa-garden", alt: "Modern villa with a pool and loungers", position: "60% 55%" },

  // Move
  move: { src: "move-maybach-cabin", alt: "Rear cabin of a chauffeured saloon under the panoramic roof", position: "50% 55%" },
  moveVClass: { src: "move-vclass", alt: "Sliding door open on a V-Class with rear seats lit for pickup", position: "50% 55%" },

  // Dine
  dine: { src: "dine-villa-table", alt: "Lunch laid out on a villa terrace", position: "50% 68%" },
  dineChef: { src: "dine-private-chef", alt: "A private chef cooking at a villa kitchen island, plates lined up for service", position: "40% 55%" },

  // Night
  night: {
    src: "night-bottle-parade",
    alt: "Champagne carried to the table on a lit bottle stand in a Sandton club",
    position: "50% 42%",
  },

  // Private Section / weekends
  drinks: { src: "drinks-on-ice", alt: "Champagne bottles buried in ice", position: "50% 55%" },
  weekend: { src: "stay-villa-garden", alt: "A villa garden ready for the weekend", position: "40% 70%" },
} satisfies Record<string, PhotoRef>;

export type PhotoKey = keyof typeof photos;
