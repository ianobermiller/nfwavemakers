migrate(
  (app) => {
    const settings = app.settings();
    settings.meta.appName = "NF Wavemakers";
    settings.meta.appURL = "https://nfwavemakers.com";
    settings.meta.senderName = "NF Wavemakers";
    // Local/dev keep the placeholder address until SMTP is configured.
    if (!settings.meta.senderAddress || settings.meta.senderAddress === "support@example.com") {
      settings.meta.senderAddress = "noreply@nfwavemakers.com";
    }
    settings.trustedProxy.headers = ["X-Forwarded-For", "X-Real-IP"];
    settings.batch.enabled = true;
    if (!settings.batch.maxRequests || settings.batch.maxRequests < 1) {
      settings.batch.maxRequests = 50;
    }
    if (!settings.batch.timeout || settings.batch.timeout < 1) {
      settings.batch.timeout = 3;
    }
    app.save(settings);
  },
  (app) => {
    const settings = app.settings();
    settings.batch.enabled = false;
    app.save(settings);
  },
);
