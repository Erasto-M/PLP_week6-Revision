document.addEventListener('DOMContentLoaded', async function(){
    const form = document.getElementById('our-form');
    form.addEventListener('submit', async (event)=>{
        event.preventDefault();

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const authmessage = document.getElementById('auth-msg');

        try{
            const response = await fetch('http://localhost:5000/endpoints/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type' : 'application/json',
                },
                body: JSON.stringify({username, email, password}),
            });
            const data = await response.json();
            if(response.ok){
                authmessage.textContent= data.message;
            } else{
                authmessage.textContent = data.message;
            }
        }catch(e){
            authmessage.textContent = e;
        }
    });
});