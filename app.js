if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const { listingSchema, reviewSchema } = require("./schema.js");
const Review = require("./models/review.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const listingController = require("./controllers/listing.js");
const reviewController = require("./controllers/review.js");
const userController = require("./controllers/user.js");
const router = express.Router();
const multer = require("multer");
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage });
const MongoStore = require("connect-mongo");


const {
  validateReview,
  isLoggedin,
  saveRedirectUrl,
  isOwner,
  isAuthor,
} = require("./middleware.js");
const DB_URL=process.env.DB_URL
main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });
async function main() {
  await mongoose.connect(DB_URL);
}
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extented: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
  mongoUrl: DB_URL,
  crypto: {
    secret:process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});
store.on("error",()=>{
  console.log("Error in Mongo session store",err);
});
const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user;
  next();
});
app.use(router);
app.listen(8080, () => {
  console.log("server is listening on port 8080");
});
app.get("/", (req, res) => {
  res.redirect("/listings");
});

//listing route--------------------------------------------------------------------------------
router.route("/Listings/new").get(isLoggedin, listingController.renderNewForm);
router
  .route("/Listings")
  .get(listingController.index)
  .post(isLoggedin, upload.single("image"), listingController.createListing);

router
  .route("/Listings/:id")
  .get(listingController.showListing)
  .put(
    isLoggedin,
    isOwner,
    upload.single("image"),
    listingController.updateListing
  )
  .delete(isLoggedin, isOwner, listingController.deleteListing);

app.get(
  "/Listings/:id/edit",
  isLoggedin,
  isOwner,
  listingController.renderEditForm
);

//review route--------------------------------------------------------------------------------

app.post(
  "/listings/:id/reviews",
  isLoggedin,
  validateReview,
  reviewController.createReview
);

app.delete(
  "/listings/:id/reviews/:reviewId",
  isLoggedin,
  isAuthor,
  reviewController.deleteReview
);

//user route----------------------------------------------------------------------------------

router
  .route("/signup")
  .get(userController.renderSignupForm)
  .post(userController.signup);

router
  .route("/login")
  .get(userController.renderLoginForm)
  .post(
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.login
  );

app.get("/logout", userController.logout);

// ----------------------------------------------------------------------------------------------
// app.get("/testListing",async(req,res)=>
// {
//     let sampleListing = new Listing({
//         title:"my home",
//         description:"by beach",
//         price:1200,
//         location: "goa",
//         country: "india",
//     });
//     await sampleListing.save();
//     console.log("sample was saved");
//     res.send("successful testing");
// });.
