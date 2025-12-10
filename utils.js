

const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        font-size: 0.95rem;
        z-index: 10000;
        backdrop-filter: blur(10px);
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s ease;
    }

    .notification.show {
        opacity: 1;
        transform: translateX(0);
    }

    .notification-success {
        background: rgba(0, 255, 136, 0.2);
        border: 2px solid #00ff88;
    }

    .notification-error {
        background: rgba(255, 68, 68, 0.2);
        border: 2px solid #ff4444;
    }

    .notification-info {
        background: rgba(102, 126, 234, 0.2);
        border: 2px solid #667eea;
    }
`;
document.head.appendChild(style);
