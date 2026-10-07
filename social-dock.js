const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" class="fill-icon"/></svg>'
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill-icon" d="M14 8h3V4.2c-.5-.1-2.1-.2-4-.2-3.9 0-6.5 2.3-6.5 6.7V14H3v4.2h3.5V24h4.3v-5.8h3.6L15 14h-4.2v-2.9C10.8 9 11.4 8 14 8Z"/></svg>'
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill-icon" d="M5.2 7.8A2.6 2.6 0 1 0 5.2 2.6a2.6 2.6 0 0 0 0 5.2ZM3 21h4.4V9.2H3V21Zm7.2 0h4.4v-6.6c0-1.8.3-3.5 2.6-3.5s2.3 2.1 2.3 3.6V21H24v-7.3c0-3.6-.8-6.4-5-6.4-2 0-3.4 1.1-4 2.1h-.1V9.2h-4.2V21Z"/></svg>'
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill-icon" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>'
  }
];

let siteFooter = document.querySelector(".footer");
if (!siteFooter) {
  siteFooter = document.createElement("footer");
  siteFooter.className = "footer social-only-footer";
  siteFooter.innerHTML = '<div class="footer-top social-footer-top"></div><div class="footer-bottom"><p>© 2026 WESTERS EVENTS PRIVATE LIMITED. All Rights Reserved.</p><p>Media | Advertising | Events</p></div>';
  document.body.appendChild(siteFooter);
}

let footerTop = siteFooter.querySelector(".footer-top");
if (!footerTop) {
  footerTop = document.createElement("div");
  footerTop.className = "footer-top social-footer-top";
  siteFooter.prepend(footerTop);
}

const socialDock = document.createElement("nav");
socialDock.className = "social-dock";
socialDock.setAttribute("aria-label", "Westers social media");
socialDock.innerHTML = socialLinks.map(({ label, href, icon }) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${label}" title="${label}">${icon}</a>`
).join("");
footerTop.appendChild(socialDock);
