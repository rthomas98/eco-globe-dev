export default {
  providers: [
    {
      // Convex Better Auth handles providers via Better Auth config
      // This config is used by the Convex auth framework
      domain: process.env.SITE_URL,
      applicationID: "better-auth",
    },
  ],
};
