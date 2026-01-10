const fs = require('fs');
const path = require('path');

const content = `NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=isp_billing_db
DB_USER=ispuser
DB_PASSWORD=realpassword
DB_DIALECT=mysql

JWT_SECRET=super_secure_jwt_key_1234567890
JWT_EXPIRES_IN=24h
`;

fs.writeFileSync(path.join(__dirname, '../.env'), content);
console.log('.env created');
