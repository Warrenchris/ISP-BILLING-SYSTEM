const { DataPlan } = require('../models');

const sampleDataPlans = [
  // Basic Plans
  {
    name: 'Basic Daily',
    description: 'Perfect for light browsing and social media',
    dataLimit: 100, // 100 MB
    price: 10.00,
    validityPeriod: 1,
    speed: '1 Mbps',
    planType: 'prepaid',
    category: 'basic',
    features: ['Free WhatsApp', 'Free Facebook'],
    isPopular: false,
    sortOrder: 1
  },
  {
    name: 'Basic Weekly',
    description: 'Great for casual internet users',
    dataLimit: 500, // 500 MB
    price: 50.00,
    validityPeriod: 7,
    speed: '2 Mbps',
    planType: 'prepaid',
    category: 'basic',
    features: ['Free WhatsApp', 'Free Facebook', 'Free Twitter'],
    isPopular: true,
    sortOrder: 2
  },
  {
    name: 'Basic Monthly',
    description: 'Ideal for regular internet usage',
    dataLimit: 2048, // 2 GB
    price: 200.00,
    validityPeriod: 30,
    speed: '3 Mbps',
    planType: 'prepaid',
    category: 'basic',
    features: ['Free WhatsApp', 'Free Facebook', 'Free Twitter', 'Free Instagram'],
    isPopular: false,
    sortOrder: 3
  },

  // Standard Plans
  {
    name: 'Standard Weekly',
    description: 'Enhanced browsing experience',
    dataLimit: 1024, // 1 GB
    price: 100.00,
    validityPeriod: 7,
    speed: '5 Mbps',
    planType: 'prepaid',
    category: 'standard',
    features: ['Free Social Media', 'Free Music Streaming', 'Email Support'],
    isPopular: false,
    sortOrder: 4
  },
  {
    name: 'Standard Monthly',
    description: 'Perfect for streaming and downloads',
    dataLimit: 5120, // 5 GB
    price: 500.00,
    validityPeriod: 30,
    speed: '10 Mbps',
    planType: 'prepaid',
    category: 'standard',
    features: ['Free Social Media', 'Free Music Streaming', 'HD Video Streaming', 'Email Support'],
    isPopular: true,
    sortOrder: 5
  },
  {
    name: 'Standard Postpaid',
    description: 'Monthly postpaid plan with generous data',
    dataLimit: 10240, // 10 GB
    price: 800.00,
    validityPeriod: 30,
    speed: '15 Mbps',
    planType: 'postpaid',
    category: 'standard',
    features: ['Unlimited Social Media', 'Free Music Streaming', 'HD Video Streaming', 'Priority Support'],
    isPopular: false,
    sortOrder: 6
  },

  // Premium Plans
  {
    name: 'Premium Monthly',
    description: 'High-speed internet for power users',
    dataLimit: 20480, // 20 GB
    price: 1500.00,
    validityPeriod: 30,
    speed: '25 Mbps',
    planType: 'prepaid',
    category: 'premium',
    features: ['Unlimited Social Media', 'Free Streaming Services', '4K Video Support', 'Priority Support', 'Free Router'],
    isPopular: true,
    sortOrder: 7
  },
  {
    name: 'Premium Unlimited',
    description: 'Truly unlimited internet experience',
    dataLimit: 102400, // 100 GB (effectively unlimited for most users)
    price: 2500.00,
    validityPeriod: 30,
    speed: '50 Mbps',
    planType: 'postpaid',
    category: 'premium',
    features: ['Unlimited Everything', 'Free Streaming Services', '4K Video Support', '24/7 Priority Support', 'Free Router', 'Free Installation'],
    isPopular: false,
    sortOrder: 8
  },

  // Enterprise Plans
  {
    name: 'Enterprise Basic',
    description: 'Reliable internet for small businesses',
    dataLimit: 51200, // 50 GB
    price: 3000.00,
    validityPeriod: 30,
    speed: '100 Mbps',
    planType: 'postpaid',
    category: 'enterprise',
    features: ['Business Grade SLA', 'Static IP', 'Priority Support', 'Free Installation', 'Backup Connection'],
    isPopular: false,
    sortOrder: 9
  },
  {
    name: 'Enterprise Pro',
    description: 'High-performance internet for growing businesses',
    dataLimit: 204800, // 200 GB
    price: 5000.00,
    validityPeriod: 30,
    speed: '200 Mbps',
    planType: 'postpaid',
    category: 'enterprise',
    features: ['Business Grade SLA', 'Multiple Static IPs', '24/7 Dedicated Support', 'Free Installation', 'Redundant Connection', 'Free Firewall'],
    isPopular: true,
    sortOrder: 10
  },
  {
    name: 'Enterprise Ultimate',
    description: 'Enterprise-grade internet for large organizations',
    dataLimit: 1048576, // 1 TB
    price: 10000.00,
    validityPeriod: 30,
    speed: '1 Gbps',
    planType: 'postpaid',
    category: 'enterprise',
    features: ['Enterprise SLA', 'Dedicated IP Block', 'Dedicated Account Manager', 'Free Installation', 'Fully Redundant Connection', 'Enterprise Firewall', 'Load Balancing'],
    isPopular: false,
    sortOrder: 11
  }
];

/**
 * Seed the database with sample data plans
 */
const seedDataPlans = async () => {
  try {
    console.log('🌱 Starting data plan seeding...');

    // Check if data plans already exist
    const existingPlans = await DataPlan.count();
    if (existingPlans > 0) {
      console.log(`📊 Found ${existingPlans} existing data plans. Skipping seeding.`);
      return;
    }

    // Create data plans
    const createdPlans = await DataPlan.bulkCreate(sampleDataPlans);
    
    console.log(`✅ Successfully created ${createdPlans.length} data plans:`);
    createdPlans.forEach(plan => {
      console.log(`   - ${plan.name} (${plan.category}) - ${plan.getFormattedPrice()}`);
    });

    return createdPlans;

  } catch (error) {
    console.error('❌ Error seeding data plans:', error);
    throw error;
  }
};

/**
 * Clear all data plans (use with caution)
 */
const clearDataPlans = async () => {
  try {
    console.log('🗑️ Clearing all data plans...');
    
    const deletedCount = await DataPlan.destroy({ where: {} });
    console.log(`✅ Deleted ${deletedCount} data plans.`);
    
    return deletedCount;
  } catch (error) {
    console.error('❌ Error clearing data plans:', error);
    throw error;
  }
};

/**
 * Update data plan popularity based on category
 */
const updatePopularPlans = async () => {
  try {
    console.log('⭐ Updating popular plans...');
    
    // Reset all plans to not popular
    await DataPlan.update({ isPopular: false }, { where: {} });
    
    // Set specific plans as popular
    const popularPlanNames = [
      'Basic Weekly',
      'Standard Monthly', 
      'Premium Monthly',
      'Enterprise Pro'
    ];
    
    const updatedCount = await DataPlan.update(
      { isPopular: true },
      { where: { name: popularPlanNames } }
    );
    
    console.log(`✅ Updated ${updatedCount[0]} plans as popular.`);
    
    return updatedCount;
  } catch (error) {
    console.error('❌ Error updating popular plans:', error);
    throw error;
  }
};

module.exports = {
  seedDataPlans,
  clearDataPlans,
  updatePopularPlans,
  sampleDataPlans
};

