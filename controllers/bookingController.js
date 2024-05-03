const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const AppError = require("../utils/appError");
const Tour = require("../models/tourModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("../controllers/handlerFactory");

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // Get the tour to be booked
  const tour = await Tour.findById(req.params.tourID);
  // create session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${req.protocol}://${req.get("host")}/`,
    cancel_url: `${req.protocol}://${req.get("host")}/tours/${
      req.params.tourID
    }`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourID,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "etb",
          product_data: {
            name: tour.name,
            description: tour.summary,
            images: [tour.imageCover],
          },
          unit_amount: tour.price * 100,
        },
        quantity: 1,
      },
    ],
    invoice_creation: {
      enabled: true,
      invoice_data: {
        metadata: {
          tourStartDate: tour.startDates[0],
        },
      },
    },
  });
  //send to client
  res.status(200).json({
    status: "success",
    session,
  });
});
