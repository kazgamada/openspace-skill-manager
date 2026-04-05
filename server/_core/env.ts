export const ENV = {
  appId: process.env.VITE_APP_ID ?? "local",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Local auth (used when OAUTH_SERVER_URL is not set)
  localAdminEmail: process.env.LOCAL_ADMIN_EMAIL ?? "",
  localAdminPassword: process.env.LOCAL_ADMIN_PASSWORD ?? "",
  localAdminName: process.env.LOCAL_ADMIN_NAME ?? "Admin",
};
