const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const sendEmail = require("../utils/email");
const Email = require("../utils/email");
const User = require("../models/userModel");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res, req) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000), //to milliSeconds
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "Lax" : "None",
    secure: process.env.NODE_ENV === "production",
  };

  if (
    process.env.NODE_ENV !== "production" &&
    cookieOptions.sameSite === "None"
  ) {
    cookieOptions.secure = false;
  }

  if (process.env.NODE_ENV !== "production") {
    cookieOptions.sameSite = "Lax"; // Use 'Lax' for development
    cookieOptions.secure = false; // Secure should be false in development
  }

  res.cookie("jwt", token, cookieOptions);

  // Remove password because its returning in response
  // have some balls dont be afraid to do it

  user.password = undefined;
  res.status(statusCode).json({
    status: "success", // `statuCode`.startsWith('4')? 'fail': 'success
    token,
    role: user.role,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    photo,
    password,
    confirmPassword,
    passwordChangedAt,
    isEmailVerified,
    role,
  } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) return next(new AppError("User Already Exist", 400));

  const newUser = await User.create({
    name,
    email,
    photo,
    password,
    confirmPassword,
    passwordChangedAt,
    isEmailVerified,
    role,
  });

  // After successfully creating the user, generate an email verification token
  const token = newUser.createEmailVerificationToken();
  await newUser.save({ validateBeforeSave: false });

  // Construct the verification URL
  // Example of setting the frontend domain in your backend code
  const FRONTEND_DOMAIN =
    process.env.FRONTEND_DOMAIN || "http://localhost:5173";
  // const verificationURL = `${req.protocol}://${req.get(
  //   "host"
  // )}/api/v2/users/verify-email/${token}`;
  // Construct the verification URL using the frontend domain
  const verificationURL = `${FRONTEND_DOMAIN}/verify-email?token=${token}`;
  try {
    await new Email(newUser, verificationURL).sendEmailVerification();
    return res.json({
      status: "success",
      message: "Check Email Inbox to verify",
    });
    // createSendToken(newUser, 201, res);
  } catch (error) {
    await User.findByIdAndDelete(newUser._id);
    return next(
      new AppError(
        "There was an error sending the verification email. Please try again later.",
        500
      )
    );
  }
});

exports.login = catchAsync(async (req, res, next) => {
  //destructure email, password from req.body
  const { email, password } = req.body;
  //1) check if email & password not exists
  if (!email || !password) {
    return next(new AppError("Email and Password Field is empty", 400));
  }
  //2) check if user exists && at the same time if password was correct
  const user = await User.findOne({
    email,
    isActive: { $in: [true, false] },
  }).select("+password");
  // console.log("found Users", user);
  // mongoose.set("debug", true);

  // check if user exists since if exits and not verified we will delete them
  if (!user) return next(new AppError("Incorrect Email Or Password"));
  //check if tokem expired then delete the user here
  if (user.emailVerificationExpires < Date.now() && !user.isEmailVerified) {
    //delete user if token expired
    await User.findByIdAndDelete(user._id);
    return next(
      new AppError("Token has expired, signup again to verify email.", 401)
    );
  }

  if (!user.isEmailVerified) {
    return next(new AppError("Please verify your email.", 401));
  }

  if (!user || !(await user.checkCorrectPassword(password, user.password))) {
    return next(new AppError("Incorrect Email Or Password", 401));
  }

  if (!user.isActive) {
    // Reactivate the user's account and set emailVerified to false
    user.isActive = true;
    await user.save({ validateBeforeSave: false });

    // Optionally, you can send a notification to the user to verify their email again
  }

  //3) if all above are fine CREATE and send ONLY the token to client

  createSendToken(user, 200, res);
});

//logout will be implemented later on and get route for it also not defined
exports.logout = catchAsync(async (req, res, next) => {
  const cookieOptions = {
    expires: new Date(0), // Set to a past date to clear the cookie
    // expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "Lax" : "None",
    secure: process.env.NODE_ENV === "production",
  };

  if (process.env.NODE_ENV !== "production") {
    cookieOptions.sameSite = "Lax"; // Use 'Lax' for development
    cookieOptions.secure = false; // Secure should be false in development
  }
  res.cookie("tokens", "", cookieOptions);

  res.status(200).json({ status: "logout successful" });
});

exports.protect = catchAsync(async (req, res, next) => {
  //1) Get Tokens and check if its there
  // let token;
  // if (
  //   req.headers.authorization &&
  //   req.headers.authorization.startsWith("Bearer")
  // ) {
  //   token = req.headers.authorization.split(" ")[1];
  // }

  const token = req.cookies.jwt;

  if (!token) return next(new AppError("Must be logged in", 401));
  //2) Verify token
  // since verify is traditional asynchronous make it promisify
  // we stored in decoded to just grasp an id from it nothing else
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET_KEY
  );
  //3) check is user still exists
  const { id, iat } = decoded;
  const currentUser = await User.findById(id);
  if (!currentUser) return next(new AppError(`User no longer exist`, 401));
  //3) check if password was changed after token was issued
  //use schema method for this one
  if (currentUser.checkPasswordChange(iat)) {
    return next(new AppError("Password has been changed recently", 401));
  }

  //Grant access to protected route
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  //console.log(...roles);
  return (req, res, next) => {
    //roles is an array ['admin','lead-guide', 'guide','superAdmin'] --> if role exists in the array then authorize
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`You don't have permission to perform such action`, 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get User From Post Email
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user)
    return next(new AppError(`No User Found by the email:${email}`, 404));

  //2) Generate Random Reset Token

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3) Send the resetTokn to the client
  try {
    const FRONTEND_DOMAIN =
      process.env.FRONTEND_DOMAIN || "http://localhost:5173";
    // const resetURL = `${req.protocol}://${req.get(
    //   "host"
    // )}/api/v2/users/reset-password/${resetToken}`;
    const resetURL = `${FRONTEND_DOMAIN}/reset-password?token=${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    //JSON RESPONSE
    res
      .status(200)
      .json({ status: "success", message: "Token Sent Via Email" });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError(`An Error Occured Try Again Later`), 500);
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get the user based on the token
  // and also has the resetToken from the params
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  //now lets find the user based on the above token
  // also check if its not expired
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) if token not expired and user is found based on the above token set the new password
  if (!user) return next(new AppError("Token has expired or its invalid", 400));
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3) Update passWordChangedAt property for the user
  // set this using the schema hook pre save automatically
  //4) Log the user in and send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get the user from the collection
  const user = await User.findById(req.user.id).select("+password");
  //2) Check if the POSTed password is correct
  //we already have an instance method to check this
  if (
    !(await user.checkCorrectPassword(req.body.currentPassword, user.password))
  ) {
    return next(new AppError("Current Password is incorrect", 401));
  }
  //3) If the password is correct then update the password
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  await user.save();
  //4) Send token and signUser
  createSendToken(user, 200, res);
});

// In your authController
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user)
    return next(
      new AppError("Email verification token is invalid or has expired", 400)
    );

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // if (user.isEmailVerified) {
  //   const welcomeURL = `${req.protocol}://${req.get("host")}/api/v2/tours`;
  //   try {
  //     await new Email(user, welcomeURL).sendWelcome();
  //   } catch (error) {
  //     return next(new AppError(`An Error Occured Try Again Later`), 500);
  //   }
  // }

  res.status(200).json({
    status: "success",
    message: "Email verified successfully",
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    photo,
    password,
    confirmPassword,
    passwordChangedAt,
    isEmailVerified,
    role,
  } = req.body;
  const newUser = await User.create({
    name,
    email,
    photo,
    password,
    confirmPassword,
    passwordChangedAt,
    isEmailVerified,
    role,
  });

  // After successfully creating the user, generate an email verification token
  const token = newUser.createEmailVerificationToken();
  await newUser.save({ validateBeforeSave: false });
  const FRONTEND_DOMAIN =
    process.env.FRONTEND_DOMAIN || "http://localhost:3000";
  const verificationURL = `${FRONTEND_DOMAIN}/verify-email?token=${token}`;
  try {
    await new Email(newUser, verificationURL).sendEmailVerification();
    return res.json({
      status: "success",
      message: "Check Email Inbox to verify",
    });
    // createSendToken(newUser, 201, res);
  } catch (error) {
    await User.findByIdAndDelete(newUser._id);
    return next(
      new AppError(
        "There was an error sending the verification email. Please try again later.",
        500
      )
    );
  }

  // Construct the verification URL
  // const verificationURL = `${req.protocol}://${req.get(
  //   "host"
  // )}/api/v2/users/verify-email/${token}`;

  // try {
  //   await sendEmail({
  //     email: newUser.email,
  //     subject: "Email Verification",
  //     text: `Please verify your email by clicking on this link: ${verificationURL}`,
  //   });

  //   // If the email is sent successfully, proceed to send the response
  //   createSendToken(newUser, 201, res);
  // } catch (error) {
  //   // If there's an error sending the email, handle it appropriately
  //   // For example, you might want to delete the user or mark them as unverified
  //   await User.findByIdAndDelete(newUser._id);
  //   return next(
  //     new AppError(
  //       "There was an error sending the verification email. Please try again later.",
  //       500
  //     )
  //   );
  // }
});
