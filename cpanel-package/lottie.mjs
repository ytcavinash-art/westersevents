const whatsappCanvas = document.getElementById("whatsappLottie");
const whatsappButton = whatsappCanvas?.closest(".whatsapp-lottie-btn");

if (whatsappCanvas && whatsappButton) {
  try {
    const animationResponse = await fetch("/assets/whatsapp-button.lottie", { method: "HEAD" });
    if (!animationResponse.ok) throw new Error("Local Lottie asset is unavailable");

    const { DotLottie } = await import(
      "https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web/+esm"
    );

    const whatsappAnimation = new DotLottie({
      autoplay: true,
      loop: true,
      canvas: whatsappCanvas,
      src: "/assets/whatsapp-button.lottie"
    });

    whatsappAnimation.addEventListener("load", () => {
      whatsappButton.classList.add("lottie-loaded");
    });
  } catch (error) {
    whatsappButton.classList.add("lottie-fallback");
  }
}
