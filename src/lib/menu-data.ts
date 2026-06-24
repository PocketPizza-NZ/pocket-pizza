// Pocket Pizza NZ menu seed data
// Source: https://www.pocketpizza.co.nz/ (real brand info)
// All pizzas are 100% halal Detroit-Sicilian style.

export type Extra = {
  id: string;
  name: string;
  price: number; // NZD
};

export type MenuSeed = {
  category: { slug: string; name: string; description?: string; position: number };
  items: {
    name: string;
    slug: string;
    description: string;
    longDescription?: string;
    price: number;
    rating?: string;
    tags?: string[];
    isPopular?: boolean;
    isSpicy?: boolean;
    isHighProtein?: boolean;
    extras?: Extra[];
    emoji?: string;
    image?: string; // webp image path under /public
    color?: string; // gradient hex pair for hero image fallback
  }[];
};

export const MENU_SEED: MenuSeed[] = [
  {
    category: { slug: "signature-pizzas", name: "Signature Pizzas", description: "Movie-named Detroit-Sicilian pies. 100% halal.", position: 1 },
    items: [
      {
        name: "Despicable Cheese",
        slug: "despicable-cheese",
        description: "Four-cheese blend (cheddar x2, gouda, mozzarella), marinara sauce. Optional sweet & spicy drizzle.",
        longDescription: "Our ode to the cinema classic. A creamy four-cheese blend layered over house marinara (tomato, garlic, oregano), baked Detroit-Sicilian style with golden frico edges. Vegetarian. 100% halal.",
        price: 10.0,
        rating: "G · CLASSIC",
        tags: ["Vegetarian", "Classic"],
        isPopular: true,
        emoji: "🍕",
        image: "/images/despicable-cheese.webp",
        color: ["#FFD300", "#E63420"],
        extras: [
          { id: "drizzle-sweet-spicy", name: "Sweet & Spicy Drizzle", price: 0.5 },
          { id: "extra-cheese", name: "Extra Cheese Blend", price: 2.0 },
          { id: "garlic-butter-crust", name: "Garlic Butter Crust", price: 1.0 },
        ],
      },
      {
        name: "Die Hard Pepperoni",
        slug: "die-hard-pepperoni",
        description: "Four-cheese blend, halal beef pepperoni, marinara sauce. Optional sweet & spicy drizzle and chilli flakes.",
        longDescription: "Yippee ki-yay. Halal beef pepperoni cupped over our four-cheese blend with house marinara. Detroit-Sicilian frico crust, bold and spicy. 100% halal.",
        price: 14.0,
        rating: "R · ACTION",
        tags: ["House Favourite", "Spicy"],
        isPopular: true,
        isSpicy: true,
        emoji: "🌶️",
        image: "/images/die-hard-pepperoni.webp",
        color: ["#FF3B1F", "#0A0A0A"],
        extras: [
          { id: "drizzle-sweet-spicy", name: "Sweet & Spicy Drizzle", price: 0.5 },
          { id: "chilli-flakes", name: "Extra Chilli Flakes", price: 0.5 },
          { id: "extra-pepperoni", name: "Extra Halal Pepperoni", price: 3.0 },
          { id: "extra-cheese", name: "Extra Cheese Blend", price: 2.0 },
        ],
      },
      {
        name: "Bollywood Blockbuster",
        slug: "bollywood-blockbuster",
        description: "Four-cheese blend, high-protein marinated tandoori chicken, marinara sauce, lean-green drizzle, white onion, red capsicum.",
        longDescription: "A musical on your tongue. High-protein marinated tandoori chicken over four-cheese blend and marinara, finished with lean-green drizzle, white onion, red capsicum. Bold, protein-packed. 100% halal.",
        price: 15.0,
        rating: "PG-13 · MUSICAL",
        tags: ["High Protein", "Bold"],
        isPopular: true,
        isHighProtein: true,
        emoji: "🎬",
        image: "/images/bollywood-blockbuster.webp",
        color: ["#FFE361", "#E63420"],
        extras: [
          { id: "extra-chicken", name: "Extra Tandoori Chicken", price: 3.5 },
          { id: "lean-green-drizzle", name: "Extra Lean-Green Drizzle", price: 0.5 },
          { id: "extra-cheese", name: "Extra Cheese Blend", price: 2.0 },
        ],
      },
      {
        name: "Frida Fiesta",
        slug: "frida-fiesta",
        description: "Marinara sauce, cream cheese, sweet corn, lean-green drizzle, white onion, red & green capsicum.",
        longDescription: "A self-portrait in flavour. Marinara, cream cheese, sweet corn, lean-green drizzle, white onion, red & green capsicum. Vegetarian. 100% halal.",
        price: 14.0,
        rating: "PG · DRAMA",
        tags: ["Vegetarian", "Bold"],
        emoji: "🌽",
        image: "/images/frida-fiesta.webp",
        color: ["#FFE361", "#FF3B1F"],
        extras: [
          { id: "extra-corn", name: "Extra Sweet Corn", price: 1.0 },
          { id: "lean-green-drizzle", name: "Extra Lean-Green Drizzle", price: 0.5 },
          { id: "extra-cheese", name: "Extra Cheese Blend", price: 2.0 },
        ],
      },
      {
        name: "The Mexican",
        slug: "the-mexican",
        description: "Four-cheese blend, marinara sauce, 8-hour slow-cooked halal lamb birria, high-protein mint sauce, pickled red onions.",
        longDescription: "The whole story. 8-hour slow-cooked halal lamb birria with Mexican herbs & spices, four-cheese blend, marinara, high-protein mint sauce, pickled red onions. Our premium pie. 100% halal.",
        price: 16.0,
        rating: "R · THRILLER",
        tags: ["Premium", "Slow-Cooked"],
        isPopular: true,
        emoji: "🐑",
        image: "/images/the-mexican.webp",
        color: ["#FF3B1F", "#FFD300"],
        extras: [
          { id: "extra-lamb", name: "Extra Lamb Birria", price: 4.0 },
          { id: "extra-mint", name: "Extra Mint Sauce", price: 0.5 },
          { id: "pickled-onion", name: "Extra Pickled Red Onion", price: 1.0 },
          { id: "extra-cheese", name: "Extra Cheese Blend", price: 2.0 },
        ],
      },
    ],
  },
  {
    category: { slug: "sides", name: "Sides & Dips", description: "Snacks to complete the show.", position: 2 },
    items: [
      {
        name: "Frico Bites",
        slug: "frico-bites",
        description: "Crispy caramelised cheese bites with house marinara dip.",
        price: 6.0,
        rating: "G · SNACK",
        tags: ["Vegetarian"],
        emoji: "🧀",
        image: "/images/frico-bites.webp",
        color: ["#FFD300", "#FFE361"],
      },
      {
        name: "Garlic Focaccia Strip",
        slug: "garlic-focaccia-strip",
        description: "Thick Sicilian-style focaccia brushed with garlic butter & herbs.",
        price: 5.0,
        rating: "G · SNACK",
        tags: ["Vegetarian"],
        emoji: "🥖",
        image: "/images/garlic-focaccia-strip.webp",
        color: ["#FFE361", "#E63420"],
      },
      {
        name: "Marinara Dip",
        slug: "marinara-dip",
        description: "House tomato, garlic, oregano marinara. 100ml.",
        price: 2.0,
        rating: "G · DIP",
        tags: ["Vegan"],
        emoji: "🍅",
        image: "/images/marinara-dip.webp",
        color: ["#FF3B1F", "#0A0A0A"],
      },
      {
        name: "Mint Drizzle Pot",
        slug: "mint-drizzle-pot",
        description: "High-protein mint sauce — perfect on The Mexican.",
        price: 2.0,
        rating: "G · DIP",
        tags: ["High Protein"],
        emoji: "🌿",
        image: "/images/mint-drizzle-pot.webp",
        color: ["#FFE361", "#FF3B1F"],
      },
    ],
  },
  {
    category: { slug: "drinks", name: "Drinks", description: "Wash it down.", position: 3 },
    items: [
      {
        name: "Coca-Cola 330ml",
        slug: "coca-cola-330",
        description: "Chilled can. Classic NZ fridge staple.",
        price: 3.0,
        rating: "G · DRINK",
        tags: ["Cold"],
        emoji: "🥤",
        image: "/images/coca-cola-330.webp",
        color: ["#FF3B1F", "#0A0A0A"],
      },
      {
        name: "Sprite 330ml",
        slug: "sprite-330",
        description: "Chilled can. Lemon-lime fizz.",
        price: 3.0,
        rating: "G · DRINK",
        tags: ["Cold"],
        emoji: "🥤",
        image: "/images/sprite-330.webp",
        color: ["#FFE361", "#FFD300"],
      },
      {
        name: "L&P 330ml",
        slug: "lp-330",
        description: "Lemon & Paeroa — Aotearoa's own. Chilled can.",
        price: 3.5,
        rating: "G · DRINK",
        tags: ["Cold", "NZ Made"],
        emoji: "🥤",
        image: "/images/lp-330.webp",
        color: ["#FFE361", "#FF3B1F"],
      },
      {
        name: "Still Water 500ml",
        slug: "water-500",
        description: "NZ spring water, 500ml bottle.",
        price: 2.5,
        rating: "G · DRINK",
        tags: ["Cold"],
        emoji: "💧",
        image: "/images/water-500.webp",
        color: ["#FFE361", "#FFD300"],
      },
    ],
  },
];

export const DELIVERY_ZONES_SEED = [
  { name: "New Windsor", region: "Auckland", postcode: "1025", fee: 4.0, estimatedMins: 20 },
  { name: "New Lynn", region: "Auckland", postcode: "0600", fee: 5.0, estimatedMins: 25 },
  { name: "Avondale", region: "Auckland", postcode: "1026", fee: 5.0, estimatedMins: 25 },
  { name: "Blockhouse Bay", region: "Auckland", postcode: "0600", fee: 6.0, estimatedMins: 30 },
  { name: "Mount Roskill", region: "Auckland", postcode: "1025", fee: 6.0, estimatedMins: 30 },
  { name: "Lynfield", region: "Auckland", postcode: "1042", fee: 6.5, estimatedMins: 30 },
  { name: "Waterview", region: "Auckland", postcode: "1026", fee: 6.5, estimatedMins: 30 },
  { name: "Owairaka", region: "Auckland", postcode: "1025", fee: 7.0, estimatedMins: 35 },
];
