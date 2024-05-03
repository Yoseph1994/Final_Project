const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const factory = require("../controllers/handlerFactory");
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
const AuthController = require("./authController");
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(User.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const users = await features.query;

  res.status(200).json({
    status: "Success",
    results: users.length,
    data: {
      users,
    },
  });
});
exports.getAllnIactiveUsers = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(User.find({ isActive: false }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const users = await features.query;

  res.status(200).json({
    status: "Success",
    results: users.length,
    data: {
      users,
    },
  });
});
exports.getAllActiveUsers = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(User.find({ isActive: true }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const users = await features.query;

  res.status(200).json({
    status: "Success",
    results: users.length,
    data: {
      users,
    },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }
  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, "name", "email", "photo");
  // // if (req.file) filteredBody.photo = req.file.filename;
  // console.log(filteredBody);
  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  await authController.logout();
  res.status(204).json({
    status: "success",
    message: "Account Deactivated Succesfully",
    data: null,
  });
});

exports.getUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  res.status(500).json({
    status: "Success",
    data: {
      user,
    },
  });
});

exports.createUser = catchAsync(async (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not yet defined!",
  });
});

exports.updatedUser = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(req.body, "isActive", "role");

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deActivateUser = catchAsync(async (req, res) => {
  console.log(req.user);
  await User.findByIdAndUpdate(req.params.id, { isActive: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (req.user.id === req.params.id) {
    return next(
      new AppError("You cannot delete your own account from this route", 400)
    );
  }
  const { role } = user;
  // Check if the user has an admin or super-admin role
  if (role === "admin" || role === "super-admin") {
    return next(new AppError("You cannot delete admins or super-admins", 401));
  } else {
    await User.findByIdAndUpdate(id, { isActive: false });
    res.status(204).json({
      status: "success",
      data: null,
    });
  }
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { isActive: false });

  // await AuthController.logout(); --> Destroy Cookie After Setting isActive False
  res.cookie("jwt", "deletedAccount");
  // res.clearCookie("jwt")
  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.permanentDeleteAccount = catchAsync(async (req, res, next) => {
  await User.findByIdAndDelete(req.user.id);
  res.cookie("jwt", "deletedAccount");
  await User.res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.getAllInactiveUsers = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(User.find({ isActive: false }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const inActiveUsers = await features.query;

  res.status(200).json({
    status: "Success",
    results: inActiveUsers.length,
    data: {
      inActiveUsers: inActiveUsers,
    },
  });
});

exports.addPhotoToBody = (req, res, next) => {
  // Create an error if user tries to change password in this route
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /update-my-password",
        400
      )
    );
  }

  if (req.photo) req.body.photo = req.photo;
  next();
};

//set id to current user id
exports.setCurrentUser = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};
