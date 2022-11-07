export const configuration = () => ({
  NODE_ENV: process.env.NODE_ENV,
  user_microservice: {
    host: process.env.USER_MS_HOST,
    port: parseInt(process.env.USER_MS_PORT, 10) || 4010,
  },
});
