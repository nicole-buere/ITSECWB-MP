// Checks if password meets requirements & if 'Password' and 'Confirm Password' fields match
function validatePassword(password, confirmPassword) {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[@#$%^&+=]/.test(password);

    if (password.length < 8) {
        alert("Password must be at least 8 characters!");
        return false;
    }
    if (!hasUpper) {
        alert("Password must have at least 1 uppercase character!");
        return false;
    }
    if (!hasLower) {
        alert("Password must have at least 1 lowercase character!");
        return false;
    }
    if (!hasNumber) {
        alert("Password must have at least 1 numerical character!");
        return false;
    }
    if (!hasSpecial) {
        alert("Password must have at least 1 special character!");
        return false;
    }
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return false;
    }
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    const register = document.getElementById('register-form');

    register.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Submit the form data
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confPass = document.getElementById('confPassword').value; 
        const role = document.getElementById('role').value;

        // Calls password input validation function
        if (!validatePassword(password, confPass)) return;

        // Check if email is valid it should be @dlsu.edu.ph ending ONLY
        if (email.slice(-12) !== "@dlsu.edu.ph") {
            alert("Email is not a valid DLSU email address!");
            return;
        }

        // Console log each 
        console.log(name, email, username, password, confPass, role);

        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(
                {
                    name: name,
                    email: email,
                    username: username,
                    password: password,
                    confirmPassword: confPass,
                    role: role
                }
            )
        })
        .then(response => {
            if (response.ok) {
                alert("Registration successful!");
                window.location.href = '/';
            } else {
                alert("Registration failed. Please try again.");
            }
        })
        .catch(
            console.log("Error occurred while registering.")
        )
    });
});