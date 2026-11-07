// Sign-in codes are the normal path. A fresh users collection leaves OTP off.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    // Schema replay for tests hands back a plain object with no auth options.
    // A real users collection already has otp, including its email template.
    if (!users.otp) {
      users.otp = {
        enabled: false,
        duration: 180,
        length: 8,
        emailTemplate: {
          subject: "OTP for {APP_NAME}",
          body: "<p>Hello,</p>\n<p>Your one-time password is: <strong>{OTP}</strong></p>\n<p><i>If you didn't ask for the one-time password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>",
        },
      };
    }
    users.otp.enabled = true;
    users.otp.duration = 180;
    users.otp.length = 6;
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users.otp) return;
    users.otp.enabled = false;
    app.save(users);
  },
);
