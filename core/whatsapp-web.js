const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

function initWhatsAppWeb(handleIncoming) {
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--no-proxy-server',
      ],
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
      const id = number.includes('@') ? number : number + '@c.us';
      await client.sendMessage(id, text);
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

    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        if (media && media.mimetype && media.mimetype.startsWith('image/')) {
          imageBase64 = media.data;
          imageMime = media.mimetype;
          console.log('🖼️ Image received from [' + from + ']');
        }
      } catch (err) {
        console.error('Media download error:', err.message);
      }
    }

    if (!body && !imageBase64) return;

    await handleIncoming({
      from: from.replace('@c.us', ''),
      body,
      sendReply: async (text) => {
        await msg.reply(text);
      },
      sendImageReply: async (imagePath, caption) => {
        try {
          const media = MessageMedia.fromFilePath(imagePath);
          await msg.reply(media, null, { caption: caption || '' });
        } catch (err) {
          console.error('Image send error:', err.message);
        }
      },
      sendDocReply: async (docPath, filename, caption) => {
        try {
          const media = MessageMedia.fromFilePath(docPath);
          media.filename = filename || 'document.pdf';
          await msg.reply(media, null, { caption: caption || '', sendMediaAsDocument: true });
        } catch (err) {
          console.error('Doc send error:', err.message);
          await msg.reply('PDF generated but failed to send. Please try again.');
        }
      },
      sendTo,
      imageBase64,
      imageMime,
    });
  });

  client.initialize();
}

module.exports = { initWhatsAppWeb };
