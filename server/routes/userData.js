const router = require('express').Router();
const models = require('../models');
const auth = require('../middlewares/authMiddleware');
const asyncHandler = require('../middlewares/asyncHandler');
router.get('/user-data/:id', auth, asyncHandler(async (req, res) => {
  if (String(req.user.id) !== req.params.id) {
    return res.status(403).json({ message: 'You may only read your own data.' });
  }
  const data = await models.SavedData.findAll({ where: { userId: req.user.id } });
  res.json(data);
}));
module.exports = router;
