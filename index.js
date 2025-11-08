require('dotenv').config()

const express = require('express')
const axios = require('axios')
const https = require('https')
const fs = require('fs')
const formData = require('form-data')
const path = require('path')
var cookieParser = require('cookie-parser');
var bodyparser = require('body-parser')

const JWT_TOKEN = process.env.JWT_TOKEN
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_TOKEN
const WEBHOOK_VERIFY_TOKEN = 'my-verify-token'
const pemDirectory = './pem/'



const app = express()
app.use(express.json())
app.use(cookieParser());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')))

app.use(bodyparser.urlencoded({
  extended: true
}));


let users = [
  {
    mobile_number: 918859628376,
    user_id: 'QSADMIN',
    selected_apps: null
  },
  {
    mobile_number: 918859628353,
    user_id: 'QSADMIN',
    selected_apps: null
  },

  {
    mobile_number: 1234567890,
    user_id: 'QSADMIN',
    selected_apps: null
  }
]



const httpsAgent_new = new https.Agent({
  ca: fs.readFileSync(`${pemDirectory}root.pem`),
  key: fs.readFileSync(`${pemDirectory}client_key.pem`),
  cert: fs.readFileSync(`${pemDirectory}client.pem`),
  rejectUnauthorized: false,
  agent: false,
});



const apps_list = ['992190e8-b8ea-41e5-974e-7da7dc748927', 'c3470397-2799-4b92-a5b4-1eb9373f4c6b', 'd6c86305-6e19-44bb-8e97-b6211757300b', 'de900653-d0c6-4dff-84ee-f62ba49469d5']


const getQlikApps = async (to) => {

  logged_in_user = users.find(user=>user.mobile_number==to)
  console.log('logged_in_user', logged_in_user)

  try {  
    const response = await axios.get(
      `https://analytics.exponentia.ai:4242/qrs/app/full?xrfkey=0123456789ABCDEF`,
        {
          headers: {
            "X-Qlik-Xrfkey": '0123456789ABCDEF',
            "Content-Type": "application/json",
            "X-Qlik-User": `UserDirectory=qliksensevm3;UserId=qsadmin`,
          },
          httpsAgent: httpsAgent_new,
        }
    );
    
    let data = response.data.map(app=>{
        return {id:app.id, name: app.name}
    })

    data = data.filter(app=>apps_list.includes(app.id))

    return data

  } catch (error) {
    console.log(`Failed to fetch Qlik apps: ${error.message}`);
    
  }
};



app.get('/', function (req, res) {
  if (req.cookies.isloggedin == 'false') {
    res.redirect('/login')
    return
  }
  console.log("cookies", req.cookies.userId)
  res.render('index', { userId: req.cookies.userId, users: users })
});



app.get('/qrs/apps', async function (req, res) {
    const data  = await getQlikApps()
    return res.send(data)
});




app.get('/users/update/:userid', function (req, res) {
  if (req.cookies.isloggedin == 'false') {
    res.redirect('/login')
    return
  }
  const user = users.find(user => user.mobile_number == req.params.userid)
  if (!user) {
    return res.redirect('/')
  }
  res.render('edit_user', { userId: req.cookies.userId, user: user })
});




app.post('/users/update/:userid', function (req, res) {
  if (req.cookies.isloggedin == 'false') {
    res.redirect('/login')
    return
  }

  if (req.body.mobile_number && req.body.user_id) {
    users = users.map(user => user.mobile_number == req.body.mobile_number ? { ...user, user_id: req.body.user_id } : user);
  }
  return res.redirect('/')
});




app.post('/user/add', function (req, res) {
  if (req.cookies.isloggedin == 'false') {
    res.redirect('/login')
    return
  }
  const { mobile_number, user_id } = req.body
  const user_exist = users.find(user => user.mobile_number == mobile_number)
  if (user_exist) {
    return res.render('add_user', { error: 'mobile_number already axist' })
  }
  users.push({ mobile_number: mobile_number, user_id: user_id, selected_apps: null });
  return res.redirect('/')
});





app.get('/user/add', function (req, res) {

  if (req.cookies.isloggedin == 'false') {
    res.redirect('/login')
    return
  }
  return res.render('add_user')
});



app.get('/users/delete/:userid', function (req, res) {
  if (req.cookies.isloggedin == 'false') {
    res.redirect('/login')
    return
  }
  users = users.filter(user => user.mobile_number != req.params.userid)
  return res.redirect('/')
});





app.get('/login', (req, res) => {
  res.render('login', { logout: false })
})


app.post('/login', (req, res) => {

  if (req.body.userId != 'admin') {
    return res.redirect('/login')
  }

  res.cookie(`isloggedin`, true);
  res.cookie(`userId`, req.body.userId);
  res.redirect('/')
})

app.get('/logout', async (req, res) => {
  res.clearCookie('isloggedin')
  res.clearCookie('userId')
  res.cookie(`isloggedin`, false);
  res.cookie(`userId`, "");
  console.log(req.cookies.userId)
  console.log(req.cookies.isloggedin)
  res.render('login', { logout: true })
})










 





app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode']
  const challenge = req.query['hub.challenge']
  const token = req.query['hub.verify_token']

  if (mode && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge)
  } else {
    res.sendStatus(403)
  }
})

app.post('/webhook', async (req, res) => {
  const { entry } = req.body

  if (!entry || entry.length === 0) {
    return res.status(400).send('Invalid Request')
  }

  const changes = entry[0].changes

  if (!changes || changes.length === 0) {
    return res.status(400).send('Invalid Request')
  }

  const statuses = changes[0].value.statuses ? changes[0].value.statuses[0] : null
  const messages = changes[0].value.messages ? changes[0].value.messages[0] : null

  if (statuses) {
    // Handle message status
    console.log(`
      MESSAGE STATUS UPDATE:
      ID: ${statuses.id},
      STATUS: ${statuses.status}
    `)
  }


  if (messages) {


    if (messages.type === 'text') {
      if (messages.text.body.toLowerCase() === 'hello' || messages.text.body.toLowerCase() === 'hi') {
        replyMessage(messages.from, 'Hello. How can i help you?', messages.id)
      }

      else if (messages.text.body.toLowerCase() === 'apps') {
        sendList(messages.from)
      }

      else if (messages.text.body.toLowerCase() === 'buttons') {
        sendReplyButtons(messages.from)
      }
      else {

        httprequest2(messages.text.body.toLowerCase(), messages.from).then((result) => {
          console.log("Result from httprequest2:", result);

          if (result.uploaded_img_id == null) {
            sendTextMessage(formatForWhatsApp(result.body), result.to)
          } else {
            sendWhatsapp_message_with_media_caption(result.uploaded_img_id, formatForWhatsApp(result.body), result.to)
          }
        }).catch((error) => {
          console.error("Error in httprequest2:", error);
        });

      }




    }

    if (messages.type === 'interactive') {
      if (messages.interactive.type === 'list_reply') {


        if_user = users.find(user=>user.mobile_number == messages.from)
        
        console.log(if_user);
        
        
        if(!if_user){
          users.push({
            mobile_number: messages.from,
            user_id: 'QSADMIN',
            selected_apps: null
          })
        }
        
        users = users.map(user => user.mobile_number ==  messages.from ? { ...user, selected_apps: messages.interactive.list_reply.id } : user);
        console.log(users)
        sendMessage(messages.from, `You have selected ${messages.interactive.list_reply.title} try asking Questions` )
      }

      if (messages.interactive.type === 'button_reply') {
        sendMessage(messages.from, `You selected the button with ID ${messages.interactive.button_reply.id} - Title ${messages.interactive.button_reply.title}`)
      }
    }

    console.log(JSON.stringify(messages, null, 2))
  }

  res.status(200).send('Webhook processed')
})



async function sendMessage(to, body) {
  await axios({
    url: `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
    method: 'post',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body
      }
    })
  })
}

async function replyMessage(to, body, messageId) {
  await axios({
    url: `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
    method: 'post',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body
      },
      context: {
        message_id: messageId
      }
    })
  })
}


async function sendList(to) {

  const data  = await getQlikApps(to)
  
  let apps_list_row = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    obj =  {id: row.id, title: row.name, description: ''}
    apps_list_row.push(obj)
  }
  
  
  await axios({
    url: `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
    method: 'post',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: 'Available Apps'
        },
        body: {
          text: 'select app for insights'
        },
        footer: {
          text: ''
        },
        action: {
          button: 'Tap for the options',
          sections: [
            {
              title: 'Apps',
              rows: apps_list_row
            }
          ]
        }
      }
    })
  })
}


async function sendReplyButtons(to) {
  await axios({
    url: `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
    method: 'post',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'text',
          text: 'Message Header'
        },
        body: {
          text: 'This is a interactive reply buttons message'
        },
        footer: {
          text: 'This is the message footer'
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'first_button',
                title: 'First Button'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'second_button',
                title: 'Second Button'
              }
            }
          ]
        }
      }
    })
  })
}





function formatForWhatsApp(messages) {

  return messages
    .join(" ")                 // join array into one string
    .split("\n")               // split on newline
    .map(line => line.trim())  // clean spaces
    .filter(line => line)      // remove empty lines
    .map(line => `- ${line}`)  // add bullet
    .join("\n");               // join back with newlines
}


function generate_fileName() {

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const randomId = Math.floor(Math.random() * 10000);
  const dynamicFileName = `chart-${timestamp}-${randomId}.png`;

  return dynamicFileName

}



async function downloadImage(imgPath) {
  try {
    const url = `https://analytics.exponentia.ai${imgPath}`;
    console.log(url)
    const response = await axios({
      url: url,
      method: "GET",
      responseType: "stream",
      headers: {
        Authorization: `Bearer ${JWT_TOKEN}`
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    const fileName = `uploads/downloaded-${generate_fileName()}`;
    const writer = fs.createWriteStream(fileName);

    response.data.pipe(writer);

    return new Promise(async (resolve, reject) => {
      writer.on("finish", () => {
        console.log("Image saved as:", fileName);

        resolve(fileName);
      });
      writer.on("error", reject);
    });
  } catch (err) {
    console.error("Error downloading image:", err.message);
  }
}

async function upload_image_(path) {
  const data = new formData()
  data.append('messaging_product', 'whatsapp')
  data.append('file', fs.createReadStream(process.cwd() + `/${path}`), { contentType: 'image/png' })
  data.append('type', 'image/png')
  const response = await axios({
    url: `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/media`,
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
    },
    data: data
  })
  console.log(response.data)
  return response.data.id
}

async function sendTextMessage(text_msg, to) {

  const response = await axios({
    url: `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: {
        body: text_msg
      }
    })

  })
  console.log(response.data)
  // return true
}

async function sendWhatsapp_message_with_media_caption(image_id, caption, to) {

  const response = await axios({
    url: `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
    method: 'post',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },

    data: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'image',
      image: {
        id: image_id,
        caption: caption
      }
    })

  })
  console.log(response.data);
  // return true

}


async function httprequest2(reservationObj, to) {

  const newData = JSON.stringify({
    text: reservationObj,
    app: {
      "id": "d6c86305-6e19-44bb-8e97-b6211757300b",
      "name": "PNB Metlife Demo new",
    },
  });

  try {
    const options = {
      url: "https://analytics.exponentia.ai:443/jwt/api/v1/nl/query",
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      data: newData,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    };

    const res = await axios(options);

    let body = [];
    const myobj = res.data;

    let uploaded_img_id = null
    if (myobj.conversationalResponse.responses.length > 0 && myobj.conversationalResponse.responses[0]) {


      if ("narrative" in myobj.conversationalResponse.responses[0]) {
        const temp = myobj.conversationalResponse.responses[0].narrative.text.replace(/[^a-zA-Z0-9]/s, ' ').replace(/\\|\//g, '').replace(/_/g, ' ');
        body.push(temp.trim());
      } else if ("imageUrl" in myobj.conversationalResponse.responses[0]) {
        const img = myobj.conversationalResponse.responses[0].imageUrl;

        const downloadedImagePath = await downloadImage(`/jwt${img}`)
        uploaded_img_id = await upload_image_(downloadedImagePath)

        console.log("img", `https://analytics.exponentia.ai/jwt${img}`)

        if (myobj.conversationalResponse.responses[1] && "narrative" in myobj.conversationalResponse.responses[1]) {
          const text_r = myobj.conversationalResponse.responses[1].narrative.text.replace(/[^a-zA-Z0-9]/s, ' ').replace(/\\|\//g, '').replace(/_/g, ' ');
          body.push(text_r);
        } else {
          console.log("Main Response else if-else: ", img);
        }
      }
    } else {
      const temp_1 = "Enter Valid Request";
      body.push(temp_1);
    }

    return { uploaded_img_id, body, to };

  } catch (e) {
    console.log("catch 2", e.message);
    throw e; // Rethrow the error for higher-level handling
  }
}






app.listen(3000, () => {
  console.log('Server started on port 3000')
})
