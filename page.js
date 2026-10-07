const pageHeader = document.getElementById("header");
const pageMenuButton = document.getElementById("menuBtn");
const pageNavbar = document.getElementById("navbar");

pageMenuButton?.setAttribute("aria-expanded", "false");
pageMenuButton?.setAttribute("aria-controls", "navbar");
if (pageMenuButton && !pageMenuButton.getAttribute("aria-label")) pageMenuButton.setAttribute("aria-label", "Open navigation menu");

import("/social-dock.js");
import("/clean-urls.js");

document.querySelectorAll("a").forEach(link => {
  if (link.textContent.trim() === "Plan Your Event") link.href = "/#plan-event";
});

window.addEventListener("scroll", () => pageHeader?.classList.toggle("scrolled", window.scrollY > 30));

pageMenuButton?.addEventListener("click", () => {
  pageNavbar?.classList.toggle("active");
  pageMenuButton.setAttribute("aria-expanded", String(pageNavbar?.classList.contains("active")));
  pageMenuButton.textContent = pageNavbar?.classList.contains("active") ? "×" : "☰";
});

pageNavbar?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", event => {
    const parentDropdown = link.parentElement.closest(".has-dropdown");
    const isDropdownTrigger = parentDropdown && link === parentDropdown.querySelector(":scope > a");
    if (window.innerWidth <= 1000 && isDropdownTrigger && !parentDropdown.classList.contains("dropdown-open")) {
      event.preventDefault();
      pageNavbar.querySelectorAll(".has-dropdown.dropdown-open").forEach(item => {
        if (item !== parentDropdown) item.classList.remove("dropdown-open");
      });
      parentDropdown.classList.add("dropdown-open");
      return;
    }
    pageNavbar.querySelectorAll(".has-dropdown.dropdown-open").forEach(item => item.classList.remove("dropdown-open"));
    pageNavbar.classList.remove("active");
    pageMenuButton.setAttribute("aria-expanded", "false");
    pageMenuButton.textContent = "☰";
  });
});
