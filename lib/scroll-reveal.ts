const selector = [
  "main .section-heading", "main .welcome-grid", "main .service-card", "main .news-card",
  "main .public-post-grid > article", "main .upcoming-event-cards > article", "main .leadership-group",
  "main .gallery-albums > button", "main .gallery-item", "main .sermons-public-grid > article",
].join(",");

export function startScrollReveal() {
  if (!("IntersectionObserver" in window)) return () => {};
  let observer: IntersectionObserver | undefined;
  let elements: HTMLElement[] = [];
  const timers = new Set<number>();
  const frame = window.requestAnimationFrame(() => {
    elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        element.classList.add("is-revealed");
        observer?.unobserve(element);
        const timer = window.setTimeout(() => {
          element.classList.remove("scroll-reveal", "is-revealed");
          timers.delete(timer);
        }, 700);
        timers.add(timer);
      }
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    elements.forEach((element, index) => {
      element.classList.add("scroll-reveal");
      element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 55}ms`);
      observer?.observe(element);
    });
  });
  return () => {
    window.cancelAnimationFrame(frame);
    observer?.disconnect();
    timers.forEach((timer) => window.clearTimeout(timer));
    elements.forEach((element) => {
      element.classList.remove("scroll-reveal", "is-revealed");
      element.style.removeProperty("--reveal-delay");
    });
  };
}
