// backend/scripts/seedVarieties.js
const { sequelize, Category, Variety } = require('../models');

const varietiesData = {
  "Flowers": [
    {
      name: "Bouquets",
      subVarieties: ["Small Bouquet", "Medium Bouquet", "Large Bouquet", "Premium Bouquet"],
      metadata: { units: ["piece", "bunch"], priceRange: [150, 1000] }
    },
    {
      name: "Bound Flowers",
      subVarieties: ["Roses", "Marigold", "Jasmine", "Lotus", "Lily"],
      metadata: { units: ["bunch", "kg"], priceRange: [50, 500] }
    },
    {
      name: "Unbound Flowers",
      subVarieties: ["Loose Roses", "Loose Marigold", "Loose Jasmine", "Mixed Flowers"],
      metadata: { units: ["kg", "gram"], priceRange: [100, 800] }
    },
    {
      name: "Garlands",
      subVarieties: ["Door Garland", "Wedding Garland", "Temple Garland", "Stage Decoration"],
      metadata: { units: ["piece", "set"], priceRange: [200, 2000] }
    },
    {
      name: "Package Bundles",
      subVarieties: ["Daily Delivery", "Weekly Delivery", "Monthly Delivery", "Festival Package"],
      metadata: { units: ["subscription", "package"], priceRange: [500, 5000] }
    },
    {
      name: "Occasion Packages",
      subVarieties: ["Small Pooja", "Medium Pooja", "Grand Pooja", "Wedding Package", "House Warming"],
      metadata: { units: ["package"], priceRange: [1000, 10000] }
    }
  ],
  "Crackers": [
    {
      name: "Sparkles",
      subVarieties: ["Small Sparkles", "Medium Sparkles", "Large Sparkles", "Color Sparkles", "Electric Sparkles"],
      metadata: { units: ["box", "piece"], priceRange: [50, 500] }
    },
    {
      name: "Bombs",
      subVarieties: ["Atom Bomb", "Hydrogen Bomb", "Bullet Bomb", "Chorsa Bomb"],
      metadata: { units: ["piece", "packet"], priceRange: [20, 200] }
    },
    {
      name: "Rockets",
      subVarieties: ["Small Rocket", "Medium Rocket", "Big Rocket", "Whistling Rocket"],
      metadata: { units: ["piece", "box"], priceRange: [30, 300] }
    },
    {
      name: "Sound Crackers",
      subVarieties: ["Single Sound", "Double Sound", "Multi Sound", "Lakshmi Crackers"],
      metadata: { units: ["packet", "box"], priceRange: [50, 500] }
    },
    {
      name: "Combo Boxes",
      subVarieties: ["Small Combo", "Medium Combo", "Large Combo", "Premium Combo", "Family Pack"],
      metadata: { units: ["box"], priceRange: [500, 5000] }
    },
    {
      name: "Fancy Crackers",
      subVarieties: ["Fountains", "Chakkar", "Flower Pots", "Ground Chakkars"],
      metadata: { units: ["piece", "box"], priceRange: [40, 400] }
    }
  ],
  "Vegetables": [
    {
      name: "Leafy Vegetables",
      subVarieties: ["Spinach", "Fenugreek", "Coriander", "Mint", "Curry Leaves"],
      metadata: { units: ["bunch", "kg"], priceRange: [10, 50] }
    },
    {
      name: "Root Vegetables",
      subVarieties: ["Potato", "Onion", "Carrot", "Beetroot", "Radish"],
      metadata: { units: ["kg"], priceRange: [20, 80] }
    },
    {
      name: "Fruiting Vegetables",
      subVarieties: ["Tomato", "Brinjal", "Capsicum", "Bitter Gourd", "Ridge Gourd"],
      metadata: { units: ["kg", "piece"], priceRange: [30, 100] }
    },
    {
      name: "Fresh Cut",
      subVarieties: ["Pre-cut Mix", "Salad Pack", "Soup Mix", "Stir-fry Mix"],
      metadata: { units: ["packet", "kg"], priceRange: [50, 150] }
    }
  ],
  "Fruits": [
    {
      name: "Seasonal Fruits",
      subVarieties: ["Mango", "Apple", "Banana", "Orange", "Grapes"],
      metadata: { units: ["kg", "dozen"], priceRange: [40, 200] }
    },
    {
      name: "Exotic Fruits",
      subVarieties: ["Dragon Fruit", "Avocado", "Kiwi", "Blueberry"],
      metadata: { units: ["kg", "piece"], priceRange: [100, 500] }
    },
    {
      name: "Fruit Baskets",
      subVarieties: ["Small Basket", "Medium Basket", "Large Basket", "Premium Basket"],
      metadata: { units: ["basket"], priceRange: [300, 2000] }
    }
  ],
  "Milk Products": [
    {
      name: "Milk",
      subVarieties: ["Full Cream", "Toned", "Double Toned", "Skimmed", "Organic"],
      metadata: { units: ["liter", "packet"], priceRange: [40, 80] }
    },
    {
      name: "Curd & Yogurt",
      subVarieties: ["Plain Curd", "Greek Yogurt", "Flavored Yogurt", "Probiotic Curd"],
      metadata: { units: ["liter", "packet"], priceRange: [50, 120] }
    },
    {
      name: "Dairy Products",
      subVarieties: ["Paneer", "Butter", "Ghee", "Cheese", "Cream"],
      metadata: { units: ["kg", "gram", "packet"], priceRange: [50, 500] }
    },
    {
      name: "Daily Delivery",
      subVarieties: ["Morning Delivery", "Evening Delivery", "Both Times"],
      metadata: { units: ["subscription"], priceRange: [500, 2000] }
    }
  ],
  "Groceries": [
    {
      name: "Rice & Grains",
      subVarieties: ["Basmati Rice", "Sona Masoori", "Brown Rice", "Wheat", "Oats"],
      metadata: { units: ["kg"], priceRange: [50, 200] }
    },
    {
      name: "Pulses & Lentils",
      subVarieties: ["Toor Dal", "Moong Dal", "Urad Dal", "Chana Dal", "Masoor Dal"],
      metadata: { units: ["kg"], priceRange: [80, 150] }
    },
    {
      name: "Spices",
      subVarieties: ["Turmeric", "Red Chili", "Coriander Powder", "Garam Masala"],
      metadata: { units: ["gram", "packet"], priceRange: [20, 100] }
    },
    {
      name: "Oil & Ghee",
      subVarieties: ["Sunflower Oil", "Groundnut Oil", "Coconut Oil", "Pure Ghee"],
      metadata: { units: ["liter", "kg"], priceRange: [100, 500] }
    }
  ]
};

async function seedVarieties() {
  try {
    await sequelize.sync();
    
    console.log('🌱 Seeding varieties...');
    
    for (const [categoryName, varieties] of Object.entries(varietiesData)) {
      // Find or create category
      const [category] = await Category.findOrCreate({
        where: { name: categoryName },
        defaults: { icon: getCategoryIcon(categoryName) }
      });
      
      console.log(`\n📦 Category: ${categoryName} (ID: ${category.id})`);
      
      // Create varieties for this category
      for (const variety of varieties) {
        const [created, isNew] = await Variety.findOrCreate({
          where: { 
            categoryId: category.id,
            name: variety.name
          },
          defaults: {
            subVarieties: variety.subVarieties,
            metadata: variety.metadata
          }
        });
        
        if (isNew) {
          console.log(`  ✅ Created: ${variety.name} (${variety.subVarieties.length} sub-varieties)`);
        } else {
          console.log(`  ⏭️  Exists: ${variety.name}`);
        }
      }
    }
    
    console.log('\n✅ Varieties seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding varieties:', err);
    process.exit(1);
  }
}

function getCategoryIcon(categoryName) {
  const icons = {
    "Flowers": "🌸",
    "Crackers": "🎆",
    "Vegetables": "🥬",
    "Fruits": "🍎",
    "Milk Products": "🥛",
    "Groceries": "🛒"
  };
  return icons[categoryName] || "📦";
}

seedVarieties();
