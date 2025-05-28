export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Abhinav's Website",
  description: "My personal website where I share my thoughts and projects.",
  navItems: [
    {
      label: "Blog",
      href: "/blog",
    },
    {
      label: "Resume",
      href: "/resume",
    },
    {
      label: "Projects",
      children: [
        {
          label: "Agent Safety Evals",
          href: "/agent-safety-evals",
        },
        {
          label: "Crowdsourced Fractal Computation",
          href: "/crowdsourced-fractal-computation",
        },
      ],
    },
  ],
  links: {
    github: "https://github.com/abhinavpola/",
    twitter: "https://x.com/abhinavpola",
    linkedin: "https://www.linkedin.com/in/abhinav-pola/",
  },
};
