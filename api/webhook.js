const VERIFY_TOKEN = "imperium123";
const TOKEN_META = "EAAP9a9z4apYBTEGZC0RwDDZClF453M9NTMPIPcqZCVZBjFB6iNP73ZCDWunXfyKDGWVSZC75UVYtJLdX5Gjb3OD4xUeEdhBopacBG9cSRVKNwrSAzoNqLvEEda5YMZBYlSl5JRcvCJPDKJxDGO8A5AH4yCRzQdaciTLnszZCeeIkE8ZCywzHlUYDpKPasA2msqzjakdGM8LxbJqGIZA6LD9NZAipZB0Ov3ZBPZB5VTlfdOwT6ugll5hji4B0RZC0nmtY5RZAKDxLn7bfAajRYqSf1QU6GvDZBwumR7wZDZD";
const PHONE_ID = "1374654632407468";

export default async function handler(req, res) {
  // 1. VERIFICACION DE META
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('No verificado');
  }

  // 2. MENSAJES QUE LLEGAN
  if (req.method === 'POST') {
    try {
      const mensaje = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (mensaje) {
        const de = mensaje.from;
        const texto = (mensaje.text?.body || "").toLowerCase();
        let respuesta = "";

        if (texto.includes('hola') || texto.includes('info') || texto.includes('precio') || texto.includes('inscrib')) {
          respuesta = `Hola, soy el entrenador de Imperium ⚽\nBienvenido, ¿cómo te puedo ayudar?\n\n*INFORMACIÓN IMPERIUM*\n📍 Lugar: Patinódromo\n💰 Mensualidad: $40.000\n📝 Inscripción: $30.000\n\n🕐 HORARIOS - Todos de 5:00 PM a 9:00 PM\n👨 Hombres: Lunes, Miércoles y Viernes\n👩 Mujeres: Martes, Jueves y Sábado\n\n✅ Todas las categorías\n\n📄 ¿QUÉ NECESITAS PARA INSCRIBIRTE?\n1. Cédula del acudiente\n2. ADRES\n3. Tarjeta de identidad del deportista o cédula\n\nSi quieres inscribirte, escríbeme tu nombre y edad y te aparto tu cupo.`;
        } else if (texto.includes('horario')) {
          respuesta = `🕐 HORARIOS IMPERIUM - 5:00 PM a 9:00 PM\n👨 Hombres: Lunes, Miércoles y Viernes\n👩 Mujeres: Martes, Jueves y Sábado\n📍 Patinódromo`;
        } else if (texto.includes('pago') || texto.includes('deuda') || texto.includes('debo')) {
          respuesta = `Para revisar tu pago, escríbeme tu nombre completo y te confirmo cuánto debes y hasta cuándo tienes plazo. El plazo es hasta el 5 de cada mes.`;
        }

        if (respuesta) {
          await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN_META}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: de, text: { body: respuesta } })
          });
        }
      }
    } catch (e) { console.log(e); }
    return res.status(200).send('OK');
  }
}
