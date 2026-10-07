const cleanAddressBar = () => {
  if (!window.location.hash) return;

  const id = decodeURIComponent(window.location.hash.slice(1));
  const target = document.getElementById(id);
  if (!target) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    return;
  }

  requestAnimationFrame(() => {
    target.scrollIntoView();
    requestAnimationFrame(() => {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    });
  });
};

document.addEventListener("click", event => {
  const link = event.target.closest("a[href*='#']");
  if (!link) return;

  const destination = new URL(link.href, window.location.href);
  const samePage = destination.origin === window.location.origin && destination.pathname === window.location.pathname;
  if (!samePage || !destination.hash) return;

  const target = document.getElementById(decodeURIComponent(destination.hash.slice(1)));
  event.preventDefault();
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
});

window.addEventListener("hashchange", cleanAddressBar);
cleanAddressBar();
