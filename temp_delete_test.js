const http = require('http');  
const options = { host: '127.0.0.1', port: 3000, path: '/api/admin/users/testUserId', method: 'DELETE' };  
const req = http.request(options, res = 
  console.log('status', res.statusCode);  
  console.log('headers', JSON.stringify(res.headers));  
  let body = '';  
  res.on('data', d = += d);  
  res.on('end', () = 
    console.log('body', JSON.stringify(body));  
  });  
});  
req.on('error', e =, e));  
req.end();  
