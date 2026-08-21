// Instant notification server (Vercel, free). App lead add hote hi ise call karta hai.
// Env: FIREBASE_SA = Firebase service-account JSON.
const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)) });
}
const db = admin.firestore();
const APP_URL = 'https://akshardhamassociate.github.io/plot-crm/';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    // sirf logged-in app user hi trigger kar sakta hai
    const authH = req.headers.authorization || '';
    const idToken = authH.startsWith('Bearer ') ? authH.slice(7) : '';
    if (!idToken) return res.status(401).json({ error: 'no token' });
    await admin.auth().verifyIdToken(idToken);

    const { execs = [], leadName = 'Lead' } = req.body || {};
    const keys = [...new Set(execs.map(e => (e || '').trim().toLowerCase()).filter(Boolean))];
    if (!keys.length) return res.json({ sent: 0 });

    const tokensSnap = await db.collection('tokens').get();
    const tokens = [];
    tokensSnap.forEach(d => { const t = d.data(); if (t.token && keys.includes((t.nameKey || '').trim())) tokens.push(t.token); });
    if (!tokens.length) return res.json({ sent: 0 });

    const r = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: '🆕 Nayi lead aapko assign hui', body: leadName },
      android: { priority: 'high', notification: { notificationCount: 1 } },
      webpush: { fcmOptions: { link: APP_URL } }
    });
    return res.json({ sent: r.successCount });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};
