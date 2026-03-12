const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

function initWhatsAppWeb(handleIncoming) {
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    console.log('\n📱 Scan this QR code with WhatsApp:\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => console.log('✅ WhatsApp authenticated!'));
  client.on('ready', () => console.log('✅ WhatsApp ready! Bot is live.\n'));
  client.on('disconnected', (reason) => console.log('❌ Disconnected:', reason));

  const sendTo = async (number, text) => {
    try {
      await client.sendMessage(number + '@c.us', text);
    } catch (err) {
      console.error('sendTo error:', err.message);
    }
  };

  client.on('message', async (msg) => {
    if (msg.from === 'status@broadcast') return;
    if (msg.isGroupMsg && process.env.ALLOW_GROUPS !== 'true') return;

    const from = msg.from;
    const body = msg.body?.trim() || '';

    let imageBase64 = null;
    let imageMime = null;

    // Check if message has an image
    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        if (media && media.mimetype && media.mimetype.startsWith('image/')) {
          imageBase64 = media.data; // already base64
          imageMime = media.mimetype;
          console.log('🖼️ Image received from [' + from + '] type: ' + imageMime);
        }
      } catch (err) {
        console.error('Media download error:', err.message);
      }
    }

    // Skip if no text and no image
    if (!body && !imageBase64) return;

    await handleIncoming({
      from: from.replace('@c.us', ''),
      body,
      sendReply: async (text) => { await msg.reply(text); },
      sendTo,
      imageBase64,
      imageMime,
    });
  });

  client.initialize();
}

module.exports = { initWhatsAppWeb };
