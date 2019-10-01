var express = require("express");
var router = express.Router();

router.use('/redox', require('./redox'));

module.exports = router;