document.addEventListener('DOMContentLoaded', function() {
    // Animate the top users in sequence
    const topUsers = document.querySelectorAll('.topUser');
    topUsers.forEach((user, index) => {
        setTimeout(() => {
            user.style.opacity = '1';
        }, 200 * (index + 1));
    });

    // Animate points gained with a fade-in effect
    const pointsElements = document.querySelectorAll('.points-gained');
    pointsElements.forEach((element, index) => {
        setTimeout(() => {
            element.style.opacity = '1';
        }, 1000 + (index * 300));
    });
    
    // Highlight user's position with pulsing effect
    const userInfoElement = document.querySelector('.userInfo');
    if (userInfoElement) {
        setTimeout(() => {
            userInfoElement.classList.add('highlight');
        }, 1500);
    }
    
    // Staggered animation for other users
    const otherUsers = document.querySelectorAll('#otherUsers .square');
    otherUsers.forEach((user, index) => {
        user.style.opacity = '0';
        user.style.transform = 'translateY(20px)';
        setTimeout(() => {
            user.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            user.style.opacity = '1';
            user.style.transform = 'translateY(0)';
        }, 1800 + (index * 200));
    });
});