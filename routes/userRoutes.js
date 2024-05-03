const express = require("express");
const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");
const photoController = require("../controllers/photoController");
const rateLimiter = require("../utils/rateLimiter");
const router = express.Router();

// Routes for AUTH Related

// @SIGN_UP URL/api/v2/users/signup
// @ POST
// PUBLIC
router.post("/signup", authController.signup);
// @VERIFY URL/api/v2/users/verify-email/:token
// @ POST
// PUBLIC
router.get("/verify-email/:token", authController.verifyEmail);
// @VERIFY URL/api/v2/users/login
// @ POST
// PUBLIC
router.post(
  "/login",
  rateLimiter(
    10,
    10,
    "Suspicious Activity Detected Try Again After Ten Minutes"
  ),
  authController.login
);
// @VERIFY URL/api/v2/users/logout
// @ POST
// PUBLIC
router.post("/logout", authController.logout);
// @VERIFY URL/api/v2/users/forget-password
// @ POST
// PUBLIC
router.post("/forgotPassword", authController.forgotPassword);
// @VERIFY URL/api/v2/users/reset-password/:token --> After forgotPassword reset it on this route
// @ POST
// PUBLIC
router.patch(
  "/resetPassword/:token",
  rateLimiter(
    10,
    10,
    "Suspicious Activity Detected Try Again After Ten Minutes"
  ),
  authController.resetPassword
);

// Protect all routes after this middleware
router.use(authController.protect);
router.get("/me", userController.getMe, userController.getUser);
router.patch("/updateMyPassword", authController.updatePassword);

//to set params id to current user id use setCuurentUser Middleware
router.patch(
  "/updateMe",
  photoController.uploadUserPhoto,
  userController.setCurrentUser,
  photoController.resizeUserPhoto,
  userController.addPhotoToBody,
  userController.updateMe
);
router.delete("/deleteMe", userController.deleteMe);
router.delete("/permanentDelete", userController.permanentDeleteAccount);

router.use(authController.restrictTo("admin"));
router
  .route("/")
  .get(userController.getAllUsers)
  .post(authController.createUser);

router.route("/active-users").get(userController.getAllActiveUsers);
router.route("/inactive-users").get(userController.getAllnIactiveUsers);

router
  .route("/:id")
  .get(userController.getUser)
  // .patch(userController.updatedUser) some technical bug
  .delete(userController.deleteUser);

// Some Technical Bug of operations
// router.route("/deActivate-users/:id").delete(userController.deActivateUser);
module.exports = router;
