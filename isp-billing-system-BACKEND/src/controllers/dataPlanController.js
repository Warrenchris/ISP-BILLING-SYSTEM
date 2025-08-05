const { DataPlan } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all data plans
 */
const getAllDataPlans = async (req, res) => {
  try {
    const { 
      category, 
      planType, 
      active = 'true', 
      popular,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
      sortBy = 'sortOrder',
      sortOrder = 'ASC'
    } = req.query;

    // Build where clause
    const whereClause = {};
    
    if (active !== 'all') {
      whereClause.isActive = active === 'true';
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    if (planType) {
      whereClause.planType = planType;
    }
    
    if (popular !== undefined) {
      whereClause.isPopular = popular === 'true';
    }
    
    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Valid sort fields
    const validSortFields = ['name', 'price', 'dataLimit', 'validityPeriod', 'sortOrder', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'sortOrder';
    const sortDirection = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

    const { count, rows: dataPlans } = await DataPlan.findAndCountAll({
      where: whereClause,
      order: [[sortField, sortDirection], ['price', 'ASC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.status(200).json({
      success: true,
      message: 'Data plans retrieved successfully',
      data: {
        dataPlans: dataPlans.map(plan => ({
          ...plan.toJSON(),
          formattedPrice: plan.getFormattedPrice(),
          formattedDataLimit: plan.getFormattedDataLimit(),
          validityText: plan.getValidityText()
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error('Get data plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get data plan by ID
 */
const getDataPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const dataPlan = await DataPlan.findByPk(id);

    if (!dataPlan) {
      return res.status(404).json({
        success: false,
        message: 'Data plan not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data plan retrieved successfully',
      data: {
        dataPlan: {
          ...dataPlan.toJSON(),
          formattedPrice: dataPlan.getFormattedPrice(),
          formattedDataLimit: dataPlan.getFormattedDataLimit(),
          validityText: dataPlan.getValidityText()
        }
      }
    });

  } catch (error) {
    console.error('Get data plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new data plan (Admin only)
 */
const createDataPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      dataLimit,
      price,
      validityPeriod,
      speed,
      planType,
      category,
      features,
      isPopular,
      sortOrder
    } = req.body;

    // Check if plan with same name already exists
    const existingPlan = await DataPlan.findOne({ where: { name } });
    if (existingPlan) {
      return res.status(409).json({
        success: false,
        message: 'Data plan with this name already exists'
      });
    }

    const dataPlan = await DataPlan.create({
      name,
      description,
      dataLimit,
      price,
      validityPeriod,
      speed,
      planType,
      category,
      features: features || [],
      isPopular: isPopular || false,
      sortOrder: sortOrder || 0
    });

    res.status(201).json({
      success: true,
      message: 'Data plan created successfully',
      data: {
        dataPlan: {
          ...dataPlan.toJSON(),
          formattedPrice: dataPlan.getFormattedPrice(),
          formattedDataLimit: dataPlan.getFormattedDataLimit(),
          validityText: dataPlan.getValidityText()
        }
      }
    });

  } catch (error) {
    console.error('Create data plan error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update data plan (Admin only)
 */
const updateDataPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const dataPlan = await DataPlan.findByPk(id);

    if (!dataPlan) {
      return res.status(404).json({
        success: false,
        message: 'Data plan not found'
      });
    }

    // Check if name is being changed and if it already exists
    if (updateData.name && updateData.name !== dataPlan.name) {
      const existingPlan = await DataPlan.findOne({ where: { name: updateData.name } });
      if (existingPlan) {
        return res.status(409).json({
          success: false,
          message: 'Data plan with this name already exists'
        });
      }
    }

    await dataPlan.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Data plan updated successfully',
      data: {
        dataPlan: {
          ...dataPlan.toJSON(),
          formattedPrice: dataPlan.getFormattedPrice(),
          formattedDataLimit: dataPlan.getFormattedDataLimit(),
          validityText: dataPlan.getValidityText()
        }
      }
    });

  } catch (error) {
    console.error('Update data plan error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete data plan (Admin only)
 */
const deleteDataPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const dataPlan = await DataPlan.findByPk(id);

    if (!dataPlan) {
      return res.status(404).json({
        success: false,
        message: 'Data plan not found'
      });
    }

    // Check if plan has active subscriptions
    const { Subscription } = require('../models');
    const activeSubscriptions = await Subscription.count({
      where: {
        dataPlanId: id,
        status: 'active'
      }
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete data plan with active subscriptions. Deactivate the plan instead.'
      });
    }

    await dataPlan.destroy();

    res.status(200).json({
      success: true,
      message: 'Data plan deleted successfully'
    });

  } catch (error) {
    console.error('Delete data plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get popular data plans
 */
const getPopularDataPlans = async (req, res) => {
  try {
    const dataPlans = await DataPlan.findPopular();

    res.status(200).json({
      success: true,
      message: 'Popular data plans retrieved successfully',
      data: {
        dataPlans: dataPlans.map(plan => ({
          ...plan.toJSON(),
          formattedPrice: plan.getFormattedPrice(),
          formattedDataLimit: plan.getFormattedDataLimit(),
          validityText: plan.getValidityText()
        }))
      }
    });

  } catch (error) {
    console.error('Get popular data plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get data plans by category
 */
const getDataPlansByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const validCategories = ['basic', 'standard', 'premium', 'enterprise'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Must be one of: basic, standard, premium, enterprise'
      });
    }

    const dataPlans = await DataPlan.findByCategory(category);

    res.status(200).json({
      success: true,
      message: `${category} data plans retrieved successfully`,
      data: {
        category,
        dataPlans: dataPlans.map(plan => ({
          ...plan.toJSON(),
          formattedPrice: plan.getFormattedPrice(),
          formattedDataLimit: plan.getFormattedDataLimit(),
          validityText: plan.getValidityText()
        }))
      }
    });

  } catch (error) {
    console.error('Get data plans by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllDataPlans,
  getDataPlanById,
  createDataPlan,
  updateDataPlan,
  deleteDataPlan,
  getPopularDataPlans,
  getDataPlansByCategory
};

