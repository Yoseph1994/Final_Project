const mongoose = require("mongoose");
const validatorPkg = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { type } = require("os");

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Please Provide Name"] },
  email: {
    type: String,
    required: [true, "Please Provide Email Address"],
    unique: true,
    lowercase: true,
    validate: {
      validator: function (value) {
        return validatorPkg.isEmail(value);
      },
    },
    message: "Invalid Email Adress",
  },
  photo: {
    type: String,
    select: true,
    default: process.env.DEFAULT_IMAGE_URL,
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin", "superAdmin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "Please Provide Password"],
    validate: {
      validator: function (value) {
        return validatorPkg.isStrongPassword(value);
      },
      message:
        "Password Not Strong Enough, Use atleast 1 Uppercase, 1 Number, 1 Special Charachter and minimum of 8 charachters",
    },
    select: false,
  },
  confirmPassword: {
    type: String,
    required: [true, "Please Confirm Your Password"],
    validate: {
      //only works on SAVE, CREATE
      validator: function (value) {
        return this.password === value;
      },
      message: `Password Don't Match`,
    },
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordChangedAt: { type: Date },
  passwordResetToken: String,
  passwordResetExpires: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
});

//to hash before save

userSchema.pre("save", async function (next) {
  //1) check if password has been modified if not modified return next
  if (!this.isModified("password")) return next();
  //2) Hash and Mutate the password field remember this stands for the whole schema doc
  this.password = await bcrypt.hash(this.password, 12);
  //3) Set the confirm field to undefined Yeah I know its required just do it.
  this.confirmPassword = undefined;
  next();
});
// to update changedpass before save
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//to unselect deleted accounts
// userSchema.pre(/^find/, function (next) {
//   //this keyword points to query
//   //lets go and change only to pick active users before any find query runs
//   // this.find({ isActive: { $ne: false } });
//   // next();
//   // Exclude the inactive users query
//   if (this.getQuery().isActive !== false) {
//     this.find({ isActive: { $ne: false } });
//   }
//   next();
// });

//schema method thats accesible inside all the docs
//no need to use CATCHASYNC SINCE ITS JUST RETURNING NOT STORING IN A VARIABLE
userSchema.methods.checkCorrectPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//another schema method to check if password was changed after
//token was issued
//we are faking this situation remember to removve changedat from signup
userSchema.methods.checkPasswordChange = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimeStamp < changedTimeStamp;
  }

  //false means not changed
  return false;
};

//another schema method to generate random reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  //hash it using crypto module and store it in the schema resetToken field
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  //as a best practice use 10 mins for expiry
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  //return the unhashed
  return resetToken;
};

// EDITED
userSchema.methods.createEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.emailVerificationExpires = Date.now() + 3600000; //  1 hour 3600000
  return token;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
