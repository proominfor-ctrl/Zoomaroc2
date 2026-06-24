import path from 'path';
import fs from 'fs';
import admin from 'firebase-admin';
import { confirmExecution, initializeSupabase, initializeFirebaseAdmin, rand, sleep, collectImageFiles, uploadImage } from './seed-utils';

confirmExecution();

const supabase = initializeSupabase();
const { db } = initializeFirebaseAdmin('__seed_listings__');

const CAT_BREEDS = ['Persian', 'Siamese', 'Maine Coon', 'Sphynx', 'Ragdoll', 'Bengal', 'British Shorthair'];
const DOG_BREEDS = ['Labrador', 'German Shepherd', 'Beagle', 'Poodle', 'Shiba Inu', 'Bulldog', 'Golden Retriever'];
const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tangier', 'Agadir', 'Essaouira', 'Nador'];
const ANIMAL_TYPES = ['pet', 'livestock', 'adoption', 'accessory'];
const AGES = ['3 months', '6 months', '1 year', '2 years', '3 years', '5 years'];
const LISTING_DESCRIPTIONS = [
  'حيوان صحي وجميل جداً، مشهور وودود مع الأطفال، يبحث عن منزل محب.',
  'عرض خاص اليوم: حيوان نظيف وصحي، يتلقى جميع اللقاحات المطلوبة.',
  'حيوان رائع وذكي، يحب اللعب والتفاعل، مناسب للعائلات.',
  'متوفر الآن: حيوان جميل بصحة ممتازة، مع جميع الأوراق الصحية.',
  'عرض محدود: حيوان هادئ وودي، متعود على البيئة المنزلية.'
];

async function main() {
  console.log('Starting listings seeder using existing user accounts.');

  const imageDir = path.join(process.cwd(), 'public', 'uploads');
  const catDir = path.join(imageDir, 'cats');
  const dogDir = path.join(imageDir, 'dogs');

  if (!fs.existsSync(catDir) || !fs.existsSync(dogDir)) {
    console.error('Missing public/uploads/cats or public/uploads/dogs directories. Add the image folders there first.');
    process.exit(1);
  }

  const imageFiles = [
    ...collectImageFiles(catDir),
    ...collectImageFiles(dogDir),
  ];

  if (imageFiles.length === 0) {
    console.error('No image files found in public/uploads/cats or public/uploads/dogs. Add at least one JPEG/PNG file.');
    process.exit(1);
  }

  const usersSnapshot = await db.collection('users').get();
  if (usersSnapshot.empty) {
    console.error('No user documents found in Firestore. Run the user seeder first.');
    process.exit(1);
  }

  const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) } as any));
  const listingsToCreate = Math.min(imageFiles.length, users.length);

  const usedFiles = new Set<string>();
  const authors = [...users].sort(() => Math.random() - 0.5).slice(0, listingsToCreate);

  for (let i = 0; i < listingsToCreate; i++) {
    const author = authors[i];
    const imageFile = imageFiles.find((file) => !usedFiles.has(file));
    if (!imageFile) break;
    usedFiles.add(imageFile);

    const lowerPath = imageFile.toLowerCase();
    const petType = lowerPath.includes(`${path.sep}cats${path.sep}`) || lowerPath.includes('/cats/') ? 'cat' :
      lowerPath.includes(`${path.sep}dogs${path.sep}`) || lowerPath.includes('/dogs/') ? 'dog' : 'other';
    
    const breed = petType === 'cat' ? rand(CAT_BREEDS) : petType === 'dog' ? rand(DOG_BREEDS) : 'Mixed';
    const title = `${breed} جميل للبيع - ${Math.floor(Math.random() * 1000)}`;
    const description = rand(LISTING_DESCRIPTIONS);
    const price = Math.floor(Math.random() * 5000) + 500;

    try {
      console.log(`Uploading image ${path.basename(imageFile)} for listing ${i + 1}/${listingsToCreate}`);
      const imageUrl = await uploadImage(supabase, imageFile, 'listings');

      const listing = {
        title,
        description,
        price,
        animalType: 'pet',
        petType,
        breed,
        age: rand(AGES),
        location: rand(CITIES),
        contactPreference: 'chat',
        images: [imageUrl],
        authorId: author.id,
        authorName: author.displayName || 'User',
        authorPhotoURL: author.photoURL || null,
        language: 'ar',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      };

      await db.collection('listings').add(listing);
      console.log(`Created listing for ${author.displayName || author.id}: ${title}`);
    } catch (error: any) {
      console.error('Failed to create listing:', error.message || error);
    }

    await sleep(200);
  }

  console.log('Listings seeder finished.');
}

main().catch((err) => {
  console.error('Seeder error:', err);
  process.exit(1);
});
