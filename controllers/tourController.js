const catchAsync = require("../utils/catchAsync");
const APIFeatures = require("../utils/apiFeatures");
const Tour = require("../models/tourModel");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");
exports.getAllTours = catchAsync(async (req, res, next) => {
  // EXECUTE QUERY
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const foundTour = await features.query;
  res.status(200).json({
    status: "Success",
    results: foundTour.length,
    data: {
      tour: foundTour,
    },
  });
});

exports.getTour = factory.getOne(Tour, { path: "reviews" });
exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);

  res.status(200).json({
    status: "success",
    data: {
      tour: newTour,
    },
  });
});

exports.updateTour = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const tourTobeUpdated = await Tour.findByIdAndUpdate(id, req.body, {
    new: true, // makes it return the updated data
    runValidators: true,
  });
  if (!tourTobeUpdated) {
    return next(new AppError("Not Found", 404));
  }
  res.status(200).json({
    status: "Success",
    data: {
      tour: tourTobeUpdated,
    },
  });
});

exports.deleteTour = factory.deleteOne(Tour);

exports.deleteAllTours = catchAsync(async (req, res, next) => {
  await Tour.deleteMany({});
  res.status(204).json({
    message: "Deleted All",
  });
});

// ALIAS TOP_5_CHEAP
// MIDDLEWARES
exports.aliasTopTour = catchAsync(async (req, res, next) => {
  req.query.limit = "5";
  req.query.sort = "-ratingsAverage,price";
  req.query.fields = "name,price,ratingsAverage,summary,difficulty";
  next();
});

// STATISTICS METHODS
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: "$difficulty" },
        numTours: { $sum: 1 },
        numRatings: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);

  res.status(200).json({
    status: "success",
    data: {
      stats,
    },
  });
});

// MONTHLY PLAN

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021

  const plan = await Tour.aggregate([
    {
      $unwind: "$startDates",
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$startDates" },
        numTourStarts: { $sum: 1 },
        tours: { $push: "$name" },
      },
    },
    {
      $addFields: { month: "$_id" },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      plan: plan,
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        "Please provide latitute and longitude in the format lat,lng.",
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: "success",
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  if (!lat || !lng) {
    return next(
      new AppError(
        "Please provide latitude and longitude in the format: lat,lng",
        400
      )
    );
  }
  if (!["km", "mi"].includes(unit)) {
    return next(new AppError("Unit must be either km or mi", 400));
  }

  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        distanceField: "distance", // output in meter
        distanceMultiplier: multiplier, // conversion in km or mi
      },
    },
    {
      $project: { distance: 1, name: 1 },
    },
  ]);

  res.status(200).json({
    status: "SUCCESS",
    data: {
      distances,
    },
  });
});
