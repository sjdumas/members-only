document.addEventListener("DOMContentLoaded", () => {
	const toggle = document.querySelector(".nav-toggle");
	const menu = document.querySelector(".nav-menu");

	if (toggle && menu) {
		toggle.addEventListener("click", () => {
			menu.classList.toggle("open");
		});
	}

	document.querySelectorAll(".faq-question").forEach(button => {
		button.addEventListener("click", () => {
			const answer = button.nextElementSibling;
			answer.classList.toggle("open");
		});
	});

	setTimeout(() => {
		document.querySelectorAll(".flash-auto-hide").forEach(msg => {
			msg.style.transition = "opacity 0.5s ease-out";
			msg.style.opacity = "0";
			setTimeout(() => msg.remove(), 500);
		});
	}, 6000);
});
