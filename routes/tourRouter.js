const express = require("express");
const router = express.Router();
const tourController = require("../controllers/tourController");
const reviewRouter = require("../routes/reviewRouter");
const authController = require("../controllers/authController");
const photoController = require("../controllers/photoController");
//NESTED ROUTES

// router
//   .route("/:tourId/reviews")
//   .post(
//     [authController.protect, authController.restrictTo("user", "guide")],
//     reviewController.createReview
//   );

router.use("/:tourId/reviews", reviewRouter);
//Top 5 Cheap Tours
router
  .route("/top-5-cheap")
  .get(tourController.aliasTopTour, tourController.getAllTours);
// stats About Tour
router
  .route("/tour-stats")
  .get(
    [
      authController.protect,
      authController.restrictTo("admin", "guide", "lead-guide"),
    ],
    tourController.getTourStats
  );
router
  .route("/monthly-plan/:year")
  .get(
    [
      authController.protect,
      authController.restrictTo("admin", "guide", "lead-guide"),
    ],
    tourController.getMonthlyPlan
  );

// find tours within radius of users lng, lat
router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourController.getToursWithin);
//get distances
router.route("/distances/:latlng/unit/:unit").get(tourController.getDistances);

router
  .route("/")
  .get(tourController.getAllTours)
  .post(
    [authController.protect, authController.restrictTo("admin", "lead-guide")],
    photoController.resizeTourPhotos,
    photoController.uploadTourPhotos,
    tourController.createTour
  )
  .delete(
    [authController.protect, authController.restrictTo("admin")],
    tourController.deleteAllTours
  );

router
  .route("/:id")
  .get(tourController.getTour)
  .patch(
    [authController.protect, authController.restrictTo("admin", "lead-guide")],
    photoController.resizeTourPhotos,
    photoController.uploadTourPhotos,
    tourController.updateTour
  )
  .delete(
    [authController.protect, authController.restrictTo("admin")],
    tourController.deleteTour
  );

// router
//   .route("/:tourId/reviews")
//   .post(
//     [authController.protect, authController.restrictTo("user", "guide")],
//     reviewController.createReview
//   );

module.exports = router;
