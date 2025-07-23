const catchAsyncErrors = require("../middleware/catchAsyncErrors");

const stripe = require("stripe")("sk_test_51QOycTII53sZYyCwdnpBPYVyWpG0ABR1ZKFRZW5Ac5aYuUtS18qyJan4Z4PbsatHPpcmBZ5hUppJm4QciBqQL39Z00WecBHpQJ");

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
