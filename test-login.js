const fetch = require('node-fetch');

async function testLogin() {
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'superadmin',
        password: 'Infinity@97'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Login failed:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('Login successful:', result);
  } catch (error) {
    console.error('Login test failed:', error.message);
  }
}

testLogin();
