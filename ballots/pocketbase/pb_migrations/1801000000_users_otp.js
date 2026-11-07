// Sign-in codes are the normal path. A fresh users collection leaves OTP off.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.otp.enabled = true;
    users.otp.duration = 180;
    users.otp.length = 6;
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.otp.enabled = false;
    app.save(users);
  },
);
