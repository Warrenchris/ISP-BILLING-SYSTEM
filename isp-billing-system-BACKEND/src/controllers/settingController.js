const { Setting } = require('../models');

exports.getSettings = async (req, res, next) => {
    try {
        const settings = await Setting.findAll();
        // Convert array to object { key: value }
        const settingsMap = {};
        settings.forEach(s => {
            settingsMap[s.key] = s.value;
        });

        // Also return list form if needed, or just map. 
        // The frontend might expect specific endpoints or a map. 
        // Based on frontend code, we implemented specific endpoints like /company and /payments
        // But generalized "getAll" is useful.

        res.json({ success: true, data: settingsMap });
    } catch (error) {
        next(error);
    }
};

exports.getSettingByKey = async (req, res, next) => {
    try {
        const { key } = req.params;
        const setting = await Setting.findOne({ where: { key } });

        res.json({
            success: true,
            data: setting ? setting.value : {}
        });
    } catch (error) {
        next(error);
    }
};

exports.updateSetting = async (req, res, next) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        let setting = await Setting.findOne({ where: { key } });

        if (setting) {
            setting.value = value;
            await setting.save();
        } else {
            setting = await Setting.create({ key, value });
        }

        res.json({ success: true, data: setting });
    } catch (error) {
        next(error);
    }
};

// Specific endpoints for frontend convenience
exports.getCompanyInfo = async (req, res, next) => {
    req.params.key = 'companyInfo';
    exports.getSettingByKey(req, res, next);
};

exports.updateCompanyInfo = async (req, res, next) => {
    req.params.key = 'companyInfo';
    req.body.value = req.body; // Assuming body IS the value object
    exports.updateSetting(req, res, next);
};

exports.getPaymentSettings = async (req, res, next) => {
    req.params.key = 'paymentSettings';
    exports.getSettingByKey(req, res, next);
};

exports.updatePaymentSettings = async (req, res, next) => {
    req.params.key = 'paymentSettings';
    req.body.value = req.body;
    exports.updateSetting(req, res, next);
};
