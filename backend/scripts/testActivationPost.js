const http = require('http');

const post = (path, data) => new Promise((resolve, reject) => {
  const body = JSON.stringify(data);
  const options = {
    hostname: 'localhost',
    port: 3001,
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = http.request(options, (res) => {
    let chunks = '';
    res.on('data', c => chunks += c);
    res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
  });

  req.on('error', reject);
  req.write(body);
  req.end();
});

(async () => {
  try {
    const r = await post('/api/activation/check', { code: 'APEXCODE442' });
    console.log('Status:', r.status);
    console.log('Body:', r.body);
  } catch (err) {
    console.error('Request failed:', err);
  }
})();
