const path = require("path");
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const app = express();
// const cors = require("cors");

// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     credentials: true,
//   })
// );

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
// reltaed to body
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// DATA SANIIZATION AGAINST NOSQL QUERY INJECTION
app.use(mongoSanitize());
// DATA SANIZATION AGAINST XSS ATTACK --> Malicious HTML CODE
app.use(xss());
// PREVENT PARAMETER POLLUTION --> DUPLICATE SAME QUERYSTRINGS
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
      "role",
    ],
  })
);
// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//ROUTERS IMPORTED
const userRoutes = require("./routes/userRoutes");
const tourRouter = require("./routes/tourRouter");
const reviewRouter = require("./routes/reviewRouter");
const bookingRouter = require("./routes/bookingRoutes");
// Routes Mounted
app.use("/api/v2/users", userRoutes);
app.use("/api/v2/tours", tourRouter);
app.use("/api/v2/reviews", reviewRouter);
app.use("/api/v2/bookings", bookingRouter);
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//related to errorHandling
app.use(globalErrorHandler);

module.exports = app;

// //create function that handles sending emails to clients

// const sendEmail = async (options) => {
//   //1)Create transporter
//   const transporter = nodemailer.createTransport({
//     service: "gmail", // or another service
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_APP_BASED_PASS,
//     },
//   });
//   //2) Define email options

//   const mailOptions = {
//     from: "Yoseph Shimelis <joshrde2002@gmail.com>",
//     to: options.email,
//     subject: options.subject,
//     text: options.text,
//     //html for later
//   };
//   //3)Send the email
//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
