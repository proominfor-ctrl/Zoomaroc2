import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { initializeFirebaseAdmin } from './seed-utils';
import admin from 'firebase-admin';

dotenv.config();

const CONFIRM = process.env.SEED_CONFIRM === 'yes' || process.argv.includes('--yes');
if (!CONFIRM) {
  console.error('\n⚠️  Seeder blocked: set SEED_CONFIRM=yes or pass --yes to run this script.');
  console.error('Example: SEED_CONFIRM=yes npx tsx scripts/seed.ts --yes\n');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env variables. Check .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Firebase Admin using the utility
const { db } = initializeFirebaseAdmin('__seed_main__');

function rand<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

const FIRST = ['محمد','أحمد','ياسين','علي','سعيد','سلمان','فاطمة','مريم','هند','سمية','آمنة','خديجة','نور','ليلى'];
const LAST = ['الحداد','النعيمي','الحمراوي','الزاوي','بنحمو','الرزقي','المغربي','الفاسي','الطاهري','البوستاتي'];
const PET_NAMES = ['لولو','لولو','بيبسي','مشمش','سنبلة','نونو','زيزي','رورو','بسبوسة','برقوق','لولي','زينة'];
const CITIES = ['Casablanca','Rabat','Marrakech','Fes','Tangier','Agadir','Essaouira','Nador'];
const ANIMAL_TYPES = ['pet','livestock','accessory','adoption'];
const PET_TYPES = ['dog','cat','bird','fish','sheep','other'];
const BREEDS = ['Mixed','Local','Other','Labrador','German Shepherd','Beagle'];
const COUPLING_DESCRIPTIONS = [
  'هذا الحيوان يتمتع بصحة جيدة ويبحث عن شريك مناسب لعملية التزاوج.',
  'يرجى التواصل إذا كان الحيوان متاحاً للتقاويم ويمتلك أوراق صحية حديثة.',
  'متاح للتزاوج في بيئة آمنة، ويحب التفاعل مع الحيوانات الأخرى.',
  'يبحث عن شريك من نفس السلالة أو سلالة متوافقة مع خبرة مربية مع الحيوانات.',
  'متوفر للتزاوج الآن في المدينة، والوضع الصحي ممتاز.'
];

async function uploadImage(filePath: string) {
  const fileName = `${Date.now()}-${path.basename(filePath)}`;
  const buf = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage.from('images').upload(fileName, buf, { upsert: false });
  if (error) throw error;
  const { data: pub } = supabase.storage.from('images').getPublicUrl(fileName);
  return pub.publicUrl;
}

async function main() {
  console.log('Starting seeder: creating 50 users, 50 listings, 50 coupling offers');

  const uploadFiles = fs.existsSync(path.join(process.cwd(), 'public', 'uploads'))
    ? fs.readdirSync(path.join(process.cwd(), 'public', 'uploads')).filter(f => f.toLowerCase().match(/\.(jpg|jpeg|png)$/))
    : [];

  const imagePaths = uploadFiles.map(f => path.join(process.cwd(), 'public', 'uploads', f));

  const users: { uid: string; displayName: string; photoURL?: string }[] = [];

  for (let i = 0; i < 50; i++) {
    const displayName = `${rand(FIRST)} ${rand(LAST)}`;
    const email = `seed+${i}@${process.env.SEED_EMAIL_DOMAIN || 'example.com'}`;
    const password = `Passw0rd!${Math.floor(Math.random()*9000+1000)}`;

    try {
      const userRecord = await admin.auth().createUser({ email, password, displayName });
      const photoURL = imagePaths.length ? await uploadImage(rand(imagePaths)) : null;

      await db.collection('users').doc(userRecord.uid).set({
        displayName,
        photoURL,
        email,
        role: 'user',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      users.push({ uid: userRecord.uid, displayName, photoURL: photoURL || undefined });
      console.log(`Created user ${i+1}/50: ${displayName} (${userRecord.uid})`);
    } catch (error: any) {
      console.error('Failed to create user', email, error?.message || error);
    }

    await sleep(200);
  }

  // Create Listings
  for (let i = 0; i < 50; i++) {
    const author = rand(users);
    const animalType = rand(ANIMAL_TYPES);
    const petType = animalType === 'pet' ? rand(PET_TYPES) : '';
    const breed = rand(BREEDS);
    const title = `${animalType === 'pet' ? 'حيوان' : 'معروض'} ${breed} - ${Math.floor(Math.random()*1000)}`;
    const desc = `عرض من قبل ${author.displayName}. ${breed} في حالة جيدة، اتصل للحصول على مزيد من التفاصيل.`;
    const images = imagePaths.length ? [await uploadImage(rand(imagePaths))] : [];

    const doc: any = {
      title,
      description: desc,
      price: Math.floor(Math.random() * 3000),
      animalType: animalType === 'pet' ? 'pet' : animalType,
      petType: petType || null,
      breed,
      age: `${Math.floor(Math.random()*5)+1} months`,
      location: rand(CITIES),
      contactPreference: 'chat',
      images,
      authorId: author.uid,
      authorName: author.displayName,
      authorPhotoURL: author.photoURL || null,
      language: 'ar',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    };

    try {
      await db.collection('listings').add(doc);
      console.log(`Created listing ${i+1}/50`);
    } catch (error) {
      console.error('Failed to create listing', error);
    }
    await sleep(100);
  }

  // Create Coupling Offers
  for (let i = 0; i < 50; i++) {
    const author = rand(users);
    const petType = rand(PET_TYPES);
    const breed = rand(BREEDS);
    const petName = rand(PET_NAMES);
    const description = rand(COUPLING_DESCRIPTIONS);
    const images = imagePaths.length ? [await uploadImage(rand(imagePaths))] : [];

    const offer = {
      petName,
      petType,
      breed,
      description,
      targetBreed: 'Any',
      city: rand(CITIES),
      gender: Math.random() > 0.5 ? 'male' : 'female',
      images,
      authorId: author.uid,
      authorName: author.displayName,
      authorPhotoURL: author.photoURL || null,
      language: 'ar',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    };

    try {
      await db.collection('coupling_offers').add(offer);
      console.log(`Created coupling offer ${i+1}/50`);
    } catch (error) {
      console.error('Failed to create coupling offer', error);
    }
    await sleep(100);
  }

  console.log('Seeder finished.');
}

main().catch(err => {
  console.error('Seeder error:', err);
  process.exit(1);
});
