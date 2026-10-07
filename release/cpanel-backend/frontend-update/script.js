const header = document.getElementById("header");

document.querySelectorAll(".enquiry-animation video, .space-animation video").forEach(enquiryAnimation => {
  enquiryAnimation.muted = true;
  enquiryAnimation.loop = true;
  const resumeEnquiryAnimation = () => {
    if (!document.hidden && enquiryAnimation.paused) {
      enquiryAnimation.play().catch(() => {});
    }
  };
  enquiryAnimation.addEventListener("canplay", resumeEnquiryAnimation);
  enquiryAnimation.addEventListener("ended", () => {
    enquiryAnimation.currentTime = 0;
    resumeEnquiryAnimation();
  });
  document.addEventListener("visibilitychange", resumeEnquiryAnimation);
  document.addEventListener("pointerdown", resumeEnquiryAnimation, { once: true });
  resumeEnquiryAnimation();
});

if (window.location.hash === "#home") {
  history.replaceState(null, "", window.location.pathname || "/");
}

import("/clean-urls.js");

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});

const menuBtn = document.getElementById("menuBtn");
const navbar = document.getElementById("navbar");

menuBtn.addEventListener("click", () => {
  navbar.classList.toggle("active");
  menuBtn.setAttribute("aria-expanded", String(navbar.classList.contains("active")));

  if (navbar.classList.contains("active")) {
    menuBtn.innerHTML = "×";
  } else {
    menuBtn.innerHTML = "☰";
  }
});

document.querySelectorAll(".navbar a").forEach(link => {
  link.addEventListener("click", event => {
    const parentDropdown = link.parentElement.closest(".has-dropdown");
    const isDropdownTrigger = parentDropdown && link === parentDropdown.querySelector(":scope > a");

    if (window.innerWidth <= 1000 && isDropdownTrigger && !parentDropdown.classList.contains("dropdown-open")) {
      event.preventDefault();
      document.querySelectorAll(".has-dropdown.dropdown-open").forEach(item => {
        if (item !== parentDropdown) item.classList.remove("dropdown-open");
      });
      parentDropdown.classList.toggle("dropdown-open");
      return;
    }

    navbar.classList.remove("active");
    menuBtn.setAttribute("aria-expanded", "false");
    document.querySelectorAll(".has-dropdown.dropdown-open").forEach(item => {
      item.classList.remove("dropdown-open");
    });
    menuBtn.innerHTML = "☰";
  });
});

document.querySelectorAll("[data-nav-filter]").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelector(`.filter[data-filter="${link.dataset.navFilter}"]`)?.click();
  });
});

const filterButtons = document.querySelectorAll(".filter");
const galleryItems = document.querySelectorAll(".gallery-item");

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    filterButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");

    const category = button.dataset.filter;

    galleryItems.forEach(item => {
      const itemCategory = item.dataset.category;

      if (category === "all" || category === itemCategory) {
        item.classList.remove("hide");
      } else {
        item.classList.add("hide");
      }
    });
  });
});

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const closeLightbox = document.getElementById("closeLightbox");

galleryItems.forEach(item => {
  item.addEventListener("click", () => {
    const image = item.querySelector("img");
    lightboxImage.src = image.src;
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
  });
});

closeLightbox.addEventListener("click", () => {
  lightbox.classList.remove("active");
  document.body.style.overflow = "auto";
});

lightbox.addEventListener("click", event => {
  if (event.target === lightbox) {
    lightbox.classList.remove("active");
    document.body.style.overflow = "auto";
  }
});

const revealElements = document.querySelectorAll(
  ".service-card, .work-card, .gallery-item"
);

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.animate(
          [
            {
              opacity: 0,
              transform: "translateY(35px)"
            },
            {
              opacity: 1,
              transform: "translateY(0)"
            }
          ],
          {
            duration: 700,
            easing: "ease-out",
            fill: "forwards"
          }
        );

        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.15
  }
);

revealElements.forEach(element => {
  observer.observe(element);
});

const showcaseGallery = document.getElementById("showcaseGallery");
const showcasePrev = document.querySelector(".gallery-prev");
const showcaseNext = document.querySelector(".gallery-next");

if (showcaseGallery && showcasePrev && showcaseNext) {
  const showcaseScrollAmount = () => {
    const card = showcaseGallery.querySelector(".showcase-card");
    return card ? card.offsetWidth + 10 : 350;
  };

  showcaseNext.addEventListener("click", () => {
    showcaseGallery.scrollBy({ left: showcaseScrollAmount(), behavior: "smooth" });
  });

  showcasePrev.addEventListener("click", () => {
    showcaseGallery.scrollBy({ left: -showcaseScrollAmount(), behavior: "smooth" });
  });

  let showcaseDragging = false;
  let showcaseStartX = 0;
  let showcaseScrollLeft = 0;

  showcaseGallery.addEventListener("mousedown", event => {
    showcaseDragging = true;
    showcaseGallery.classList.add("dragging");
    showcaseStartX = event.pageX - showcaseGallery.offsetLeft;
    showcaseScrollLeft = showcaseGallery.scrollLeft;
  });

  ["mouseleave", "mouseup"].forEach(eventName => {
    showcaseGallery.addEventListener(eventName, () => {
      showcaseDragging = false;
      showcaseGallery.classList.remove("dragging");
    });
  });

  showcaseGallery.addEventListener("mousemove", event => {
    if (!showcaseDragging) return;
    event.preventDefault();
    const currentX = event.pageX - showcaseGallery.offsetLeft;
    showcaseGallery.scrollLeft = showcaseScrollLeft - (currentX - showcaseStartX) * 1.5;
  });
}

const featuredRevealItems = document.querySelectorAll(
  ".featured-top, .showcase-gallery, .featured-bottom"
);

const featuredObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
      featuredObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

featuredRevealItems.forEach(item => featuredObserver.observe(item));

const spaceTrack = document.getElementById("spaceTrack");
const motionArea = document.querySelector(".motion-area");

if (spaceTrack && motionArea) {
  const originalSpaceCards = Array.from(spaceTrack.querySelectorAll(".space-card"));

  originalSpaceCards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    spaceTrack.appendChild(clone);
  });

  let spacePosition = 0;
  let spaceSpeed = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.55;
  let savedSpaceSpeed = spaceSpeed;
  let spaceDragging = false;
  let spaceStartX = 0;
  let spaceDragStart = 0;

  const getSpaceLoopWidth = () => spaceTrack.scrollWidth / 2;

  const updateSpaceCards = () => {
    const areaRect = motionArea.getBoundingClientRect();
    const centerX = areaRect.left + areaRect.width / 2;

    spaceTrack.querySelectorAll(".space-card").forEach(card => {
      const rect = card.getBoundingClientRect();
      const normalized = (rect.left + rect.width / 2 - centerX) / (areaRect.width / 2);
      const amount = Math.min(Math.abs(normalized), 1);
      const scale = 1.01 - amount * 0.01;
      card.style.transform = `translateY(0) rotate(0deg) scale(${scale})`;
    });
  };

  const animateSpaceTrack = () => {
    if (!spaceDragging) spacePosition += spaceSpeed;
    const loopWidth = getSpaceLoopWidth();

    if (loopWidth > 0) {
      if (spacePosition >= loopWidth) spacePosition -= loopWidth;
      if (spacePosition < 0) spacePosition += loopWidth;
    }

    spaceTrack.style.transform = `translate3d(${-spacePosition}px, 0, 0)`;
    updateSpaceCards();
    requestAnimationFrame(animateSpaceTrack);
  };

  motionArea.addEventListener("pointerdown", event => {
    spaceDragging = true;
    spaceStartX = event.clientX;
    spaceDragStart = spacePosition;
    spaceTrack.classList.add("dragging");
    motionArea.setPointerCapture(event.pointerId);
  });

  motionArea.addEventListener("pointermove", event => {
    if (spaceDragging) spacePosition = spaceDragStart - (event.clientX - spaceStartX);
  });

  const stopSpaceDragging = () => {
    spaceDragging = false;
    spaceTrack.classList.remove("dragging");
  };

  motionArea.addEventListener("pointerup", stopSpaceDragging);
  motionArea.addEventListener("pointercancel", stopSpaceDragging);
  motionArea.addEventListener("mouseenter", () => {
    savedSpaceSpeed = spaceSpeed;
    spaceSpeed = Math.min(spaceSpeed, 0.18);
  });
  motionArea.addEventListener("mouseleave", () => {
    stopSpaceDragging();
    spaceSpeed = savedSpaceSpeed;
  });
  window.addEventListener("resize", updateSpaceCards);

  animateSpaceTrack();
}
import("/social-dock.js");
