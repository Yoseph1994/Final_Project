require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const port = process.env.PORT || 4000;
const dbString =
  process.env.DATABASE_ATLAS || "mongodb://127.0.0.1/AdventureHub";
app.listen(port, () => {
  console.log(`Running from ${port}`);
});

mongoose
  .connect(dbString)
  .then(() => console.log("Mongo Connected Succesfully", dbString))
  .catch(() => console.log("Unable to connect"));
