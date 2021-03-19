declare namespace NodeJS {
  export interface ProcessEnv {
    DATABASE_URL: string;
    REDIS_URL: string;
    PORT: string;
    SESSION_SECRET: string;
    CORS_ORIGIN: string;
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_BUCKET_NAME: string;
    AWS_REGION: string;
    SMTP_HOST: string;
    SMTP_PORT: string;
    SMTP_LOGIN: string;
    SMTP_PASSWORD: string;
  }
}
