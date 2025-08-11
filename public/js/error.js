// Error page interactive functionality
document.addEventListener('DOMContentLoaded', function() {
    const errorContainer = document.querySelector('.error-container');
    
    // Add a subtle animation on load
    errorContainer.style.opacity = '0';
    errorContainer.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        errorContainer.style.transition = 'all 0.6s ease';
        errorContainer.style.opacity = '1';
        errorContainer.style.transform = 'translateY(0)';
    }, 100);

    // Add click effect to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Add keyboard navigation support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Go back when Escape is pressed
            history.back();
        } else if (e.key === 'Enter' && document.activeElement.classList.contains('btn')) {
            // Trigger click on focused button when Enter is pressed
            document.activeElement.click();
        }
    });

    // Add focus management for better accessibility
    const firstButton = document.querySelector('.btn');
    if (firstButton) {
        firstButton.focus();
    }

    // Add loading state for buttons
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.href && this.href !== 'javascript:history.back()') {
                // Add loading state for navigation buttons
                const originalText = this.textContent;
                this.textContent = 'Loading...';
                this.disabled = true;
                
                // Reset after a short delay (in case of navigation)
                setTimeout(() => {
                    this.textContent = originalText;
                    this.disabled = false;
                }, 2000);
            }
        });
    });

    // Add error code animation
    const errorCode = document.querySelector('.error-code');
    if (errorCode) {
        errorCode.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        errorCode.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    }

    // Add smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Add service worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed');
            });
    });
}
