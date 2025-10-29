require('dotenv').config()

const express = require('express')
const axios = require('axios')
const https = require('https')
const fs = require('fs')
const formData = require('form-data')


const JWT_TOKEN=process.env.JWT_TOKEN
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_TOKEN
const WEBHOOK_VERIFY_TOKEN = 'my-verify-token'



const app = express()
app.use(express.json())


console.log({
  PHONE_NUMBER_ID:process.env.PHONE_NUMBER_ID,
  JWT_TOKEN:process.env.JWT_TOKEN,
  WHATSAPP_ACCESS_TOKEN : process.env.WHATSAPP_TOKEN,
  RECIEVER_CONTACT_NUMBER: process.env.RECIEVER_CONTACT_NUMBER
})


app.get('/', (req, res) => {
  res.send('Whatsapp with Node.js and Webhooks')
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

      else if (messages.text.body.toLowerCase() === 'list') {
        sendList(messages.from)
      }

      else if (messages.text.body.toLowerCase() === 'buttons') {
        sendReplyButtons(messages.from)
      }
      else{
        
        httprequest2(messages.text.body.toLowerCase()).then((result) => {
          console.log("Result from httprequest2:", result);
  
          if (result.uploaded_img_id == null){
              sendTextMessage( formatForWhatsApp(result.body))
          }else{
              sendWhatsapp_message_with_media_caption(result.uploaded_img_id, formatForWhatsApp(result.body))
          }
        }).catch((error) => {
          console.error("Error in httprequest2:", error);
        });

      }




    }

    if (messages.type === 'interactive') {
      if (messages.interactive.type === 'list_reply') {
        sendMessage(messages.from, `You selected the option with ID ${messages.interactive.list_reply.id} - Title ${messages.interactive.list_reply.title}`)
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
          text: 'Message Header'
        },
        body: {
          text: 'This is a interactive list message'
        },
        footer: {
          text: 'This is the message footer'
        },
        action: {
          button: 'Tap for the options',
          sections: [
            {
              title: 'First Section',
              rows: [
                {
                  id: 'first_option',
                  title: 'First option',
                  description: 'This is the description of the first option'
                },
                {
                  id: 'second_option',
                  title: 'Second option',
                  description: 'This is the description of the second option'
                }
              ]
            },
            {
              title: 'Second Section',
              rows: [
                {
                  id: 'third_option',
                  title: 'Third option'
                }
              ]
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


function generate_fileName(){

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

async function upload_image_(path){
    const data = new formData()
    data.append('messaging_product', 'whatsapp')
    data.append('file', fs.createReadStream(process.cwd()+`/${path}`), {contentType:'image/png'})
    data.append('type', 'image/png')
    const response = await axios({
        url: `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/media` ,
        method:'post',
        headers:{
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
        },
        data: data
    })
    console.log(response.data)
    return response.data.id
}

async function sendTextMessage(text_msg) {

    const response = await axios({
        url: `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages` ,
        method:'post',
        headers:{
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type':'application/json'
        },
        data: JSON.stringify({
            messaging_product:'whatsapp',
            to:process.env.RECIEVER_CONTACT_NUMBER,
            type:'text',
            text:{
                body:text_msg
            }
        })

    })
    console.log(response.data)
    // return true
}

async function sendWhatsapp_message_with_media_caption(image_id, caption) {

    const response = await axios({
        url: `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages` ,
        method:'post',
        headers:{
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type':'application/json'
        },

        data: JSON.stringify({
            messaging_product:'whatsapp',
            to:process.env.RECIEVER_CONTACT_NUMBER,
            type:'image',
            image:{
                id:image_id,
                caption:caption
            }
        })

    })
    console.log(response.data);
    // return true
    
}


async function httprequest2(reservationObj) {

    const newData = JSON.stringify({
            text: reservationObj,
            app: {
                "id": "c3470397-2799-4b92-a5b4-1eb9373f4c6b",
                "name": "PNB Metlife Demo(1)",
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
        if (myobj.conversationalResponse.responses.length > 0) {
            if ("narrative" in myobj.conversationalResponse.responses[0]) {
                const temp = myobj.conversationalResponse.responses[0].narrative.text.replace(/[^a-zA-Z0-9]/s, ' ').replace(/\\|\//g, '').replace(/_/g, ' ');
                body.push(temp.trim());
            } else if ("imageUrl" in myobj.conversationalResponse.responses[0]) {
                const img = myobj.conversationalResponse.responses[0].imageUrl;

                const downloadedImagePath = await downloadImage(`/jwt${img}`)
                uploaded_img_id = await upload_image_(downloadedImagePath)

                console.log("img",`https://analytics.exponentia.ai/jwt${img}`)
                if ("narrative" in myobj.conversationalResponse.responses[1]) {
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
        
        return {uploaded_img_id, body};

    } catch (e) {
        console.log("catch 2", e.message);
        throw e; // Rethrow the error for higher-level handling
    }
}




app.listen(3000, () => {
  console.log('Server started on port 3000')
})
