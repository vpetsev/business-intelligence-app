const router = require('express').Router();
const models = require('../models');
const auth = require('../middlewares/authMiddleware');
const { HttpError } = require('../lib/errors');
const { positiveId } = require('../lib/validation');
router.get('/user-data/:id', auth, async (req, res) => {
  if (req.user.id !== positiveId(req.params.id)) throw new HttpError(403, 'You may only read your own data.');
  const count = await models.SavedData.count({ where: { userId: req.user.id } });
  if (count > 1000) throw new HttpError(409, 'Use paginated GET /api/data for datasets above 1,000 rows.');
  res.json(await models.SavedData.findAll({ where: { userId: req.user.id }, order: [['id', 'ASC']], limit: 1000 }));
});
module.exports = router;
