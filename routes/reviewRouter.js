const authController = require("../controllers/authController");
const reviewController = require("../controllers/reviewController");
const express = require("express");
const router = express.Router({ mergeParams: true });

router
  .route("/")
  .post(
    [authController.protect, authController.restrictTo("user", "guide")],
    reviewController.createReview
  )
  .get(reviewController.getAllReview);

// router.route("/:id").get([authController.protect], reviewController.getReview);
router
  .route("/:id")
  .delete([authController.protect], reviewController.deleteReview)
  .patch([authController.protect], reviewController.updateReview);
module.exports = router;
