// Text of the About, Privacy and Terms pages, in Arabic and English.
// Keep both languages saying the same thing; update `updated` whenever the text changes.

export type Section = { heading: string; paragraphs?: string[]; bullets?: string[] };
export type InfoPage = { title: string; description: string; intro: string; sections: Section[] };
type Pages = Record<"about" | "privacy" | "terms", Record<"ar" | "en", InfoPage>>;

export const PAGES_UPDATED = "2026-11-06";

export const PAGES: Pages = {
  about: {
    ar: {
      title: "عن AqarArena",
      description: "AqarArena دليل محايد لمشروعات المطورين العقاريين في مصر: الأسعار وأنظمة السداد والماستر بلان وأرقام المطور الرسمية في مكان واحد.",
      intro:
        "AqarArena دليل محايد لكل مشروعات المطورين العقاريين في مصر. هدفنا بسيط: إن أي حد بيدوّر على وحدة يلاقي الأرقام الحقيقية قدامه بوضوح، ويقارن بين المشروعات بنفس المعايير، ويتواصل مع المطور مباشرة.",
      sections: [
        {
          heading: "إيه اللي بنقدمه",
          bullets: [
            "صفحة لكل مشروع فيها الأسعار وأنظمة السداد ونماذج الوحدات والماستر بلان والصور والموقع.",
            "مقارنة بين المشروعات جنب بعض، وبحث بالميزانية: المقدم اللي معاك والقسط اللي تقدر عليه.",
            "خريطة لكل المشروعات، وأدلة للمناطق، وتنبيه بتاريخ آخر تحديث للأسعار.",
            "أرقام التواصل الرسمية للمطور، من غير وسيط.",
          ],
        },
        {
          heading: "مبادئنا",
          bullets: [
            "الحياد: مش بنبيع ولا بنأجّر ولا بنتوسط، ومش بناخد عمولة من المشتري على أي صفقة.",
            "الوضوح: بنعرض المقدم بالجنيه والقسط لنفس الخطة، ومش بنخبّي أي رسوم معروفة.",
            "الدقة: البيانات بتيجي من المطورين وبتتراجع قبل النشر، وتاريخ آخر تحديث ظاهر على الأسعار.",
            "المساواة: كل مشروع بيتقارن بنفس المعايير، والمشروعات المميزة (المدفوعة) متعلّم عليها بوضوح.",
          ],
        },
        {
          heading: "للمطورين العقاريين",
          paragraphs: [
            "عرض المشروعات على AqarArena مجاني. المطور بيضيف مشروعاته وأسعاره وصوره بنفسه من بوابة المطورين، وفريقنا بيراجع البيانات قبل ما تظهر. وبنقدّم كمان باقات اختيارية للظهور المميز، وكلها متعلّم عليها للزوار.",
          ],
        },
        {
          heading: "تواصل معنا",
          paragraphs: ["عندك اقتراح أو شكوى أو محتاج مساعدة؟ راسلنا من صفحة تواصل معنا أو على البريد الإلكتروني الموضح فيها، وهنرد عليك في أقرب وقت."],
        },
      ],
    },
    en: {
      title: "About AqarArena",
      description: "AqarArena is a neutral guide to real-estate developer projects in Egypt: prices, payment plans, master plans and official developer numbers in one place.",
      intro:
        "AqarArena is a neutral guide to every developer project in Egypt. Our aim is simple: anyone looking for a home should see the real numbers clearly, compare projects on the same terms, and reach the developer directly.",
      sections: [
        {
          heading: "What we offer",
          bullets: [
            "A page for every project with prices, payment plans, unit types, master plan, photos and location.",
            "Side-by-side comparison, and budget search: the cash you have for the down payment and the monthly installment you can afford.",
            "A map of every project, area guides, and the date prices were last updated.",
            "The developer's official contact numbers, with no broker in between.",
          ],
        },
        {
          heading: "Our principles",
          bullets: [
            "Neutral: we don't sell, rent or broker, and we take no commission from buyers on any sale.",
            "Clear: we show the down payment in EGP next to the installment of the same plan, and hide no known fees.",
            "Accurate: data comes from developers and is reviewed before it goes live; the last update date is shown on prices.",
            "Fair: every project is compared on the same terms, and featured (paid) listings are clearly marked.",
          ],
        },
        {
          heading: "For developers",
          paragraphs: [
            "Listing projects on AqarArena is free. Developers add their projects, prices and photos themselves through the developer portal, and our team reviews the data before it is published. Optional featured placements are available and are always marked for visitors.",
          ],
        },
        {
          heading: "Contact us",
          paragraphs: ["Have a suggestion, a complaint or a question? Write to us from the Contact page or at the email address shown there, and we'll get back to you soon."],
        },
      ],
    },
  },

  privacy: {
    ar: {
      title: "سياسة الخصوصية",
      description: "إزاي AqarArena بتجمع البيانات الشخصية وبتستخدمها وبتحميها، وحقوقك وفق قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020.",
      intro:
        "خصوصيتك مهمة لينا. السياسة دي بتشرح البيانات اللي بنجمعها لما تستخدم AqarArena، وبنستخدمها في إيه، ومين بيشوفها، وحقوقك فيها، وفقًا لقانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020 والقوانين المعمول بها.",
      sections: [
        {
          heading: "1. البيانات اللي بنجمعها",
          bullets: [
            "تصفّح الموقع: مش محتاج حساب. المفضلة وقائمة المقارنة واختيار الوضع الفاتح أو الغامق بيتحفظوا على جهازك أنت بس. قوايمك نفسها مش بتوصلنا.",
            "إحصائيات الاستخدام: بنستخدم Vercel Web Analytics لقياس عدد الزيارات والصفحات الأكثر مشاهدة ونوع الجهاز والدولة. الخدمة دي مش بتستخدم ملفات تعريف الارتباط (cookies) ولا بتتعرف عليك شخصيًا.",
            "إحصائيات المشروعات: بنعدّ كام مرة مشروع اتشاف، واتضاف للمفضلة أو المقارنة، واتفتحت ورقة العرض بتاعته، واتضغط على أرقام المطور. بنحفظ العدد اليومي بس لكل مشروع، من غير عنوان IP ولا cookies ولا أي حاجة تعرّفك، وبنعرض الأرقام دي للمطور وفريقنا. المتصفح بيفتكر في الجلسة دي إنه بعت العدّ عشان مايتحسبش مرتين.",
            "رسائل التواصل: لما تراسلنا بنحفظ اسمك وبريدك الإلكتروني أو رقم موبايلك ونص رسالتك، عشان نرد عليك.",
            "تنبيهات الأسعار: لما تطلب تنبيه لمشروع بنحفظ اسمك وبريدك الإلكتروني ورقم موبايلك لو كتبته، والمشروع اللي اخترته، عشان نبعتلك لما أسعاره أو خطط السداد تتغيّر. التنبيهات مش بتبدأ غير لما تأكد من رابط في بريدك، وكل رسالة فيها رابط لإيقافها، ولما توقفها بنمسح بياناتك. مش بنشارك البيانات دي مع المطورين.",
            "حسابات المطورين: اسم الشركة واسم المسؤول ورقم الموبايل والبريد الإلكتروني واسم المستخدم، وكلمة المرور محفوظة بشكل مشفّر لا يمكن قراءته، بالإضافة للبيانات والصور اللي المطور بيرفعها.",
            "بيانات تقنية للأمان: عنوان IP بيتسجّل مؤقتًا لحماية الموقع من محاولات الدخول المتكررة والرسائل المزعجة.",
          ],
        },
        {
          heading: "2. بنستخدم البيانات في إيه",
          bullets: [
            "تشغيل الموقع وتحسينه وفهم إزاي الزوار بيستخدموه.",
            "الرد على رسائلك وطلباتك وشكاويك.",
            "إدارة حسابات المطورين ومراجعة البيانات قبل نشرها، وإرسال الإشعارات المتعلقة بيها.",
            "حماية الموقع ومستخدميه من إساءة الاستخدام.",
          ],
          paragraphs: ["مش بنبيع بياناتك الشخصية لأي طرف، ومش بنستخدمها في إعلانات موجهة، ومش بنبعت بيانات الزوار للمطورين."],
        },
        {
          heading: "3. مين بيتعامل مع البيانات",
          paragraphs: ["بنستعين بمقدمي خدمات موثوقين لتشغيل الموقع، وكل واحد منهم بيتعامل مع البيانات بالقدر اللازم للخدمة دي بس:"],
          bullets: [
            "Vercel: استضافة الموقع وتخزين الصور وإحصائيات الاستخدام.",
            "Neon: قاعدة البيانات.",
            "Resend: إرسال رسائل البريد الإلكتروني.",
            "OpenFreeMap: خرائط الموقع (خادم الخرائط بيشوف عنوان IP بتاعك لما الخريطة تتحمّل).",
          ],
        },
        {
          heading: "4. مكان حفظ البيانات ومدته",
          paragraphs: [
            "البيانات محفوظة على خوادم مقدمي الخدمات المذكورين، وأغلبها في الاتحاد الأوروبي (فرانكفورت)، مع ضمانات حماية مناسبة. بنحتفظ برسائل التواصل لمدة أقصاها 24 شهر، وبيانات تنبيهات الأسعار لحد ما توقفها (والطلبات اللي ماتأكدتش بتتمسح بعد أسبوع)، وبيانات حسابات المطورين طول ما الحساب موجود، وبعد كده بنمسحها أو بنخليها مجهولة الهوية إلا لو القانون طلب غير كده.",
          ],
        },
        {
          heading: "5. حماية البيانات",
          paragraphs: [
            "كل الاتصال بالموقع مشفّر (HTTPS)، وكلمات المرور محفوظة بطريقة تشفير لا تسمح بقراءتها، والوصول للوحة التحكم محدود ومحمي، ومحاولات الدخول المتكررة الخاطئة بتتوقف تلقائيًا.",
          ],
        },
        {
          heading: "6. حقوقك",
          paragraphs: ["من حقك وفق القانون:"],
          bullets: [
            "تعرف البيانات اللي عندنا عنك وتطلب نسخة منها.",
            "تصحّح أي بيانات غلط أو تكمّلها.",
            "تطلب مسح بياناتك أو توقف معالجتها، في الحدود اللي يسمح بيها القانون.",
            "تعترض على معالجة بياناتك أو تسحب موافقتك في أي وقت.",
          ],
        },
        {
          heading: "7. الأطفال",
          paragraphs: ["الموقع موجّه للبالغين، ومش بنجمع بيانات عن قصد من أي حد أقل من 18 سنة."],
        },
        {
          heading: "8. التعديلات وطرق التواصل",
          paragraphs: [
            "ممكن نحدّث السياسة دي من وقت للتاني، وهيظهر تاريخ آخر تحديث في أول الصفحة. لأي سؤال أو طلب متعلق ببياناتك، تواصل معانا من صفحة تواصل معنا أو على البريد الإلكتروني الموضح فيها.",
          ],
        },
      ],
    },
    en: {
      title: "Privacy policy",
      description: "How AqarArena collects, uses and protects personal data, and your rights under Egypt's Personal Data Protection Law No. 151 of 2020.",
      intro:
        "Your privacy matters to us. This policy explains what data we collect when you use AqarArena, why, who handles it and your rights over it, in line with Egypt's Personal Data Protection Law No. 151 of 2020 and other applicable laws.",
      sections: [
        {
          heading: "1. What we collect",
          bullets: [
            "Browsing: no account is needed. Favorites, the compare list and your light/dark choice are stored on your own device only. The lists themselves never reach us.",
            "Usage statistics: we use Vercel Web Analytics to count visits, popular pages, device type and country. It uses no cookies and does not identify you personally.",
            "Project statistics: we count how often a project is viewed, added to favorites or a comparison, has its offer sheet opened, and has the developer's numbers clicked. Only a daily total per project is kept, with no IP address, cookie or anything that identifies you, and these totals are shown to the developer and our team. Your browser remembers for the session that it already sent a count, so nothing is counted twice.",
            "Contact messages: when you write to us we keep your name, email or mobile number and your message so we can reply.",
            "Price alerts: when you ask for alerts on a project we keep your name, email, your mobile number if you add it, and the project, so we can email you when its prices or payment plans change. Alerts only start after you confirm through a link in your email, every alert has a link to stop them, and stopping them deletes your details. We do not share these details with developers.",
            "Developer accounts: company name, contact person, mobile, email and username; the password is stored only as an irreversible hash; plus the data and photos the developer uploads.",
            "Technical data for security: IP addresses are kept briefly to protect the site from repeated sign-in attempts and spam.",
          ],
        },
        {
          heading: "2. How we use it",
          bullets: [
            "To run and improve the site and understand how visitors use it.",
            "To reply to your messages, requests and complaints.",
            "To manage developer accounts, review data before publication and send related notifications.",
            "To protect the site and its users from misuse.",
          ],
          paragraphs: ["We don't sell your personal data, we don't use it for targeted advertising, and we don't pass visitors' data to developers."],
        },
        {
          heading: "3. Who handles the data",
          paragraphs: ["We rely on trusted service providers to run the site; each handles data only as needed for its service:"],
          bullets: [
            "Vercel: hosting, image storage and usage statistics.",
            "Neon: the database.",
            "Resend: sending email.",
            "OpenFreeMap: the maps (the map server sees your IP address when a map loads).",
          ],
        },
        {
          heading: "4. Where and how long",
          paragraphs: [
            "Data is stored on these providers' servers, mostly in the European Union (Frankfurt), with appropriate safeguards. We keep contact messages for up to 24 months, price-alert details until you stop the alerts (unconfirmed sign-ups are deleted after a week), and developer account data for as long as the account exists, after which it is deleted or anonymised unless the law requires otherwise.",
          ],
        },
        {
          heading: "5. Security",
          paragraphs: [
            "All traffic to the site is encrypted (HTTPS), passwords are stored as irreversible hashes, access to the admin area is restricted and protected, and repeated wrong sign-in attempts are blocked automatically.",
          ],
        },
        {
          heading: "6. Your rights",
          paragraphs: ["Under the law you may:"],
          bullets: [
            "Know what data we hold about you and ask for a copy.",
            "Correct or complete inaccurate data.",
            "Ask us to erase your data or stop processing it, within the limits the law allows.",
            "Object to processing or withdraw your consent at any time.",
          ],
        },
        {
          heading: "7. Children",
          paragraphs: ["The site is meant for adults, and we do not knowingly collect data from anyone under 18."],
        },
        {
          heading: "8. Changes and contact",
          paragraphs: [
            "We may update this policy from time to time; the date of the last update is shown at the top. For any question or request about your data, contact us through the Contact page or at the email address shown there.",
          ],
        },
      ],
    },
  },

  terms: {
    ar: {
      title: "شروط الاستخدام",
      description: "الشروط اللي بتحكم استخدام موقع AqarArena وبوابة المطورين.",
      intro: "استخدامك لموقع AqarArena معناه إنك موافق على الشروط دي. لو مش موافق عليها، من فضلك ماتستخدمش الموقع.",
      sections: [
        {
          heading: "1. طبيعة الخدمة",
          paragraphs: [
            "AqarArena منصة عرض ومقارنة لمشروعات المطورين العقاريين في مصر. إحنا مش وسيط عقاري ولا ممثل لأي مطور، ومش بنبيع أو نأجّر وحدات، ومش بنستقبل أي مدفوعات أو عرابين، ومش طرف في أي تعاقد بين المشتري والمطور.",
          ],
        },
        {
          heading: "2. دقة المعلومات",
          paragraphs: [
            "بنبذل مجهود كبير عشان البيانات تكون دقيقة ومحدّثة، وأغلبها بيقدّمه المطورين نفسهم وبيتراجع قبل النشر. ومع ذلك، الأسعار وأنظمة السداد والمساحات ومواعيد التسليم استرشادية وممكن تتغير من غير إشعار. لازم تتأكد من كل التفاصيل مع المطور مباشرة قبل أي قرار أو دفع.",
            "المعلومات المعروضة، ومنها مؤشر القيمة والحاسبة، لأغراض المعلومات فقط، ومش نصيحة استثمارية أو مالية أو قانونية.",
          ],
        },
        {
          heading: "3. استخدامك للموقع",
          bullets: [
            "تستخدم الموقع لأغراض مشروعة بس، ومن غير ما تأذي الموقع أو مستخدميه.",
            "ممنوع نسخ البيانات بشكل آلي أو جماعي (scraping) أو إعادة نشرها لأغراض تجارية من غير إذن مكتوب.",
            "ممنوع محاولة الدخول لأجزاء غير مصرح بيها، أو التأثير على عمل الموقع أو أمانه.",
          ],
        },
        {
          heading: "4. حسابات المطورين",
          bullets: [
            "المطور مسؤول عن صحة ودقة كل البيانات والصور والمستندات اللي بيرفعها، وعن تحديثها.",
            "المطور بيقرّ إن عنده حق نشر المحتوى اللي بيرفعه، وبيدّي AqarArena ترخيص غير حصري لعرضه على الموقع والترويج له.",
            "كل تعديل بيتراجع قبل النشر، ومن حقنا نرفض أو نعدّل أو نشيل أي محتوى مخالف أو غير دقيق.",
            "المطور مسؤول عن سرية اسم المستخدم وكلمة المرور وعن أي نشاط بيتم من حسابه.",
            "من حقنا نوقف أي حساب بيخالف الشروط دي.",
          ],
        },
        {
          heading: "5. الملكية الفكرية",
          paragraphs: [
            "تصميم الموقع وشعاره ونصوصه وأدواته ملك AqarArena. أسماء المشروعات والمطورين وشعاراتهم وصورهم ملك أصحابها، ومعروضة بغرض التعريف والمقارنة فقط.",
          ],
        },
        {
          heading: "6. الروابط الخارجية",
          paragraphs: ["الموقع ممكن يحتوي على روابط لمواقع المطورين أو جهات تانية، وإحنا مش مسؤولين عن محتواها أو سياساتها."],
        },
        {
          heading: "7. حدود المسؤولية",
          paragraphs: [
            "الموقع مقدّم \"كما هو\". في الحدود اللي يسمح بيها القانون، AqarArena مش مسؤولة عن أي خسارة أو ضرر ناتج عن الاعتماد على المعلومات المعروضة أو عن أي تعامل بين المستخدم والمطور.",
          ],
        },
        {
          heading: "8. التعديلات والقانون المطبّق",
          paragraphs: [
            "ممكن نعدّل الشروط دي من وقت للتاني، واستمرارك في استخدام الموقع بعد التعديل معناه موافقتك عليه. الشروط دي بتخضع لقوانين جمهورية مصر العربية، وتختص محاكم القاهرة بأي نزاع بخصوصها.",
          ],
        },
      ],
    },
    en: {
      title: "Terms of use",
      description: "The terms that govern the use of the AqarArena website and developer portal.",
      intro: "By using AqarArena you agree to these terms. If you don't agree, please don't use the site.",
      sections: [
        {
          heading: "1. What the service is",
          paragraphs: [
            "AqarArena is a platform that shows and compares real-estate developer projects in Egypt. We are not a real-estate broker or any developer's agent; we don't sell or rent units, we don't take payments or deposits, and we are not a party to any contract between a buyer and a developer.",
          ],
        },
        {
          heading: "2. Accuracy of information",
          paragraphs: [
            "We work hard to keep the data accurate and up to date; most of it is supplied by the developers themselves and reviewed before publication. Even so, prices, payment plans, areas and delivery dates are indicative and may change without notice. Always confirm every detail directly with the developer before any decision or payment.",
            "The information shown, including the value index and the calculator, is for information only and is not investment, financial or legal advice.",
          ],
        },
        {
          heading: "3. Your use of the site",
          bullets: [
            "Use the site only for lawful purposes and without harming the site or its users.",
            "Automated or bulk copying of data (scraping) or republishing it commercially without written permission is not allowed.",
            "Do not try to access restricted areas or interfere with the site's operation or security.",
          ],
        },
        {
          heading: "4. Developer accounts",
          bullets: [
            "Developers are responsible for the accuracy of all data, photos and documents they upload, and for keeping them up to date.",
            "Developers confirm they have the right to publish what they upload and grant AqarArena a non-exclusive licence to display and promote it on the site.",
            "Every change is reviewed before publication; we may refuse, edit or remove inaccurate or non-compliant content.",
            "Developers are responsible for keeping their username and password confidential and for all activity on their account.",
            "We may suspend any account that breaches these terms.",
          ],
        },
        {
          heading: "5. Intellectual property",
          paragraphs: [
            "The site's design, logo, text and tools belong to AqarArena. Project and developer names, logos and photos belong to their owners and are shown for identification and comparison only.",
          ],
        },
        {
          heading: "6. External links",
          paragraphs: ["The site may link to developers' websites or other parties; we are not responsible for their content or policies."],
        },
        {
          heading: "7. Limitation of liability",
          paragraphs: [
            "The site is provided \"as is\". To the extent permitted by law, AqarArena is not liable for any loss or damage arising from reliance on the information shown or from any dealings between a user and a developer.",
          ],
        },
        {
          heading: "8. Changes and governing law",
          paragraphs: [
            "We may change these terms from time to time; continuing to use the site after a change means you accept it. These terms are governed by the laws of the Arab Republic of Egypt, and the courts of Cairo have jurisdiction over any dispute about them.",
          ],
        },
      ],
    },
  },
};
