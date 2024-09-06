require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");

// Initialize Express and Twilio Client
const app = express();
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Twilio webhook for handling IVR response
app.post("/voice", (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  console.log(twiml);
  // Gather input from the user (press 1 for interview link)
  const gather = twiml.gather({
    numDigits: 1,
    action: "/handle-input",
    method: "POST",
  });
  console.log(gather);
  gather.say(
    "Welcome! If you would like to receive your personalized interview link, press 1."
  );

  res.type("text/xml");
  res.send(twiml.toString());
});

// Handle the input from the user
app.post("/handle-input", (req, res) => {
  const digit = req.body.Digits;

  const twiml = new twilio.twiml.VoiceResponse();

  if (digit == "1") {
    // Send SMS with the interview link
    client.messages
      .create({
        body: `Here is your personalized interview link: ${process.env.INTERVIEW_LINK}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.MY_PHONE_NUMBER,
      })
      .then((message) => {
        console.log(`Interview link sent with SID: ${message.sid}`);
      })
      .catch((error) => {
        console.error(`Failed to send SMS: ${error.message}`);
      });

    // Thank the user and end the call
    twiml.say(
      "Thank you! The interview link has been sent to your phone. Goodbye!"
    );
    twiml.hangup();
  } else {
    // Repeat the prompt if an incorrect option is pressed
    twiml.say(
      "Sorry, I didn’t get that. Please press 1 to receive the interview link."
    );
    twiml.redirect("/voice");
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

// Make the call
app.post("/make-call", (req, res) => {
  client.calls
    .create({
      url: ` https://c574-47-247-145-202.ngrok-free.app/voice`,
      to: process.env.MY_PHONE_NUMBER,
      from: process.env.TWILIO_PHONE_NUMBER,
    })
    .then((call) => {
      res.status(200).json({ message: "Call initiated!", callSid: call.sid });
    })
    .catch((error) => {
      res
        .status(500)
        .json({ message: "Failed to initiate call", error: error.message });
    });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
