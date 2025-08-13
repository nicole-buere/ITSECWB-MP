document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Login response data:', data);
            console.log('User role:', data.user?.role);
            
            // Redirect based on user role
            if (data.user && data.user.role === 'admin') {
                console.log('Redirecting admin to dashboard');
                window.location.href = '/admin/dashboard';
            } else {
                console.log('Redirecting non-admin to home');
                window.location.href = '/home';
            }
            // window.location.href = `/profile?username=${username}`;
        } else {
            const errData = await response.json();
            alert(errData.message);
        }
 

    });
});