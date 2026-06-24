import path from 'path';
import fs from 'fs';
import admin from 'firebase-admin';
import { confirmExecution, initializeSupabase, initializeFirebaseAdmin, rand, sleep, collectImageFiles, uploadImage } from './seed-utils';

confirmExecution();

const supabase = initializeSupabase();
const { db } = initializeFirebaseAdmin('__seed_coupling__');

const PET_NAMES = ['لولو', 'بيبسي', 'مشمش', 'سنبلة', 'نونو', 'رورو', 'بسبوسة', 'برقوق', 'زينة', 'بوبي', 'تيتو', 'ليلي'];
const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tangier', 'Agadir', 'Essaouira', 'Nador'];
const CAT_BREEDS = ['Persian', 'Siamese', 'Maine Coon', 'Sphynx', 'Ragdoll', 'Bengal', 'British Shorthair'];
const DOG_BREEDS = ['Labrador', 'German Shepherd', 'Beagle', 'Poodle', 'Shiba Inu', 'Bulldog', 'Golden Retriever'];
const PET_TYPES = ['dog', 'cat', 'bird', 'sheep', 'other'];
const BREEDS = ['Mixed', 'Local', 'Canary', 'Angora'];
const COUPLING_DESCRIPTIONS = [
  'حيوان صحي ونشيط يبحث عن شريك مناسب، يتوفر على تطعيمات كاملة وسلوك هادئ.',
  'من أجل تزاوج آمن ومريح يرجى التواصل عبر التطبيق إذا كنت تبحث عن شريك من نفس السلالة.',
  'جاهز للتزاوج هذا الأسبوع في مدينة رائعة ومعتنى به بشكل جيد.',
  'خبرة ممتازة في التربية والعناية، الحيوان متعود على البيئة المنزلية والصحية.',
  'موافق للتزاوج في مكان هادئ، لديه سجل صحي نظيف وشخصية لطيفة.'
];

async function main() {
  console.log('Starting coupling-only seeder using existing user accounts.');

  const imageDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(imageDir)) {
    console.error('Missing public/uploads directory. Add your images there first.');
    process.exit(1);
  }
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
    console.error('No image files found in public/uploads. Add at least one JPEG/PNG file.');
    process.exit(1);
  }

  const usersSnapshot = await db.collection('users').get();
  if (usersSnapshot.empty) {
    console.error('No user documents found in Firestore. Run the user seeder first.');
    process.exit(1);
  }

  const users = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) } as any));
  const offersToCreate = Math.min(imageFiles.length, users.length);

  const usedFiles = new Set<string>();
  const orders = [...users].sort(() => Math.random() - 0.5).slice(0, offersToCreate);

  for (let i = 0; i < offersToCreate; i++) {
    const author = orders[i];
    const petName = rand(PET_NAMES);
    const imageFile = imageFiles.find((file) => !usedFiles.has(file));
    if (!imageFile) break;
    usedFiles.add(imageFile);

    const lowerPath = imageFile.toLowerCase();
    const petType = lowerPath.includes(`${path.sep}cats${path.sep}`) || lowerPath.includes('/cats/') ? 'cat' :
      lowerPath.includes(`${path.sep}dogs${path.sep}`) || lowerPath.includes('/dogs/') ? 'dog' : rand(PET_TYPES);
    const breed = petType === 'cat' ? rand(CAT_BREEDS) : petType === 'dog' ? rand(DOG_BREEDS) : rand(BREEDS);
    const description = rand(COUPLING_DESCRIPTIONS);

    try {
      console.log(`Uploading image ${path.basename(imageFile)} for offer ${i + 1}/${offersToCreate}`);
      const imageUrl = await uploadImage(supabase, imageFile, 'coupling');

      const offer = {
        petName,
        petType,
        breed,
        description,
        targetBreed: 'Any',
        city: rand(CITIES),
        gender: Math.random() > 0.5 ? 'male' : 'female',
        images: [imageUrl],
        authorId: author.id,
        authorName: author.displayName || 'User',
        authorPhotoURL: author.photoURL || null,
        language: 'ar',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      };

      await db.collection('coupling_offers').add(offer);
      console.log(`Created coupling offer for ${author.displayName || author.id}: ${petName}`);
    } catch (error: any) {
      console.error('Failed to create coupling offer:', error.message || error);
    }

    await sleep(200);
  }

  console.log('Coupling offers seeder finished.');
}

main().catch((err) => {
  console.error('Seeder error:', err);
  process.exit(1);
});