const catchAsyncErrors = require("../middleware/catchAsyncErrors");


exports.Payment = catchAsyncErrors(async (req, res, next) => {
  const myPayment = await stripe.paymentIntents.create({
    amount: req.body.amount,
    currency: "usd",
    metadata: {
      company: "MERN",
    },
  });


});


});
