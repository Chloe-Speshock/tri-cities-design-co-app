// Tri Cities Design Co. - Simple JavaScript Foundation

// Wait for the page to load
document.addEventListener("DOMContentLoaded", function () {
  console.log("Tri Cities Design Co. website loaded!");

  // Initialize basic functionality
  setupNavigation();
  setupPortfolioGallery();
  setupContactForm();
});

// Simple navigation setup
function setupNavigation() {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      navMenu.classList.toggle("active");
    });
  }
}

// Portfolio gallery functionality
function setupPortfolioGallery() {
  const portfolioItems = document.querySelectorAll(".portfolio-item");

  // Add click functionality to portfolio items
  portfolioItems.forEach((item) => {
    item.addEventListener("click", function () {
      // Simple lightbox effect
      showPortfolioItem(this);
    });
  });
}

// Simple portfolio display
function showPortfolioItem(item) {
  const title =
    item.querySelector(".portfolio-title")?.textContent || "Portfolio Item";
  const description = item.querySelector("p")?.textContent || "";

  // Create a simple modal
  const modal = document.createElement("div");
  modal.className = "portfolio-modal";
  modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3>${title}</h3>
            <p>${description}</p>
        </div>
    `;

  document.body.appendChild(modal);

  // Close modal functionality
  const closeBtn = modal.querySelector(".close-modal");
  closeBtn.addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  // Close on outside click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Contact form handling
function setupContactForm() {
  const contactForm = document.querySelector("#contact-form");

  if (contactForm) {
    contactForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const submitBtn = this.querySelector(".submit-btn");
      const originalBtnText = submitBtn.textContent;

      // Disable submit button and show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      // Remove any existing error/success messages
      const existingMessage = this.querySelector(".form-message");
      if (existingMessage) {
        existingMessage.remove();
      }

      try {
        // Get all form data
        const formData = {
          name: this.querySelector("#name").value.trim(),
          email: this.querySelector("#email").value.trim(),
          phone: this.querySelector("#phone").value.trim(),
          "project-type": this.querySelector("#project-type").value,
          budget: this.querySelector("#budget").value,
          timeline: this.querySelector("#timeline").value,
          message: this.querySelector("#message").value.trim(),
        };

        // Send form data to backend
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        // Create message element
        const messageDiv = document.createElement("div");
        messageDiv.className = "form-message";

        if (response.ok && data.success) {
          // Success message
          messageDiv.className += " form-message-success";
          messageDiv.textContent =
            data.message ||
            "Thank you for your message! We'll get back to you soon.";

          // Reset form
          this.reset();

          // Scroll to message
          messageDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
          // Error message
          messageDiv.className += " form-message-error";
          messageDiv.textContent =
            data.error ||
            "Sorry, there was an error sending your message. Please try again.";
        }

        // Insert message before submit button
        submitBtn.parentNode.insertBefore(messageDiv, submitBtn);
      } catch (error) {
        console.error("Error submitting form:", error);

        // Show error message
        const messageDiv = document.createElement("div");
        messageDiv.className = "form-message form-message-error";
        messageDiv.textContent =
          "Sorry, there was an error sending your message. Please try again later or contact us directly.";

        const submitBtn = this.querySelector(".submit-btn");
        submitBtn.parentNode.insertBefore(messageDiv, submitBtn);
      } finally {
        // Re-enable submit button
        const submitBtn = this.querySelector(".submit-btn");
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
}

// Smooth scrolling for navigation links
function setupSmoothScrolling() {
  const navLinks = document.querySelectorAll('a[href^="#"]');

  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("href");
      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: "smooth",
        });
      }
    });
  });
}
