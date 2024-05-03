const mongoose = require("mongoose");

//* bookingSchema **************************************************

const bookingSchema = new mongoose.Schema(
  {
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      required: [true, "Booking must belong to a tour"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Booking must belong to a user"],
    },
    price: {
      type: Number,
      required: [true, "Booking must have a price"],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    payment_intent: {
      type: String,
      required: [true, "Payment intent required"],
      select: false,
    },
    refund: String,
    status: {
      type: String,
      enum: {
        values: ["pending", "paid", "canceled", "refunded"],
        message:
          "Booking status can be - pending, paid, canceled and refunded only",
      },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//* Virtuals *******************************************************

// virtual populate review
bookingSchema.virtual("review", {
  ref: "Review",
  foreignField: "booking",
  localField: "_id",
});

//* Pre Middlewares ************************************************

// populate user field
bookingSchema.pre(/^find/, function (next) {
  this.populate({
    path: "tour",
    select: "name imageCover price duration",
  });
  next();
});

//* Model **********************************************************

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;
