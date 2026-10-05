// Deployment sync: ensure Railway production builds current canonical homepage copy.
import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve("dist/public");
const templatePath = path.join(publicDir, "index.html");
const template = fs.readFileSync(templatePath, "utf8");

const enrichment = JSON.parse(fs.readFileSync(path.resolve("scripts/seo-page-enrichment.json"), "utf8"));

const pages = [
  {
    path: "/",
    title: "Papa Life - A Practical Path for Fathers of Adult Children",
    description:
      "Papa Life helps fathers understand distance, tension, and changing roles with adult children and begin rebuilding connection with humility, faith, and practical next steps.",
    eyebrow: "Papa Life Coach",
    headline: "Papa Life gives fathers a practical path back to connection.",
    intro:
      "For fathers whose adult sons or daughters feel distant, guarded, or silent, Papa Life offers the 2-Minute Fatherhood Check-In, guided lessons, AI coaching, and the PAPA Framework: Presence, Authority, Purpose, and Alignment.",
    sections: [
      ["Start with clarity", "Take the 2-Minute Fatherhood Check-In to notice where things stand today and choose an honest, practical next step."],
      ["Learn the new role", "Use the free workshop and course library to move from pressure and control into listening, humility, consistency, and trust."],
      ["Practice the path", "Papa Life combines practical coaching, reflection tools, membership resources, and support for fathers rebuilding adult-child relationships."],
      ["Founded by Brian Keith Hill", "Brian Keith Hill is the founder of Papa Life, a Scripture-centered fatherhood movement for fathers of adult children."],
    ],
  },
  {
    path: "/assessment",
    title: "Free PAPA Fatherhood Assessment | Papa Life",
    description:
      "Score yourself across Presence, Authority, Purpose, and Alignment. A free five-minute assessment for fathers of adult children.",
    eyebrow: "Free Assessment",
    headline: "Your grown child stopped talking to you. It does not have to stay that way.",
    intro:
      "Take the free assessment to see where things stand with your adult son or daughter and identify a first step toward closing the gap.",
    sections: [
      ["Presence", "Listen before fixing and become safe enough for honest conversation."],
      ["Authority", "Lead through character, humility, and consistency instead of pressure or position."],
      ["Purpose", "Know who you are now that fatherhood is no longer centered on daily provision and control."],
      ["Alignment", "Close the gap between your values, words, and daily actions."],
    ],
  },
  {
    path: "/relationship-assessment",
    title: "2-Minute Fatherhood Check-In | Adult Child Relationship | Papa Life",
    description:
      "Take the free 2-Minute Fatherhood Check-In to notice distance, trust, communication, and your changing role with an adult son or daughter.",
    eyebrow: "2-Minute Fatherhood Check-In",
    headline: "Name where the relationship is today so your next move can be intentional.",
    intro:
      "This short check-in helps fathers stop guessing. It is not a diagnosis or a score of your worth as a father. It is a practical way to notice patterns in communication, trust, emotional safety, and the shift from raising a child to relating to an adult.",
    sections: [
      ["Notice the current pattern", "Think about what happens when you call, text, give advice, disagree, or ask for time together. The goal is not to blame yourself or your adult child. The goal is to see the pattern clearly enough to choose a wiser response."],
      ["Look at trust and emotional safety", "A relationship can have love and still feel tense. Notice whether conversations make room for honesty, whether either person becomes defensive quickly, and whether your adult child can disagree without feeling managed or corrected."],
      ["Recognize the role change", "The fatherhood role changes when children become adults. Authority becomes less about directing behavior and more about character, steadiness, respect, and the quality of your presence."],
      ["Choose one next step", "A useful next step may be listening without explaining, sending a low-pressure message, giving requested space, making a clean apology, or becoming more consistent over time. Small changes are easier to sustain than one emotional attempt to fix everything."],
      ["Use the PAPA Framework", "Presence, Authority, Purpose, and Alignment give you four places to reflect. Presence asks how you show up. Authority asks how you lead without control. Purpose asks who you want to be in this season. Alignment asks whether your behavior matches your values."],
      ["Frequently asked: Is this clinical?", "No. Papa Life is coaching and education. This check-in is a reflection tool that helps fathers notice relationship patterns and choose practical next steps."],
      ["Frequently asked: Do I need my adult child to participate?", "No. The starting point is the part you can control: your own listening, language, consistency, boundaries, and willingness to change."],
    ],
    relatedLinks: [
      ["Take the 2-Minute Check-In", "/marlee-assessment"],
      ["Learn the PAPA Framework", "/papa-framework"],
      ["Why adult children pull away", "/why-adult-children-pull-away"],
      ["Father-child estrangement help", "/father-child-estrangement"],
    ],
  },
  {
    path: "/papa-first-lesson",
    title: "Free Papa Life Workshop | First Lesson",
    description: "A free first lesson for fathers learning the new role with adult children.",
    eyebrow: "Free Workshop",
    headline: "Learn why the old fatherhood role stops working with adult children.",
    intro: "This first lesson helps fathers understand distance, tension, and the shift from control to presence.",
    sections: [
      ["What you will learn", "Why well-meaning fathers get stuck, how authority changes, and what one steady next step can look like."],
      ["Continue the path", "After the workshop, members can continue through guided Papa Life courses and reflection tools."],
    ],
  },
  {
    path: "/ai-coach",
    title: "Papa Life AI Coach | Biblical Fatherhood Coaching",
    description:
      "Ask the Papa Life AI Coach for practical guidance for fathers of adult children, including assessment, resources, prayer, Bible study, Tuesday Live support, and membership help.",
    eyebrow: "AI Coach",
    headline: "Ask for guidance when you need words, next steps, or perspective.",
    intro: "The Papa Life AI Coach helps fathers think through distance, tension, faith, repair, and practical next steps with adult children.",
    sections: [
      ["Assessment help", "Use the coach to understand your PAPA scores and what they suggest about Presence, Authority, Purpose, and Alignment."],
      ["Resource guidance", "Get pointed toward lessons, membership resources, Tuesday Live support, and practical exercises."],
    ],
  },
  {
    path: "/papa-framework",
    title: "The PAPA Framework for Fathers | Presence, Authority, Purpose, Alignment",
    description:
      "Learn the PAPA Framework: Presence, Authority, Purpose, and Alignment for fathers rebuilding trust and connection with adult children.",
    eyebrow: "PAPA Framework",
    headline: "Four pillars for becoming the father your adult child can experience differently.",
    intro: "The PAPA Framework gives fathers a practical map for the season after children become adults. It does not promise reconciliation or ask fathers to surrender healthy boundaries. It focuses attention on the part a father can lead: how he shows up, how he uses influence, what guides him, and whether his actions match his values.",
    sections: [
      ["Presence", "Presence means being emotionally available without immediately fixing, teaching, defending, or taking over. It includes listening long enough to understand what your adult child is saying and staying steady when the conversation is uncomfortable."],
      ["Authority", "Authority with an adult child is not the same as control. It is the credibility that grows from character, humility, consistency, and wise boundaries. You can be clear about your values without demanding obedience from another adult."],
      ["Purpose", "Purpose asks who you want to be as a father now. The provider role may still matter, but fatherhood can no longer be defined only by paying bills, giving instructions, or solving problems. Purpose gives your actions a deeper reason than winning an argument or getting a quick response."],
      ["Alignment", "Alignment closes the gap between what you say matters and what your adult child repeatedly experiences from you. Apologies, faith, values, and intentions become more believable when your daily behavior supports them over time."],
      ["How the four pillars work together", "Presence without boundaries can become fear of conflict. Authority without humility can become control. Purpose without action can stay theoretical. Alignment brings the pillars into everyday choices so change becomes visible and repeatable."],
      ["A practical way to begin", "Choose one recent interaction and review it through all four pillars. What did presence require? How did you use authority? What purpose were you serving? Did your behavior align with the father you want to be? Then choose one small change for the next interaction."],
      ["Frequently asked: Does PAPA guarantee reconciliation?", "No. Reconciliation requires more than one person's effort and cannot be forced. The framework helps a father become more intentional, accountable, and consistent in the part he can control."],
    ],
    relatedLinks: [
      ["Take the 2-Minute Fatherhood Check-In", "/marlee-assessment"],
      ["Adult son relationship help", "/adult-son-relationship"],
      ["Adult daughter relationship help", "/adult-daughter-relationship"],
      ["Father-child estrangement help", "/father-child-estrangement"],
    ],
  },
  {
    path: "/adult-son-relationship",
    title: "Adult Son Relationship Help for Fathers | Papa Life Coach",
    description:
      "Guidance for fathers rebuilding connection with an adult son through listening, respect, accountability, healthy boundaries, and consistent action.",
    eyebrow: "Adult Son Relationship",
    headline: "Your adult son does not need a boss. He needs a father who can relate to him as an adult.",
    intro: "A strained relationship with an adult son can leave a father unsure whether to call, give space, apologize, or try again. Papa Life starts with a simple shift: stop measuring fatherhood by control and start building credibility through presence, respect, responsibility, and consistency.",
    sections: [
      ["Why the old role can create friction", "A father may still feel responsible for protecting, correcting, and solving. An adult son may experience those same behaviors as criticism, pressure, or a lack of respect for his independence. The intention can be loving while the impact still creates distance."],
      ["Listen before you explain", "When your son names a hurt or frustration, the first task is understanding, not proving what you meant. Ask a clarifying question, reflect what you heard, and resist turning the conversation into a trial about who remembers the past correctly."],
      ["Advice needs permission", "Unrequested advice can sound like a vote of no confidence. Ask whether he wants you to listen, help him think it through, or offer an idea. That small question respects adulthood and reduces the pressure to defend himself."],
      ["Apologize without attaching a defense", "A useful apology names the behavior and its impact without immediately adding reasons, excuses, or a list of what your son did wrong. You can explain context later if he wants it. Repair usually starts with ownership, not persuasion."],
      ["Respect boundaries without disappearing", "If your son asks for space, honoring that request can be part of rebuilding trust. Space does not have to mean punishment or abandonment. A brief, low-pressure message can communicate care while leaving the decision to respond with him."],
      ["Let consistency carry more weight than one conversation", "Trust often changes through repeated experiences: calmer responses, fewer lectures, kept promises, respectful contact, and the ability to hear no. One strong conversation can open a door, but a new pattern gives the relationship something to stand on."],
      ["Use the PAPA Framework", "Presence helps you listen. Authority helps you lead without control. Purpose keeps the relationship bigger than your pride. Alignment asks whether your behavior matches the father you say you want to be."],
      ["Frequently asked: Why is my son distant even though I was there for him?", "Being present as a provider can be meaningful, but an adult son may also carry unresolved experiences about criticism, emotional availability, conflict, or independence. Distance can have more than one cause, so listening is more useful than assuming."],
      ["Frequently asked: Should I keep calling if he does not respond?", "Repeated contact can feel like pressure. If he has asked for space, respect it. If he has not given a clear boundary, consider a brief message that communicates care without demanding an immediate response."],
    ],
    relatedLinks: [
      ["Take the 2-Minute Fatherhood Check-In", "/marlee-assessment"],
      ["Learn the PAPA Framework", "/papa-framework"],
      ["Why adult children pull away", "/why-adult-children-pull-away"],
      ["Father-child estrangement help", "/father-child-estrangement"],
    ],
  },
  {
    path: "/adult-daughter-relationship",
    title: "Adult Daughter Relationship Help for Fathers | Papa Life Coach",
    description:
      "Support for fathers rebuilding trust and connection with an adult daughter through listening, emotional safety, respect, accountability, and consistency.",
    eyebrow: "Adult Daughter Relationship",
    headline: "She is an adult now. Reconnection starts with being willing to see the relationship through her eyes too.",
    intro: "Fathers of adult daughters often describe confusion: I love her, so why does she feel far away? Love matters, but adult relationships also depend on whether both people feel heard, respected, and emotionally safe enough to be honest. You can begin changing your side of the pattern without forcing closeness.",
    sections: [
      ["Do not confuse intention with impact", "You may remember providing, protecting, and trying your best. Your daughter may remember moments when she felt dismissed, criticized, controlled, or emotionally alone. Both realities can exist. Repair becomes more possible when you can hear impact without treating it as an attack on your entire fatherhood story."],
      ["Ask instead of assuming", "Questions create room for her adult perspective. Ask what helps her feel respected, what makes conversations difficult, or what she wishes you understood. The goal is curiosity without using the answer as material for an argument."],
      ["Make emotional safety practical", "Emotional safety can look ordinary: letting her finish, not mocking feelings, lowering your voice, not threatening the relationship, and not demanding immediate closeness. Those behaviors make honesty less expensive."],
      ["Apology is different from explanation", "If she describes a hurt, an apology can stand on its own before you explain your intention. A clean apology acknowledges impact and regret. The next step is behaving differently enough that the apology becomes believable."],
      ["Respect her adult life and boundaries", "Your daughter may make choices you would not make. Respect does not require agreement. It does require recognizing that the relationship is now adult-to-adult and that access, advice, time, and involvement cannot be assumed."],
      ["Build trust in small deposits", "A calm text, a kept promise, a remembered detail, a respectful response to no, or a conversation where you do not make yourself the center can matter. Reconnection is often less dramatic than fathers expect and more consistent than they are used to."],
      ["Use the PAPA Framework", "Presence helps you stay with the conversation. Authority helps you lead yourself instead of controlling her. Purpose reminds you why the relationship matters. Alignment asks whether your daily behavior supports the values you claim."],
      ["Frequently asked: Why does my adult daughter seem emotionally distant?", "There can be many reasons, including life changes, boundaries, unresolved conflict, different communication styles, or past experiences she sees differently than you do. The most useful starting point is curiosity rather than guessing her motive."],
      ["Frequently asked: What if she says she needs space?", "Take the boundary seriously. You can ask what space means in practical terms if that is unclear, then honor it. Respecting a boundary can communicate maturity and reduce pressure."],
    ],
    relatedLinks: [
      ["Take the 2-Minute Fatherhood Check-In", "/marlee-assessment"],
      ["Learn the PAPA Framework", "/papa-framework"],
      ["Why adult children pull away", "/why-adult-children-pull-away"],
      ["Father-child estrangement help", "/father-child-estrangement"],
    ],
  },
  {
    path: "/why-adult-children-pull-away",
    title: "Why Adult Children Pull Away From Their Fathers | Papa Life Coach",
    description:
      "Understand common reasons adult sons and daughters create distance from fathers and learn practical ways to respond without chasing, controlling, or giving up.",
    eyebrow: "Adult Child Distance",
    headline: "When an adult child pulls away, the distance is information—not a verdict on your worth as a father.",
    intro: "Adult sons and daughters create distance for many reasons. Sometimes it is part of becoming more independent. Sometimes it follows repeated conflict, criticism, pressure, unresolved hurt, or a feeling that honest conversation is too costly. The useful question is not only why they are doing this, but also what you can learn and change on your side of the relationship.",
    sections: [
      ["The relationship has changed", "The parent-child structure that worked at age twelve does not work the same way at thirty-two. Adult children need room to make choices, set boundaries, and build a life that may not match a father's expectations. Difficulty accepting that shift can create friction even when love is strong."],
      ["Advice can feel like control", "Fathers often show care by solving problems. An adult child may hear repeated advice as criticism, distrust, or an attempt to manage the outcome. Asking permission before advising changes the tone from command to collaboration."],
      ["Old hurts may still be active", "A father may feel that an event is long over while an adult child still connects it to a larger pattern. Repair is harder when the goal becomes proving that the past should no longer matter. Listening for the meaning of the experience is often more productive than debating details."],
      ["Emotional safety affects honesty", "If conversations quickly become defensive, sarcastic, loud, dismissive, or guilt-filled, distance can become a way to avoid another painful exchange. Emotional safety does not mean avoiding difficult truth. It means making truth possible without punishment."],
      ["Pressure for closeness can create more distance", "Frequent calls, repeated we need to talk messages, surprise visits, or recruiting relatives to intervene can feel overwhelming. A low-pressure message and respectful space may communicate care more effectively than persistence."],
      ["What a father can control", "You cannot control whether your adult child answers, forgives, visits, or reconnects. You can control how you listen, whether you own your part, how you handle boundaries, the tone of your contact, and whether your changes last longer than a few days."],
      ["What helps over time", "Think in small deposits: a calmer response, a clean apology, fewer lectures, a respected boundary, a kept promise, or a message that does not demand anything back. Those choices do not guarantee reconciliation, but they create a healthier foundation for whatever contact is possible."],
      ["Frequently asked: Should I confront the distance?", "A demanding confrontation can increase pressure. A calmer approach is to name what you notice, express care, and ask whether they are willing to tell you what would make communication feel better."],
      ["Frequently asked: Does giving space mean I am giving up?", "No. Respecting a boundary can be an active form of care. You can remain open to repair while refusing to chase or punish."],
    ],
    relatedLinks: [
      ["Take the 2-Minute Fatherhood Check-In", "/marlee-assessment"],
      ["Adult son relationship help", "/adult-son-relationship"],
      ["Adult daughter relationship help", "/adult-daughter-relationship"],
      ["Father-child estrangement help", "/father-child-estrangement"],
    ],
  },
  {
    path: "/father-child-estrangement",
    title: "Father-Child Estrangement Help | Fathers of Adult Children | Papa Life",
    description:
      "Practical support for fathers estranged from an adult son or daughter: boundaries, accountability, apology, low-pressure contact, and steady personal change.",
    eyebrow: "Estrangement Help",
    headline: "Estrangement hurts. Repair cannot be forced, but your next step can still be wise, honest, and loving.",
    intro: "When an adult son or daughter is not speaking to you, the silence can produce grief, anger, shame, urgency, and a strong desire to fix everything immediately. Papa Life helps fathers slow the process down, respect boundaries, take responsibility where it belongs, and become more prepared for healthy contact if an opening comes.",
    sections: [
      ["Respect the boundary that exists now", "If your adult child has clearly asked for no contact or limited contact, honor that request. Repeated calls, surprise visits, new phone numbers, or using other relatives to get around a boundary can make repair harder and may communicate that their no still does not count."],
      ["Separate grief from pressure", "Your pain is real, but your adult child cannot be required to relieve it on demand. Find places to process grief, prayer, regret, anger, and loneliness that do not turn every contact attempt into a request for reassurance."],
      ["Own your part without owning everything", "Accountability is not self-condemnation. It means identifying behaviors you can honestly take responsibility for while maintaining appropriate boundaries around accusations or conduct that are not yours to carry."],
      ["Make an apology clean", "A repair message is usually stronger when it is brief, specific, and free of bargaining. Name what you understand, express regret, describe what you are changing, and avoid requiring forgiveness, a meeting, or a reply as proof that the apology was accepted."],
      ["Do not make one letter carry the whole relationship", "A letter can communicate ownership and care, but it cannot compress years of history into one perfect message. Lasting repair, when it happens, usually depends on a pattern that can be experienced over time."],
      ["Prepare for contact before contact happens", "If your adult child reaches out, decide in advance how you want to respond. Practice listening without defending, asking before advising, staying calm around disagreement, and ending a conversation respectfully if either person becomes overwhelmed."],
      ["Measure progress by your own integrity", "Reconciliation is a shared outcome and cannot be guaranteed. Your personal progress can still be measured: Are you more patient, accountable, consistent, and better able to respect boundaries and speak truth without punishment?"],
      ["Use faith without weaponizing it", "Scripture, prayer, and faith can strengthen a father's character and endurance. They should not be used to pressure an adult child into contact, obedience, or forgiveness on a timetable. Apply the spiritual work to yourself first."],
      ["Frequently asked: How long does estrangement last?", "There is no reliable timetable. Some relationships reopen quickly, some take years, and some remain limited or estranged. Focus on respectful boundaries and the changes you can sustain rather than predicting a date."],
      ["Frequently asked: Should I keep sending messages during no contact?", "If your adult child has clearly requested no contact, respect that boundary unless there is a genuine emergency or another agreed exception. If the boundary is unclear, one calm message asking what contact is welcome can reduce guessing."],
    ],
    relatedLinks: [
      ["Take the 2-Minute Fatherhood Check-In", "/marlee-assessment"],
      ["Learn the PAPA Framework", "/papa-framework"],
      ["Why adult children pull away", "/why-adult-children-pull-away"],
      ["Book a conversation", "/booking"],
    ],
  },
  {
    path: "/about-brian-keith-hill",
    title: "Brian Keith Hill | Founder of Boss Mobility and Papa Life",
    description:
      "Meet Brian Keith Hill, founder of Boss Mobility and Papa Life, a Scripture-centered coaching movement serving fathers of adult children.",
    keywords: "Brian Keith Hill, Boss Mobility, Papa Life Coach, Papa Life founder, fatherhood coach",
    eyebrow: "Founder of Boss Mobility and Papa Life",
    headline: "Brian Keith Hill",
    intro: "Brian Keith Hill is the founder of Boss Mobility and Papa Life, a Scripture-centered fatherhood coaching movement helping fathers of adult children become safer, more present, and better prepared for healthy reconnection.",
    sections: [
      ["More than a decade of service", "For more than ten years, Brian has worked through Boss Mobility as a coach, teacher, mentor, and community builder. Papa Life is the focused expression of that work for fathers facing distance, silence, tension, or unresolved hurt with adult children."],
      ["One clear family of brands", "Brian Keith Hill is the founder and public voice. Boss Mobility is the established company and organizational home. Papa Life is its specialized fatherhood movement and community. Papa Life AI is a technology-assisted extension of Brian's teaching, not a replacement for human care."],
      ["Why the work is personal", "Brian's own fatherhood story, nearly twenty years of silence with his oldest daughter, and eventual reconciliation shape the practical, honest way Papa Life supports fathers."],
      ["What he brings", "Scripture-centered coaching, clear language, responsible technology, and the PAPA Framework turn good intentions into daily practice without promising or forcing reconciliation."],
    ],
    jsonLd: [
      { "@context": "https://schema.org", "@type": "Person", name: "Brian Keith Hill", jobTitle: "Founder of Boss Mobility and Papa Life; Fatherhood Coach", url: "https://papalifecoach.com/about-brian-keith-hill", image: "https://papalifecoach.com/images/brian-keith-hill.png", worksFor: { "@type": "Organization", name: "Boss Mobility", alternateName: "Papa Life Coach" }, sameAs: ["https://www.linkedin.com/in/brian-hill-bossmobility", "https://briankeithhill.com"] },
      { "@context": "https://schema.org", "@type": "Organization", name: "Papa Life Coach", alternateName: ["Boss Mobility", "Papa Life Coach", "Papa Life"], url: "https://papalifecoach.com", founder: { "@type": "Person", name: "Brian Keith Hill", url: "https://papalifecoach.com/about-brian-keith-hill" } },
    ],
  },
  {
    path: "/courses",
    title: "Papa Life Courses | Papa Life Coach",
    description:
      "Programs built for fathers navigating relationships with adult children. Preview Papa Life courses and sign in to watch lessons.",
    eyebrow: "Courses",
    headline: "Papa Life course catalog",
    intro: "Programs built for fathers navigating relationships with adult children. Members can sign in to watch lessons and track progress.",
    sections: [
      ["Course previews", "Papa Life courses support fathers with practical lessons organized around the PAPA Framework."],
      ["Member access", "Sign in to the member portal to watch lesson videos and track progress."],
    ],
  },
  {
    path: "/resources",
    title: "Papa Life Resources | Papa Life Coach",
    description: "Free and member resources for fathers rebuilding connection with adult children through Papa Life.",
    eyebrow: "Resources",
    headline: "Find tools for reflection, repair, and relationship growth.",
    intro:
      "Papa Life resources include the free relationship assessment, the first workshop lesson, AI coaching, course previews, books, podcast material, and Tuesday Live support.",
    sections: [
      ["Free starting points", "Begin with the assessment, Papa Life AI Coach, and the free workshop for fathers of adult children."],
      ["Member path", "Members continue into guided lessons, reflection tools, and support organized around the PAPA Framework."],
    ],
  },
  {
    path: "/membership",
    title: "Papa Life Membership | Papa Life Coach",
    description: "Papa Life membership gives fathers structure, lessons, reflection tools, and support for rebuilding adult-child relationships.",
    eyebrow: "Membership",
    headline: "Build consistency instead of relying on one emotional moment.",
    intro: "Membership helps fathers keep practicing Presence, Authority, Purpose, and Alignment through guided lessons and reflection tools.",
    sections: [
      ["Course structure", "Work through practical lessons built for fathers navigating relationships with adult children."],
      ["Ongoing support", "Use AI coaching, resources, and community-oriented support to stay steady."],
    ],
  },
  {
    path: "/books",
    title: "Papa Life Books | Papa Life Coach",
    description: "Books and written resources from Brian Keith Hill for fathers navigating distance with adult children.",
    eyebrow: "Books",
    headline: "Written guidance for the fatherhood season no one prepared you for.",
    intro: "Brian Keith Hill's work speaks to fathers carrying silence, shame, hope, and the desire to rebuild trust with adult children.",
    sections: [
      ["Core message", "As long as both of you are alive, repair is still possible one honest step at a time."],
      ["What to do next", "Pair the written material with the free assessment and Papa Life course path for steady action."],
    ],
  },
  {
    path: "/podcast",
    title: "Papa Life Podcast | Papa Life Coach",
    description: "Podcast resources for fathers learning to reconnect with adult children through humility, presence, and practical action.",
    eyebrow: "Podcast",
    headline: "Listen for language, perspective, and next steps.",
    intro: "Papa Life podcast material supports fathers who want a calmer, wiser way to handle distance, silence, and difficult conversations.",
    sections: [
      ["For strained relationships", "Episodes focus on adult-child distance, fatherhood identity, repair, faith, and emotional maturity."],
      ["Keep moving", "Use the podcast alongside the assessment, workshop, and membership lessons."],
    ],
  },
  {
    path: "/contact",
    title: "Contact Papa Life Coach",
    description: "Contact Brian Keith Hill and Papa Life Coach about Papa Life, fatherhood coaching, and support.",
    eyebrow: "Contact",
    headline: "Reach out when you are ready for support.",
    intro: "Papa Life Coach supports fathers, families, and leaders who want clearer next steps and stronger relationships.",
    sections: [
      ["Start here", "If you are a father trying to reconnect with an adult child, the free assessment is the best first step."],
      ["For broader support", "Use the AI Coach or membership path to get oriented around resources and next actions."],
    ],
  },
  {
    path: "/marlee-assessment",
    title: "2-Minute Fatherhood Check-In | Papa Life",
    description:
      "Where Are You With Your Adult Child? Take the 2-Minute Check-In and identify a practical place to begin rebuilding connection.",
    eyebrow: "2-Minute Fatherhood Check-In",
    headline: "Where Are You With Your Adult Child?",
    intro: "Take the 2-Minute Check-In to notice where things stand today and choose an honest, practical next step.",
    sections: [
      ["A place to begin", "Notice how communication feels, where trust may need rebuilding, and what you can begin changing first."],
      ["A practical next step", "Use what you notice as a starting point for reflection, a Papa Life conversation, or one small action."],
    ],
  },
  {
    path: "/papa-journey",
    title: "Papa Journey | Papa Life Coach",
    description: "A guided Papa Life journey for fathers rebuilding connection with adult children.",
    eyebrow: "Papa Journey",
    headline: "Move from awareness into a guided fatherhood path.",
    intro: "The Papa Journey helps fathers work through relationship distance with structure, reflection, coaching, and next steps.",
    sections: [
      ["PAPA pillars", "Presence, Authority, Purpose, and Alignment organize the path."],
      ["Continue steadily", "Use the journey to build consistency and repair-oriented habits over time."],
    ],
  },
  {
    path: "/papa-intro",
    title: "Papa Life Intro Video",
    description: "Introductory video for the Papa Life fatherhood path.",
    eyebrow: "Intro Video",
    headline: "Start with the heart of Papa Life.",
    intro: "The intro video explains the Papa Life path for fathers of adult children.",
    sections: [
      ["Watch first", "Begin here to understand the mission, message, and next step."],
      ["Continue", "Move into the free workshop and Papa Life assessment for practical next steps."],
    ],
  },
  {
    path: "/booking",
    title: "Booking | Papa Life Coach",
    description: "Booking page for Papa Life Coach.",
    eyebrow: "Booking",
    headline: "Book time with Papa Life Coach.",
    intro: "Use this page to move from interest into a scheduled conversation or next step.",
    sections: [
      ["Next step", "Choose an available path for booking or follow-up."],
      ["Prepare", "Start with the assessment if you are looking for fatherhood relationship support."],
    ],
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Papa Life Coach",
    description: "How Papa Life collects, uses, and protects information submitted through papalifecoach.com.",
    eyebrow: "Privacy Policy",
    headline: "Privacy Policy",
    intro:
      "Papa Life is a fatherhood coaching service owned and operated by Brian Keith Hill. This policy explains what information is collected on papalifecoach.com, how it is used, and how visitors can control it.",
    sections: [
      ["Information use", "Information may be used to respond to requests, send coaching resources and reminders, process membership payments, improve services, and follow the law."],
      ["SMS consent", "Phone numbers and SMS consent are never sold or shared with third parties for their own marketing."],
    ],
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | Papa Life Coach",
    description: "How Papa Life collects, uses, and protects information submitted through papalifecoach.com.",
    eyebrow: "Privacy Policy",
    headline: "Privacy Policy",
    intro:
      "Papa Life is a fatherhood coaching service owned and operated by Brian Keith Hill. This policy explains what information is collected on papalifecoach.com, how it is used, and how visitors can control it.",
    sections: [
      ["Information use", "Information may be used to respond to requests, send coaching resources and reminders, process membership payments, improve services, and follow the law."],
      ["SMS consent", "Phone numbers and SMS consent are never sold or shared with third parties for their own marketing."],
    ],
  },
  {
    path: "/terms",
    title: "Terms of Service | Papa Life Coach",
    description: "Terms for using Papa Life, papalifecoach.com, ORACLE, courses, and membership.",
    eyebrow: "Terms of Service",
    headline: "Terms of Service",
    intro:
      "By using papalifecoach.com, the ORACLE AI coach, Papa Life courses, or the $4.99/month membership, visitors agree to these terms.",
    sections: [
      ["Coaching service", "Papa Life is a coaching and educational service, not therapy, counseling, or licensed mental health care."],
      ["Membership", "Papa Life membership costs $4.99 per month with no free trial and bills monthly until canceled."],
    ],
  },
  {
    path: "/terms-of-service",
    title: "Terms of Service | Papa Life Coach",
    description: "Terms for using Papa Life, papalifecoach.com, ORACLE, courses, and membership.",
    eyebrow: "Terms of Service",
    headline: "Terms of Service",
    intro:
      "By using papalifecoach.com, the ORACLE AI coach, Papa Life courses, or the $4.99/month membership, visitors agree to these terms.",
    sections: [
      ["Coaching service", "Papa Life is a coaching and educational service, not therapy, counseling, or licensed mental health care."],
      ["Membership", "Papa Life membership costs $4.99 per month with no free trial and bills monthly until canceled."],
    ],
  },
];

const defaultLinks = [
  ["Papa Life home", "/"], ["2-Minute Fatherhood Check-In", "/relationship-assessment"],
  ["The PAPA Framework", "/papa-framework"], ["Course catalog", "/courses"],
  ["Papa Life membership", "/membership"], ["Book a conversation", "/booking"],
  ["All Papa Life resources", "/site-directory"],
];
for (const page of pages) {
  const extra = enrichment[page.path];
  if (extra) {
    if (extra.title) page.title = extra.title;
    if (extra.description) page.description = extra.description;
    page.sections.push(...(extra.sections || []));
    if (extra.relatedLinks) page.relatedLinks = extra.relatedLinks;
  }
  if (!page.relatedLinks?.length) page.relatedLinks = defaultLinks.filter(([, href]) => href !== page.path);
  if (page.path === "/papa-framework") page.title = "The PAPA Framework for Fathers of Adult Children | Papa Life";
  if (page.path === "/relationship-assessment") page.title = "2-Minute Fatherhood Check-In | Papa Life";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === '"') return "&quot;";
    return "&#39;";
  });
}

function bodyHtml(page) {
  const related = page.relatedLinks?.length
    ? `<section style="margin-top: 42px; padding: 24px; border: 1px solid #3f3f46; border-radius: 18px; background: #111113;">
        <h2>Continue from here</h2>
        <ul style="line-height: 1.9; padding-left: 22px;">${page.relatedLinks
          .map(([label, href]) => `<li><a href="${escapeHtml(href)}" style="color:#f6c74a; font-weight:700;">${escapeHtml(label)}</a></li>`)
          .join("")}</ul>
      </section>`
    : "";
  return `
    <main id="server-prerender" style="font-family: Inter, Arial, sans-serif; background: #050505; color: #f8fafc; min-height: 100vh; padding: 64px 20px;">
      <article style="max-width: 920px; margin: 0 auto;">
        <p style="color: #f6c74a; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;">${escapeHtml(page.eyebrow)}</p>
        <h1 style="font-size: clamp(2.25rem, 6vw, 4.75rem); line-height: 1.02; margin: 18px 0;">${escapeHtml(page.headline)}</h1>
        <p style="font-size: 1.2rem; line-height: 1.7; color: #d4d4d8; max-width: 800px;">${escapeHtml(page.intro)}</p>
        <div style="display: grid; gap: 28px; margin-top: 42px;">
          ${page.sections
            .map(([heading, body]) => `<section><h2>${escapeHtml(heading)}</h2><p style="line-height:1.8;color:#d4d4d8;">${escapeHtml(body)}</p></section>`)
            .join("")}
        </div>
        ${related}
      </article>
    </main>`;
}

function render(page) {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>[ \t]*/i, `<title>${escapeHtml(page.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(page.description)}" />`
    )
    .replace('<div id="root"></div>', `<div id="root">${bodyHtml(page)}</div>`);

  html = html.replace(/<link\s+rel="canonical"[^>]*>/gi, "");
  const canonical = `<link rel="canonical" href="https://papalifecoach.com${({ "/privacy": "/privacy-policy", "/terms": "/terms-of-service" }[page.path] || page.path)}" />`;
  html = html.replace("</head>", `    ${canonical}\n  </head>`);
  if (page.keywords) html = html.replace("</head>", `    <meta name="keywords" content="${escapeHtml(page.keywords)}" />\n  </head>`);
  if (page.jsonLd) {
    const scripts = page.jsonLd.map((schema) => `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`).join("\n    ");
    html = html.replace("</head>", `    ${scripts}\n  </head>`);
  }
  return html;
}

for (const page of pages) {
  const html = render(page);
  if (page.path === "/") {
    fs.writeFileSync(templatePath, html);
    continue;
  }

  const routeDir = path.join(publicDir, page.path.replace(/^\//, ""));
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, "index.html"), html);
}

console.log(`Generated ${pages.length} static SEO pages in ${publicDir}`);
