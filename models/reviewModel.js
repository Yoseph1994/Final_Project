const mongoose = require("mongoose");

const Tour = require("./tourModel");

//* reviewSchema ***************************************************

const reviewSchema = new mongoose.Schema(
  {
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      required: [true, "Review must belong to a tour"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to an user"],
    },
    // booking: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Booking",
    //   required: [true, "Review must belong to a booking"],
    // },
    review: {
      type: String,
      required: [true, "Review can't be empty"],
    },
    rating: {
      type: Number,
      min: [1, "Rating must have minimum value 1.0"],
      max: [5, "Rating must have maximum value 5.0"],
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//* Indexes ********************************************************

// for a user 1 review per booking
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//* Virtuals *******************************************************

// virtual populate feedback
// reviewSchema.virtual("userFeedback", {
//   ref: "Feedback",
//   foreignField: "review",
//   localField: "_id",
// });

//* Pre Middlewares ************************************************

// populate user, booking fields
reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: "user",
  //     select: "name photo isActive",
  //   }).populate({
  //     path: "tour",
  //     select: "name",
  //   });

  this.populate({
    path: "user",
    select: "name photo isActive role",
  });

  next();
});

//* Post Middlewares ***********************************************

// calling the calcAverageRatings fn in Model - for create and update
reviewSchema.post("save", (doc, next) => {
  doc.constructor.calcRatingsStats(doc.tour._id);
  next();
});

// calling the calcAverageRatings fn in Model - for delete
reviewSchema.post("findOneAndDelete", (doc, next) => {
  doc.constructor.calcRatingsStats(doc.tour);
  console.log(doc);
  next();
});

reviewSchema.post("findOneAndUpdate", (doc, next) => {
  doc.constructor.calcRatingsStats(doc.tour);
  next();
});
// findByIdAndUpdate
// findByIdAndDelete
// reviewSchema.pre(/^findOneAnd/, async function (next) {
//   this.r = await this.findOne().clone().exec();
//   console.log(this.r);
//   next();
// });

// reviewSchema.post(/^findOneAnd/, async function () {
//   // await this.findOne(); does NOT work here, query has already executed
//   await this.r.constructor.calcAverageRatings(this.r.tour);
// });

//* Static Methods *************************************************

// calculate reviewCount, ratingsAverage, ratingsQuantity of a tour

reviewSchema.statics.calcRatingsStats = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: "$rating",
        total: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        star: "$_id",
        total: 1,
      },
    },
  ]);

  if (stats.length > 0) {
    const ratingsQuantity = stats.reduce((acc, el) => acc + el.total, 0);
    const ratingsAverage = stats.reduce(
      (acc, el) => acc + (el.star * el.total) / ratingsQuantity,
      0
    );

    await Tour.findByIdAndUpdate(tourId, {
      reviewsCount: stats,
      ratingsQuantity,
      ratingsAverage,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

//* Model **********************************************************

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
