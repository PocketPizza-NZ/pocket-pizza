import { db } from "@/lib/db";
import { MENU_SEED, DELIVERY_ZONES_SEED } from "@/lib/menu-data";

async function main() {
  console.log("🌱 Seeding Pocket Pizza NZ database...");

  // Reset
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.customer.deleteMany();
  await db.menuItem.deleteMany();
  await db.category.deleteMany();
  await db.deliveryZone.deleteMany();

  // Categories + menu items
  for (const block of MENU_SEED) {
    const cat = await db.category.create({
      data: {
        slug: block.category.slug,
        name: block.category.name,
        description: block.category.description,
        position: block.category.position,
      },
    });
    let pos = 0;
    for (const item of block.items) {
      await db.menuItem.create({
        data: {
          name: item.name,
          slug: item.slug,
          description: item.description,
          longDescription: item.longDescription ?? null,
          price: item.price,
          rating: item.rating ?? null,
          tags: item.tags?.join(",") ?? null,
          isPopular: !!item.isPopular,
          isSpicy: !!item.isSpicy,
          isHighProtein: !!item.isHighProtein,
          categoryId: cat.id,
          position: pos++,
          extrasJson: item.extras ? JSON.stringify(item.extras) : null,
          imageUrl: JSON.stringify({ emoji: item.emoji, color: item.color, image: item.image }),
        },
      });
    }
    console.log(`  ✓ ${cat.name}: ${block.items.length} items`);
  }

  for (const z of DELIVERY_ZONES_SEED) {
    await db.deliveryZone.create({ data: z });
  }
  console.log(`  ✓ ${DELIVERY_ZONES_SEED.length} delivery zones`);

  // Upsert store settings singleton
  await db.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  console.log("  ✓ Store settings (default)");

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
