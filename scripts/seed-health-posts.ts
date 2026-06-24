import path from 'path';
import fs from 'fs';
import admin from 'firebase-admin';
import { confirmExecution, initializeSupabase, initializeFirebaseAdmin, rand, sleep, collectImageFiles, uploadImage } from './seed-utils';

confirmExecution();

const supabase = initializeSupabase();
const { db } = initializeFirebaseAdmin('__seed_health__');

const HEALTH_TITLES = [
  'تغذية صحيحة لحيوانك الأليف',
  'العناية بصحة الحيوان في الصيف',
  'أهم اللقاحات للقطط والكلاب',
  'الصحة النفسية للحيوانات الأليفة',
  'الوقاية من الأمراض المعدية',
  'التغذية السليمة للجراء الصغيرة',
  'العناية بأسنان حيوانك',
  'الأمراض الشائعة وأعراضها',
  'برنامج اللقاحات المهم',
  'نصائح للعناية الصحية اليومية'
];

const HEALTH_DESCRIPTIONS = [
  'تأكد من تقديم طعام عالي الجودة يحتوي على جميع العناصر الغذائية الأساسية لحيوانك الأليف. الغذاء الصحي هو أساس الصحة الجيدة والعمر الطويل.',
  'في فصل الصيف، تأكد من توفير الماء النظيف بكثرة وتجنب التعرض المباشر للشمس الحارة. اختر أوقات الخروج في الصباح أو المساء.',
  'اللقاحات الأساسية مهمة جداً لحماية حيوانك من الأمراض الخطيرة. استشر الطبيب البيطري حول برنامج التطعيم المناسب.',
  'احرص على اللعب المنتظم والتفاعل الاجتماعي لتحسين الصحة النفسية لحيوانك. الحيوانات السعيدة أكثر صحة وحيوية.',
  'النظافة الدورية والتطعيمات المنتظمة من أفضل الطرق للوقاية من الأمراض المعدية. لا تهمل زيارات الطبيب البيطري.',
  'الجراء الصغيرة تحتاج إلى طعام متخصص يدعم نموها السليم. اختر علاجات آمنة وفيتامينات موصى بها من قبل الأطباء البيطريين.',
  'نظف أسنان حيوانك بانتظام واستخدم معجون أسنان آمن. أسنان صحية تعني حياة أطول وأفضل.',
  'تعرف على الأعراض المبكرة للأمراض الشائعة مثل الإسهال والقيء والخمول. التشخيص المبكر يساعد في العلاج السريع.',
  'اتبع برنامج اللقاحات الموصى به وسجل كل التطعيمات. تذكر تواريخ اللقاحات القادمة لا تتأخر عنها.',
  'العناية اليومية تشمل الاستحمام المنتظم وتنظيف الأذنين والعينين. حيوان نظيف هو حيوان صحي وسعيد.'
];

const HEALTH_CATEGORIES = ['nutrition', 'vaccination', 'hygiene', 'exercise', 'prevention'];

async function main() {
  console.log('Starting health posts seeder using existing user accounts.');

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
  const healthPostsToCreate = Math.min(imageFiles.length, users.length);

  const usedFiles = new Set<string>();
  const authors = [...users].sort(() => Math.random() - 0.5).slice(0, healthPostsToCreate);

  for (let i = 0; i < healthPostsToCreate; i++) {
    const author = authors[i];
    const imageFile = imageFiles.find((file) => !usedFiles.has(file));
    if (!imageFile) break;
    usedFiles.add(imageFile);

    // Combine random elements for more varied data
    const category = rand(HEALTH_CATEGORIES);
    const title = `${rand(HEALTH_TITLES)} - ${category}`;
    const description = `${rand(HEALTH_DESCRIPTIONS)} 

هذا المنشور يركز على ${category} لضمان صحة أفضل لحيوانك.`;

    try {
      console.log(`Uploading image ${path.basename(imageFile)} for health post ${i + 1}/${healthPostsToCreate}`);
      const imageUrl = await uploadImage(supabase, imageFile, 'health');

      const healthPost = {
        title,
        description,
        category,
        images: [imageUrl],
        authorId: author.id,
        authorName: author.displayName || 'User',
        authorPhotoURL: author.photoURL || null,
        language: 'ar',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      };

      await db.collection('health_posts').add(healthPost);
      console.log(`Created health post for ${author.displayName || author.id}: ${title}`);
    } catch (error: any) {
      console.error('Failed to create health post:', error.message || error);
    }

    await sleep(200);
  }

  console.log('Health posts seeder finished.');
}

main().catch((err) => {
  console.error('Seeder error:', err);
  process.exit(1);
});
