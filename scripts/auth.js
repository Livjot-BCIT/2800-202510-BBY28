//Logging in
function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
}

//Signing up
async function signup() {
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const response = await fetch("/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ firstName, lastName, email, password }),
    });

    if (response.ok) {
        alert("Signup successful!");
    } else {
        const errorMessage = await response.text();
        alert(`Signup failed: ${errorMessage}`);
    }
}