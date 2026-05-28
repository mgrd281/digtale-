// Centralised, validated access to environment variables.
// Throwing here surfaces misconfiguration at first use instead of as a vague
// runtime error deep inside a request.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  get appUrl() {
    return required("SHOPIFY_APP_URL").replace(/\/$/, "");
  },
  get shopifyApiSecret() {
    return required("SHOPIFY_API_SECRET");
  },

  // SMTP (KARINEX own domain)
  smtp: {
    get host() {
      return required("SMTP_HOST");
    },
    get port() {
      return Number(optional("SMTP_PORT", "587"));
    },
    get secure() {
      return optional("SMTP_SECURE", "false") === "true";
    },
    get user() {
      return required("SMTP_USER");
    },
    get pass() {
      return required("SMTP_PASS");
    },
    get from() {
      return optional("MAIL_FROM", "KARINEX <kundenservice@karinex.de>");
    },
    get merchantAlertTo() {
      return optional("MERCHANT_ALERT_EMAIL", "kundenservice@karinex.de");
    },
  },

  // S3-compatible object storage for downloadable files.
  s3: {
    get region() {
      return optional("S3_REGION", "auto");
    },
    get endpoint() {
      return optional("S3_ENDPOINT");
    },
    get bucket() {
      return required("S3_BUCKET");
    },
    get accessKeyId() {
      return required("S3_ACCESS_KEY_ID");
    },
    get secretAccessKey() {
      return required("S3_SECRET_ACCESS_KEY");
    },
    get forcePathStyle() {
      return optional("S3_FORCE_PATH_STYLE", "true") === "true";
    },
  },
} as const;
