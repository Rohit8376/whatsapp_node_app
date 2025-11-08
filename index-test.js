    
const axios = require('axios')
const https = require('https')
const fs = require('fs')

const JWT_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJxc2FkbWluIiwidXNlckRpcmVjdG9yeSI6InFsaWtzZW5zZXZtMyIsImlhdCI6MTc2MTU2MTk2MCwiZXhwIjoyMTIxNTYxOTYwfQ.OfnWobOJdMOm8mUnDCny-WVHmbOR7-NGw60UbthtOIJArmZAYgOZQ3R8zNxQM73UQ644-50k5zbaVdkqKg2ig87YkZ-NC9QxHPREoOaRDYOkHQD2MBHi_ZZ882p6SqeRrhZOnQl_1H5gkrtKAT2iy7Wwy8ZPKpWPoykIkZzcGAJrNGYTKbModwD-EtKWFsKjfQ00kFVVtSDTISZPHoB6wf7hPKc34rHvnm7GD7cCswq8VW6hQ2fdaXrh-bDYopYzNs0dEvTorh4uWTF1iuEa71wIEwAFmLvt2ihmpVVVAjPejUkqOvQBrr-ISKM9zpdCEWtjLsEEGGRxA1MDWpg1JA"



const pemDirectory = './pem/'

const httpsAgent = new https.Agent({
  ca: fs.readFileSync(`${pemDirectory}root.pem`),
  key: fs.readFileSync(`${pemDirectory}client_key.pem`),
  cert: fs.readFileSync(`${pemDirectory}client.pem`),
  rejectUnauthorized: false,
  agent: false,
});


async function execute() {
        try {
            const response = await axios.get( `https://analytics.exponentia.ai:4242/qrs/jwt/app/full/?xrfkey=0123456789ABCDEF`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${JWT_TOKEN}`,
                    "X-Qlik-Xrfkey": '0123456789ABCDEF',
                },
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                }
            );

            console.log(response.data);
            
        } catch (error) {
            console.log(`Failed to fetch Qlik apps: ${error.message}`);
        }

}

const xrfkey = '0123456789ABCDEF'



getQlikApps()