export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Next.js + HeroUI",
  description: "Make beautiful websites regardless of your design experience.",
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
    github: "https://github.com/abhinavpola/personal_website",
    twitter: "https://x.com/abhinavpola",
    linkedin: "https://www.linkedin.com/in/abhinav-pola/",
  },
};
